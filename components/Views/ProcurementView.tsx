import React, { useState, useMemo } from 'react';
import { Supplier, AIAction, AITargetType } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { ShoppingBag, MessageSquare, AlertTriangle, CalendarClock, Phone, Trash2, Truck, FileText, Check, Circle, Sparkles, Loader2, Users, FileDown } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { exportPurchases } from '../../services/excelService';
import { validateAIRun } from '../../utils/aiValidation';

export const ProcurementView: React.FC = () => {
  const { 
    suppliers, setSuppliers, 
    purchaseInvoices, setPurchaseInvoices,
    procurementRun, generateProcurementForecast,
    settings, inventory
  } = useRestaurantStore();
  const { showModal } = useModal();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'order' | 'invoices' | 'suppliers'>('order');
  const [isForecasting, setIsForecasting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const activeSuppliers = useMemo(() => suppliers.filter(s => !s.isDeleted), [suppliers]);
  
  const handleGenerateForecast = async () => {
      setIsForecasting(true);
      setValidationErrors([]);
      try {
          await generateProcurementForecast();
          const newRun = useRestaurantStore.getState().procurementRun;
          if(newRun) {
              const { ok, errors } = validateAIRun(newRun);
              if (!ok) {
                  setValidationErrors(errors);
                  showToast('پاسخ هوش مصنوعی برای لیست خرید معتبر نیست.', 'error');
              }
          }
          showToast('لیست خرید هوشمند با موفقیت تولید شد.');
      } catch (e) {
          showToast('خطا در تولید لیست خرید.', 'error');
      } finally {
          setIsForecasting(false);
      }
  };

  const normalizePhoneNumberForWhatsApp = (phone: string): string => {
      let cleaned = phone.replace(/[-\s()]/g, ''); // remove dashes, spaces, parentheses
      if (cleaned.startsWith('+98')) {
          return cleaned.substring(1); // remove + -> 98...
      }
      if (cleaned.startsWith('09')) {
          return '98' + cleaned.substring(1); // 09... -> 989...
      }
      return cleaned; // assume it's already in a usable format
  };

  const createOrderMessage = (supplierName: string, items: AIAction[]): string => {
      const itemList = items.map(i => `- ${i.targetName}: ${i.recommendedValue} ${i.unit}`).join('\n');
      const restaurantName = settings.restaurantName || 'رستوران';
      const date = new Date().toLocaleDateString('fa-IR');
      return `سلام ${supplierName} عزیز،\n\nسفارش خرید برای ${restaurantName} - تاریخ: ${date}\n\nلطفا اقلام زیر را آماده و ارسال فرمایید:\n${itemList}\n\nباتشکر`;
  };

  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supCat, setSupCat] = useState('');

  const addSupplier = () => {
      if(!supName || !supPhone) return;
      setSuppliers(prev => [...prev, { id: crypto.randomUUID(), name: supName, phoneNumber: supPhone, category: supCat || 'General', isDeleted: false }]);
      setSupName(''); setSupPhone(''); setSupCat('');
      showToast('تامین کننده جدید اضافه شد.');
  };

  const handleDeleteSupplier = (id: string) => {
    showModal('حذف تامین کننده', 'آیا از حذف این تامین‌کننده اطمینان دارید؟', () => {
        setSuppliers(prev => prev.map(s => s.id === id ? { ...s, isDeleted: true } : s));
        showToast('تامین کننده با موفقیت حذف شد.', 'error');
    });
  };
  
  const toggleInvoiceStatus = (id: string) => {
      setPurchaseInvoices(prev => prev.map(inv => 
         inv.id === id ? { ...inv, status: inv.status === 'paid' ? 'unpaid' : 'paid' } : inv
      ));
      showToast('وضعیت فاکتور تغییر کرد.');
  };

  const groupedBuyActions = useMemo(() => {
    if (!procurementRun || validationErrors.length > 0) return { bySupplier: new Map(), noSupplier: [] };
    
    const bySupplier = new Map<string, AIAction[]>();
    const noSupplier: AIAction[] = [];

    procurementRun.actions
        .filter(a => a.actionType === 'BUY' && a.targetType === 'INGREDIENT')
        .forEach(action => {
            if (action.supplierId && suppliers.find(s => s.id === action.supplierId)) {
                if (!bySupplier.has(action.supplierId)) {
                    bySupplier.set(action.supplierId, []);
                }
                bySupplier.get(action.supplierId)!.push(action);
            } else {
                noSupplier.push(action);
            }
        });
        
    return { bySupplier, noSupplier };
  }, [procurementRun, suppliers, validationErrors]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 pt-24 pb-32 md:pb-8 md:pt-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-extrabold text-slate-800">تدارکات هوشمند</h2>
           <p className="text-slate-500 text-sm mt-1">پیش‌بینی مصرف و مدیریت سفارشات تامین‌کنندگان</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
           <button onClick={() => setActiveTab('order')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'order' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>لیست خرید هوشمند</button>
           <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'invoices' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>فاکتورهای خرید</button>
           <button onClick={() => setActiveTab('suppliers')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>تامین‌کنندگان</button>
        </div>
      </div>

      {activeTab === 'order' && (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-indigo-500"/>
                          پیش‌نویس لیست خرید
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">هوش مصنوعی با تحلیل الگوی فروش، لیست خرید بهینه را برای شما آماده می‌کند.</p>
                  </div>
                  <button onClick={handleGenerateForecast} disabled={isForecasting} className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 whitespace-nowrap self-end md:self-center hover:bg-slate-800 active:scale-95 transition-colors disabled:opacity-50">
                      {isForecasting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                      {isForecasting ? 'در حال تحلیل...' : 'تولید لیست خرید هوشمند'}
                  </button>
              </div>

              {!procurementRun && !isForecasting && (
                  <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-200">
                      <ShoppingBag className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                      <h3 className="text-lg font-bold text-slate-600">آماده تولید لیست خرید</h3>
                      <p className="text-slate-400">برای شروع، روی دکمه "تولید لیست خرید هوشمند" کلیک کنید.</p>
                  </div>
              )}
              
              {validationErrors.length > 0 && (
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-rose-800">
                      <h4 className="font-bold">خطا در اعتبارسنجی پاسخ AI</h4>
                      <ul className="list-disc list-inside text-sm mt-2">
                          {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                  </div>
              )}

              {procurementRun && validationErrors.length === 0 && (
                  <>
                  {Array.from(groupedBuyActions.bySupplier.entries()).map(([supplierId, items]) => {
                      const supplier = activeSuppliers.find(s => s.id === supplierId);
                      if (!supplier) return null;
                      return (
                      <div key={supplierId} className="bg-white rounded-[24px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                                      <Truck className="w-6 h-6" />
                                  </div>
                                  <div>
                                      <h3 className="text-lg font-extrabold text-slate-800">{supplier.name}</h3>
                                      <span className="text-xs text-slate-400 mr-2">{supplier?.phoneNumber}</span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <button 
                                      onClick={() => {
                                          const message = createOrderMessage(supplier.name, items);
                                          const whatsappNumber = normalizePhoneNumberForWhatsApp(supplier.phoneNumber);
                                          const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                                          window.open(url, '_blank');
                                      }}
                                      className="flex items-center justify-center gap-2 h-12 w-12 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                                      title="ارسال با واتساپ"
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.433-9.89-9.889-9.89-5.458 0-9.891 4.434-9.891 9.891 0 2.08.6 3.96 1.588 5.63l-.96 3.425 3.413-1.008z"/></svg>
                                  </button>
                                  <button 
                                      onClick={() => {
                                          const message = createOrderMessage(supplier.name, items);
                                          window.open(`sms:${supplier.phoneNumber}?body=${encodeURIComponent(message)}`, '_blank');
                                      }}
                                      className="flex items-center justify-center gap-2 h-12 w-12 bg-sky-500 text-white rounded-2xl font-bold shadow-lg shadow-sky-200 hover:bg-sky-600 transition-all active:scale-95"
                                      title="ارسال با SMS"
                                  >
                                      <MessageSquare className="w-5 h-5" />
                                  </button>
                                  <a 
                                      href={`tel:${supplier.phoneNumber}`}
                                      className="flex items-center justify-center gap-2 h-12 w-12 bg-slate-700 text-white rounded-2xl font-bold shadow-lg shadow-slate-300 hover:bg-slate-800 transition-all active:scale-95"
                                      title="تماس تلفنی"
                                  >
                                      <Phone className="w-5 h-5" />
                                  </a>
                              </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {items.map(item => {
                                  const inventoryItem = inventory.find(i => i.id === item.targetId);
                                  return (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <span className="font-bold text-slate-700 text-sm">{item.targetName}</span>
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs text-rose-500 font-bold">موجودی: {inventoryItem?.currentStock || 0}</span>
                                          <span className="text-xs text-slate-400">→</span>
                                          <span className="text-xs text-emerald-600 font-bold">سفارش: {item.recommendedValue} {item.unit}</span>
                                      </div>
                                  </div>
                              )})}
                          </div>
                      </div>
                  )})}

                  {groupedBuyActions.noSupplier.length > 0 && (
                      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-rose-100">
                          <div className="flex items-center gap-3 mb-4 text-rose-600">
                              <AlertTriangle className="w-6 h-6" />
                              <h3 className="font-bold">اقلام نیازمند خرید (بدون تامین‌کننده مشخص)</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             {groupedBuyActions.noSupplier.map(item => {
                                 const inventoryItem = inventory.find(i => i.id === item.targetId);
                                 return (
                                 <div key={item.id} className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex justify-between">
                                     <span className="font-bold text-rose-900 text-sm">{item.targetName}</span>
                                     <span className="text-xs font-bold text-rose-700">{inventoryItem?.currentStock || 0} {item.unit}</span>
                                 </div>
                             )})}
                          </div>
                          <p className="text-xs text-slate-400 mt-4">برای استفاده از سفارش خودکار، لطفا در بخش انبار برای این کالاها تامین‌کننده انتخاب کنید.</p>
                      </div>
                  )}
                  </>
              )}
          </div>
      )}

      {activeTab === 'invoices' && (
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800">حساب‌های پرداختنی (A/P)</h3>
                <button
                    onClick={() => exportPurchases(purchaseInvoices)}
                    className="bg-emerald-600 text-white flex gap-2 items-center px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                >
                    <FileDown className="w-4 h-4" />
                    خروجی اکسل
                </button>
              </div>
              <div className="space-y-3">
                  {purchaseInvoices.slice().reverse().map(inv => (
                      <div key={inv.id} className={`p-4 rounded-2xl border flex items-center justify-between ${inv.status === 'paid' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                          <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                  <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                  <p className="font-bold text-slate-800">فاکتور {new Date(inv.invoiceDate).toLocaleDateString('fa-IR')}</p>
                                  <p className="text-xs text-slate-400 font-bold">{inv.items.length} قلم کالا</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                              <span className="font-mono font-bold text-indigo-700">{inv.totalAmount.toLocaleString()} تومان</span>
                              <button 
                                onClick={() => toggleInvoiceStatus(inv.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                                    inv.status === 'paid' 
                                    ? 'bg-emerald-200 text-emerald-800 hover:bg-emerald-300' 
                                    : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                }`}
                              >
                                  {inv.status === 'paid' ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                  {inv.status === 'paid' ? 'پرداخت شده' : 'پرداخت نشده'}
                              </button>
                          </div>
                      </div>
                  ))}
                  {purchaseInvoices.length === 0 && <p className="text-center py-10 text-slate-400">فاکتور خریدی ثبت نشده است.</p>}
              </div>
          </div>
      )}

      {activeTab === 'suppliers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[32px] shadow-lg border border-slate-100 h-fit">
                  <h3 className="font-bold text-lg mb-4 text-slate-800">افزودن تامین‌کننده</h3>
                  <div className="space-y-3">
                      <input type="text" placeholder="نام (مثلا: قصابی نمونه)" value={supName} onChange={e=>setSupName(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200" />
                      <input type="text" placeholder="شماره موبایل" value={supPhone} onChange={e=>setSupPhone(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200" />
                      <input type="text" placeholder="دسته‌بندی (مثلا: گوشت)" value={supCat} onChange={e=>setSupCat(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200" />
                      <button onClick={addSupplier} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold mt-2">ذخیره</button>
                  </div>
              </div>
              {activeSuppliers.length === 0 ? (
                  <div className="lg:col-span-2">
                    <EmptyState
                        icon={<Users className="w-12 h-12"/>}
                        title="تامین‌کننده‌ای ثبت نشده"
                        description="با افزودن تامین‌کنندگان خود، فرآیند سفارش‌گذاری و مدیریت فاکتورها را ساده‌تر کنید."
                    />
                  </div>
              ) : (
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeSuppliers.map(sup => (
                        <div key={sup.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-100 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-800">{sup.name}</h4>
                                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded mt-1 inline-block">{sup.category}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleDeleteSupplier(sup.id)}
                                      className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full flex items-center justify-center transition-colors"
                                      title="حذف تامین‌کننده"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 text-slate-500">
                                <Phone className="w-4 h-4" />
                                <span className="text-sm font-mono font-bold">{sup.phoneNumber}</span>
                            </div>
                        </div>
                    ))}
                </div>
              )}
          </div>
      )}

    </div>
  );
};