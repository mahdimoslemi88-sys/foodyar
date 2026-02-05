import React, { useState, useEffect, useMemo } from 'react';
import { View, AIAction, AIInsight } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { generateDailyBrief } from '../../utils/dailyBrief';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, TrendingUp, ChevronLeft, AlertTriangle, ClipboardList, Sparkles, Loader2, Star, Puzzle, Tractor, Trash2, RefreshCw, BarChart, ShoppingBasket, Award, TrendingDown, Lightbulb, Wrench } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { validateAIRun } from '../../utils/aiValidation';


interface DashboardProps {
  onNavigate: (view: View, entityId?: string) => void;
}

const ActionIcon: React.FC<{ type: AIAction['actionType'] }> = ({ type }) => {
    switch(type) {
        case 'PRICE_CHANGE': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
        default: return <Wrench className="w-4 h-4 text-slate-500" />;
    }
}

export const DashboardView: React.FC<DashboardProps> = ({ onNavigate }) => {
  const sales = useRestaurantStore(state => state.sales);
  const menu = useRestaurantStore(state => state.menu);
  const inventory = useRestaurantStore(state => state.inventory);
  const expenses = useRestaurantStore(state => state.expenses);
  const wasteRecords = useRestaurantStore(state => state.wasteRecords);
  const prepTasks = useRestaurantStore(state => state.prepTasks);
  const menuAnalysisRun = useRestaurantStore(state => state.menuAnalysisRun);
  const generateMenuAnalysis = useRestaurantStore(state => state.generateMenuAnalysis);
  const clearMenuAnalysis = useRestaurantStore(state => state.clearMenuAnalysis);

  const { showToast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const brief = useMemo(() => generateDailyBrief({ sales, menu, inventory, wasteRecords, prepTasks }), [sales, menu, inventory, wasteRecords, prepTasks]);
  
  const chartData = useMemo(() => sales.slice(-20).map((sale) => ({
    amt: sale.totalAmount,
    profit: sale.totalAmount - sale.totalCost
  })), [sales]);

  const itemsNeedingRecipe = useMemo(() => menu.filter(item => !item.recipe || item.recipe.length === 0), [menu]);

  const handleRunAnalysis = async () => {
      setIsAnalyzing(true);
      setValidationErrors([]);
      try {
          await generateMenuAnalysis();
          const newRun = useRestaurantStore.getState().menuAnalysisRun;
          if (newRun) {
              const { ok, errors } = validateAIRun(newRun);
              if (!ok) {
                  setValidationErrors(errors);
                  showToast('پاسخ هوش مصنوعی معتبر نیست.', 'error');
              }
          }
      } catch (e: any) {
          if (e.message === 'RATE_LIMIT_ERROR') {
              showToast('شما به تازگی این تحلیل را اجرا کرده‌اید. لطفاً کمی بعد دوباره تلاش کنید.', 'warning');
          } else if (e.message === 'AUTH_ERROR') {
              showToast('خطای احراز هویت. لطفا کلید API خود را در بخش هوش مصنوعی بررسی کنید.', 'error');
          } else {
              showToast('خطا در تحلیل هوشمند. اتصال اینترنت را بررسی کنید.', 'error');
          }
          console.error("Failed to run analysis", e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  if (sales.length === 0 && menu.length === 0 && expenses.length === 0) {
      return (
          <div className="h-full flex items-center justify-center p-8">
              <EmptyState
                  icon={<TrendingUp className="w-12 h-12" />}
                  title="هنوز داده‌ای برای نمایش وجود ندارد"
                  description="با ثبت اولین فاکتور در بخش صندوق، داده‌های داشبورد نمایش داده خواهند شد."
                  action={{ label: 'رفتن به صندوق', onClick: () => onNavigate('pos') }}
              />
          </div>
      );
  }
  
  const lowMarginReco = brief.recommendedActions.find(a => a.id === 'action-low-margin');
  const topProfitReco = brief.recommendedActions.find(a => a.id === 'action-top-profit');
  const highWasteReco = brief.recommendedActions.find(a => a.id === 'action-high-waste');

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 pt-24 pb-32 md:pb-12 md:pt-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">داشبورد مدیریتی</h2>
          <p className="text-slate-400 font-bold text-sm">نگاهی کلی به عملکرد رستوران شما</p>
        </div>
        <button 
           onClick={() => onNavigate('reports')}
           className="group flex items-center gap-2 px-5 py-2.5 bg-white rounded-full shadow-sm hover:shadow-md transition-all border border-slate-100 active:scale-95"
        >
           <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">گزارشات کامل</span>
           <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <ChevronLeft className="w-3 h-3" />
           </div>
        </button>
      </div>

      {itemsNeedingRecipe.length > 0 && (
          <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                      <h3 className="font-extrabold text-amber-900 text-lg">نیازمند اقدام مدیر</h3>
                      <p className="text-amber-700 text-sm mt-1 max-w-lg">
                          <span className="font-bold">{itemsNeedingRecipe.length} آیتم جدید</span> به منو اضافه شده که فاقد دستور تهیه (Recipe) است. برای محاسبه بهای تمام شده و مدیریت انبار، لطفا فرمولاسیون آن‌ها را تکمیل کنید.
                      </p>
                  </div>
              </div>
              <button 
                onClick={() => onNavigate('menu')}
                className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 whitespace-nowrap self-end md:self-center hover:bg-slate-800 active:scale-95 transition-colors"
              >
                  <ClipboardList className="w-4 h-4" />
                  تکمیل فرمولاسیون
              </button>
          </div>
      )}
      
      {/* KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 flex items-center gap-2"><BarChart className="w-4 h-4 text-indigo-500" /> حاشیه سود ناخالص (۷ روز)</p>
                <p className="text-5xl font-black text-slate-800 my-3">{brief.grossMarginLast7Days.toFixed(0)}<span className="text-2xl text-slate-300">%</span></p>
              </div>
              <div>
                <p className={`text-xs font-bold ${lowMarginReco ? 'text-rose-600' : 'text-emerald-600'}`}>{lowMarginReco ? lowMarginReco.description : 'عملکرد سودآوری مطلوب است. هزینه‌ها به خوبی کنترل شده‌اند.'}</p>
                {lowMarginReco && <button onClick={() => onNavigate('menu')} className="text-xs font-bold text-white bg-slate-800 px-3 py-2 rounded-lg mt-3 w-full">بررسی منو</button>}
              </div>
          </div>
           <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> قهرمان سودآوری (۷ روز)</p>
                <p className="text-3xl font-black text-slate-800 my-3 truncate" title={brief.topProfitItemLast7Days?.item.name || '-'}>{brief.topProfitItemLast7Days?.item.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">{topProfitReco ? topProfitReco.description : 'برای شناسایی آیتم سودآور برتر، به داده‌های فروش بیشتری نیاز است.'}</p>
                {topProfitReco && <button onClick={() => onNavigate('menu', topProfitReco.evidence[0].value as string)} className="text-xs font-bold text-white bg-slate-800 px-3 py-2 rounded-lg mt-3 w-full">مشاهده آیتم</button>}
              </div>
          </div>
           <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-rose-500" /> ضایعات ثبت شده (۷ روز)</p>
                <p className="text-3xl font-black text-slate-800 my-3">{brief.wasteLossLast7Days.toLocaleString()}<span className="text-base text-slate-400 font-medium ml-1"> تومان</span></p>
              </div>
              <div>
                <p className={`text-xs font-bold ${highWasteReco ? 'text-rose-600' : 'text-emerald-600'}`}>{highWasteReco ? highWasteReco.description : 'میزان ضایعات در محدوده مطلوب قرار دارد.'}</p>
                {highWasteReco && <button onClick={() => onNavigate('inventory')} className="text-xs font-bold text-white bg-slate-800 px-3 py-2 rounded-lg mt-3 w-full">بررسی انبار</button>}
              </div>
          </div>
      </div>


      {/* AI Advisor Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-200">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6"/>
                  </div>
                  <div>
                      <h3 className="font-extrabold text-xl">تحلیل‌گر هوشمند منو</h3>
                      <p className="text-indigo-200 text-sm mt-1 max-w-lg">
                          هوش مصنوعی منو و فروش شما را تحلیل کرده و پیشنهاداتی برای افزایش سودآوری هر آیتم ارائه می‌دهد.
                      </p>
                  </div>
              </div>
              <button 
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="bg-white text-indigo-700 px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 whitespace-nowrap self-end md:self-center hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50"
              >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                  {isAnalyzing ? 'در حال تحلیل...' : 'شروع تحلیل هوشمند'}
              </button>
          </div>
          {menuAnalysisRun && (
            <div className="mt-6 bg-black/10 backdrop-blur-xl p-6 rounded-2xl animate-in fade-in duration-500">
                {validationErrors.length > 0 ? (
                    <div className="text-center text-rose-200">
                        <h4 className="font-bold text-white">خطای اعتبارسنجی</h4>
                        <p className="text-xs mt-2">پاسخ هوش مصنوعی با ساختار مورد انتظار مطابقت ندارد:</p>
                        <ul className="text-left text-xs mt-2 list-disc list-inside bg-black/20 p-2 rounded-md">
                            {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </div>
                ) : (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto custom-scrollbar">
                        {menuAnalysisRun.insights.map((insight) => (
                          <div key={insight.id} className="bg-white/10 p-4 rounded-xl flex items-start gap-3">
                              <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-lg shrink-0 text-indigo-200"><Lightbulb className="w-5 h-5"/></div>
                              <div>
                                 <p className="font-bold text-white text-sm">{insight.title}</p>
                                 <p className="text-xs text-indigo-200 mt-1">{insight.detail}</p>
                              </div>
                          </div>
                        ))}
                         {menuAnalysisRun.actions.map((action) => (
                          <div key={action.id} className="bg-white/10 p-4 rounded-xl flex items-start gap-3">
                              <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-lg shrink-0 text-indigo-200"><ActionIcon type={action.actionType}/></div>
                              <div>
                                 <p className="font-bold text-white text-sm">{action.targetName}</p>
                                 <p className="text-xs text-indigo-200 mt-1">{action.rationale}</p>
                                 {action.recommendedValue && <p className="text-xs text-amber-200 font-bold mt-1">مقدار پیشنهادی: {action.recommendedValue.toLocaleString()}</p>}
                              </div>
                          </div>
                        ))}
                    </div>
                    <button onClick={clearMenuAnalysis} className="text-xs text-indigo-300 hover:text-white font-bold mt-4 flex items-center gap-1"><RefreshCw className="w-3 h-3"/> تحلیل مجدد</button>
                    </>
                )}
            </div>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white rounded-[40px] p-8 shadow-sm border border-slate-50 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 text-lg">روند فروش (۲۰ فاکتور اخیر)</h3>
                <TrendingUp className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="w-full h-[300px] -ml-4" dir="ltr">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.05}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', fontFamily: 'Vazirmatn' }}
                          cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area type="monotone" dataKey="amt" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorAmt)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
            </div>
         </div>

         <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-50">
             <h3 className="font-bold text-slate-800 text-lg mb-8">محبوب‌ترین‌ها</h3>
             <div className="space-y-6">
                 {brief.topSellingItemsToday.slice(0, 4).map(({ item, quantity }, i) => (
                     <div key={i} className="flex items-center justify-between group">
                         <div className="flex items-center gap-4">
                             <span className="font-black text-slate-200 text-xl group-hover:text-indigo-500 transition-colors">0{i+1}</span>
                             <div>
                                 <p className="font-bold text-slate-800 text-sm">{item?.name}</p>
                                 <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item?.category}</p>
                             </div>
                         </div>
                         <span className="font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-full text-xs group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">{quantity}</span>
                     </div>
                 ))}
                 {brief.topSellingItemsToday.length === 0 && <p className="text-sm text-slate-300 font-bold">بدون داده</p>}
             </div>
         </div>
      </div>
    </div>
  );
};