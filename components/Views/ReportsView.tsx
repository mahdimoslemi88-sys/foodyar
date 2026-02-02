import React, { useState, useEffect } from 'react';
import { Expense, Shift } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, Plus, TrendingDown, DollarSign, Wallet, ArrowDownRight, Trash2, AlertOctagon, Banknote, CreditCard, Globe, ListChecks, FileDown } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { exportSales, exportExpenses } from '../../services/excelService';

export const ReportsView: React.FC = () => {
  const { 
    sales, menu, expenses, setExpenses, shifts, 
    wasteRecords, addAuditLog
  } = useRestaurantStore();
  const { showModal } = useModal();
  const { showToast } = useToast();
  
  const [viewMode, setViewMode] = useState<'financial' | 'expenses' | 'shifts'>('financial');
  
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expCategory, setExpCategory] = useState<Expense['category']>('other');

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Optimization: Memoize financial metrics to prevent expensive re-calculations on every render
  const totalRevenue = useMemo(() =>
    sales.filter(s => s.shiftId ? s.paymentMethod !== 'void' : true).reduce((acc, sale) => acc + sale.totalAmount, 0),
    [sales]
  );
  const totalCOGS = useMemo(() => sales.reduce((acc, sale) => acc + sale.totalCost, 0), [sales]);
  const totalWasteLoss = useMemo(() => wasteRecords.reduce((acc, w) => acc + w.costLoss, 0), [wasteRecords]);
  
  const grossProfit = useMemo(() => totalRevenue - totalCOGS, [totalRevenue, totalCOGS]);
  const totalOpEx = useMemo(() => expenses.reduce((acc, exp) => acc + exp.amount, 0), [expenses]);
  
  const netProfit = useMemo(() => grossProfit - totalOpEx - totalWasteLoss, [grossProfit, totalOpEx, totalWasteLoss]);

  const handleAddExpense = () => {
    if (!expTitle || expAmount <= 0) return;
    
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      title: expTitle,
      amount: expAmount,
      category: expCategory,
      date: Date.now()
    };
    
    setExpenses(prev => [newExpense, ...prev]);
    addAuditLog('CREATE', 'EXPENSE', `Created expense: ${newExpense.title} for ${newExpense.amount}`);
    setExpTitle('');
    setExpAmount(0);
    setExpCategory('other');
    showToast('هزینه با موفقیت ثبت شد.');
  };

  const handleDeleteExpense = (id: string) => {
    showModal('حذف هزینه', 'آیا از حذف این هزینه اطمینان دارید؟', () => {
        const expenseToDelete = expenses.find(e => e.id === id);
        if(expenseToDelete) addAuditLog('DELETE', 'EXPENSE', `Deleted expense: ${expenseToDelete.title}`);
        setExpenses(prev => prev.filter(e => e.id !== id));
        showToast('هزینه با موفقیت حذف شد.', 'error');
    });
  };

  const getCategoryLabel = (cat: string) => {
     const map: any = { rent: 'اجاره', salary: 'حقوق', utilities: 'قبوض', marketing: 'تبلیغات', maintenance: 'تعمیرات', other: 'سایر' };
     return map[cat] || cat;
  };
  
  // Optimization: Memoize chart data to prevent re-calculation on every render
  const expenseByCategory = useMemo(() => expenses.reduce((acc, exp) => {
    const categoryLabel = getCategoryLabel(exp.category);
    acc[categoryLabel] = (acc[categoryLabel] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>), [expenses]);

  const expenseChartData = useMemo(() =>
    Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })),
    [expenseByCategory]
  );

  const closedShifts = useMemo(() => shifts.filter(s => s.status === 'closed'), [shifts]);

  const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#eef2ff'];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 pt-24 pb-32 md:pb-8 md:pt-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-extrabold text-slate-800">هاب مالی و حسابداری</h2>
           <p className="text-slate-500 text-sm mt-1">کنترل داخلی، بستن حساب‌ها و گزارشات دقیق (P&L)</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
                <button
                onClick={() => exportSales(sales, menu)}
                className="bg-emerald-600 text-white flex gap-2 items-center px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                >
                <FileDown className="w-4 h-4" />
                خروجی اکسل فروش
                </button>
                <button
                onClick={() => exportExpenses(expenses)}
                className="bg-emerald-600 text-white flex gap-2 items-center px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                >
                <FileDown className="w-4 h-4" />
                خروجی اکسل هزینه‌ها
                </button>
            </div>
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                <button 
                    onClick={() => setViewMode('financial')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${viewMode === 'financial' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    صورت سود و زیان
                </button>
                <button 
                    onClick={() => setViewMode('shifts')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${viewMode === 'shifts' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    گزارش شیفت‌ها
                </button>
                <button 
                    onClick={() => setViewMode('expenses')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${viewMode === 'expenses' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    ثبت هزینه
                </button>
            </div>
        </div>
      </div>

      {viewMode === 'financial' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
           <div className="lg:col-span-3 bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
              <div className="bg-slate-900 p-6 text-white">
                 <h3 className="font-bold text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    صورت سود و زیان (P&L)
                 </h3>
                 <p className="text-slate-400 text-xs mt-1">خلاصه عملکرد مالی با کسر ضایعات و هزینه‌ها</p>
              </div>
              <div className="p-8 space-y-4">
                 <div className="flex justify-between items-end border-b border-dashed border-slate-100 pb-2">
                    <div>
                        <p className="text-slate-400 text-xs font-bold mb-1">درآمد کل فروش (Gross Revenue)</p>
                        <p className="text-2xl font-extrabold text-slate-800">{totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold">+</div>
                 </div>

                 <div className="flex justify-between items-end border-b border-dashed border-slate-100 pb-2">
                    <div>
                        <p className="text-slate-400 text-xs font-bold mb-1">بهای تمام شده کالای فروش رفته (COGS)</p>
                        <p className="text-xl font-extrabold text-rose-500">{totalCOGS.toLocaleString()}</p>
                    </div>
                    <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-xs font-bold">-</div>
                 </div>

                 <div className="flex justify-between items-end bg-slate-50 p-3 rounded-2xl">
                    <div>
                        <p className="text-slate-500 text-xs font-bold mb-1">سود ناخالص (Gross Profit)</p>
                        <p className="text-lg font-bold text-slate-700">{grossProfit.toLocaleString()}</p>
                    </div>
                    <div className="text-xs font-bold text-slate-400">Revenue - COGS</div>
                 </div>

                 <div className="flex justify-between items-end border-b border-dashed border-slate-100 pb-2">
                    <div>
                        <p className="text-slate-400 text-xs font-bold mb-1">هزینه‌های عملیاتی (OpEx)</p>
                        <p className="text-xl font-extrabold text-rose-500">{totalOpEx.toLocaleString()}</p>
                    </div>
                    <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-xs font-bold">-</div>
                 </div>
                 
                  <div className="flex justify-between items-end border-b border-dashed border-slate-100 pb-2">
                    <div>
                        <p className="text-slate-400 text-xs font-bold mb-1">ضایعات (Waste)</p>
                        <p className="text-xl font-extrabold text-rose-500">{totalWasteLoss.toLocaleString()}</p>
                    </div>
                    <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-xs font-bold">-</div>
                 </div>

                 <div className="p-6 border-t border-slate-100 flex items-center justify-end">
                    <span className="text-2xl font-black text-emerald-600">{netProfit.toLocaleString()} <span className="text-base font-normal">تومان</span></span>
                </div>
              </div>
           </div>
           
            {isMounted && (
            <div className="lg:col-span-2 bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 flex flex-col">
                <h3 className="font-bold text-lg mb-4 text-slate-800">ترکیب هزینه‌ها</h3>
                <div className="flex-1 w-full h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie data={expenseChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                        {expenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontFamily: 'Vazirmatn', borderRadius: '1rem' }} formatter={(value: number) => [value.toLocaleString(), 'مبلغ']} />
                    </PieChart>
                </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                    {expenseChartData.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className="font-bold text-slate-600">{entry.name}</span>
                            </div>
                            <span className="font-mono">{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
            )}
        </div>
      )}

    {viewMode === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 h-fit">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-lg flex items-center gap-2"><TrendingDown className="w-5 h-5 text-rose-500"/> ثبت هزینه جدید</h3>
                </div>
                <div className="p-6 space-y-3">
                    <input type="text" placeholder="عنوان هزینه (مثلا: خرید مواد شوینده)" value={expTitle} onChange={e=>setExpTitle(e.target.value)} className="w-full p-4 bg-slate-50 border-transparent focus:border-indigo-500 focus:ring-indigo-500 rounded-2xl font-bold"/>
                    <input type="number" placeholder="مبلغ (تومان)" value={expAmount || ''} onChange={e=>setExpAmount(Number(e.target.value))} className="w-full p-4 bg-slate-50 border-transparent focus:border-indigo-500 focus:ring-indigo-500 rounded-2xl font-bold"/>
                    <select value={expCategory} onChange={e=>setExpCategory(e.target.value as any)} className="w-full p-4 bg-slate-50 border-transparent focus:border-indigo-500 focus:ring-indigo-500 rounded-2xl font-bold">
                        <option value="other">سایر</option>
                        <option value="rent">اجاره</option>
                        <option value="salary">حقوق</option>
                        <option value="utilities">قبوض</option>
                        <option value="marketing">تبلیغات</option>
                        <option value="maintenance">تعمیرات</option>
                    </select>
                    <button onClick={handleAddExpense} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold mt-2 shadow-lg shadow-slate-200 hover:bg-slate-800 transition-colors">ثبت هزینه</button>
                </div>
            </div>
            <div className="lg:col-span-3 bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
                 <h3 className="font-bold text-lg mb-4 text-slate-800">تاریخچه هزینه‌ها</h3>
                 <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {expenses.length > 0 ? expenses.map(exp => (
                        <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <div>
                                <p className="font-bold text-sm text-slate-700">{exp.title}</p>
                                <p className="text-xs text-slate-400 font-bold">{getCategoryLabel(exp.category)} • {new Date(exp.date).toLocaleDateString('fa-IR')}</p>
                           </div>
                           <div className="flex items-center gap-3">
                               <span className="font-mono font-bold text-rose-600 text-sm">{exp.amount.toLocaleString()}</span>
                               <button onClick={() => handleDeleteExpense(exp.id)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                           </div>
                        </div>
                    )) : <p className="text-center text-slate-400 py-10">هزینه‌ای ثبت نشده است.</p>}
                 </div>
            </div>
        </div>
    )}

    {viewMode === 'shifts' && (
        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
             <h3 className="font-bold text-lg mb-4 text-slate-800">تاریخچه شیفت‌های بسته شده</h3>
             <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto custom-scrollbar">
                {closedShifts.length > 0 ? closedShifts.map(s => (
                    <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="flex justify-between items-center text-xs text-slate-400 font-bold mb-2">
                           <span>{new Date(s.startTime).toLocaleDateString('fa-IR')}</span>
                           <span>{new Date(s.startTime).toLocaleTimeString('fa-IR')} - {s.endTime ? new Date(s.endTime).toLocaleTimeString('fa-IR') : ''}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-2 text-center">
                           <div className="bg-white p-2 rounded-lg"><p className="text-[10px] font-bold text-slate-400">فروش کارتخوان</p><p className="font-bold text-sm text-indigo-700">{s.cardSales?.toLocaleString()}</p></div>
                           <div className="bg-white p-2 rounded-lg"><p className="text-[10px] font-bold text-slate-400">فروش نقد</p><p className="font-bold text-sm text-emerald-700">{s.expectedCashSales?.toLocaleString()}</p></div>
                           <div className={`p-2 rounded-lg ${s.discrepancy === 0 ? 'bg-white' : 'bg-rose-100'}`}><p className="text-[10px] font-bold text-slate-400">مغایرت</p><p className={`font-bold text-sm ${s.discrepancy === 0 ? 'text-slate-700' : 'text-rose-700'}`}>{s.discrepancy?.toLocaleString()}</p></div>
                       </div>
                    </div>
                )) : (
                    <p className="text-center text-slate-400 py-10">هیچ شیفت بسته‌ای برای نمایش وجود ندارد.</p>
                )}
             </div>
        </div>
    )}

    </div>
  );
};