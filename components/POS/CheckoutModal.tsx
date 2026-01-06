import React, { useState, useEffect, useRef, useMemo } from 'react';
import useReactToPrint from 'react-to-print';
import { MenuItem, PaymentMethod, SystemSettings, InsufficientItem, Customer, Sale } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  Minus, Plus, X, 
  CreditCard, Banknote, Loader2, Globe, XCircle, User, Receipt, AlertTriangle, Star, CheckCircle, Printer, Wallet
} from 'lucide-react';
import { validate } from '../../utils/validation';
import { ReceiptTemplate } from './ReceiptTemplate';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cart: {item: MenuItem, quantity: number}[];
    updateQuantity: (id: string, delta: number) => void;
    settings: SystemSettings;
}

const POINTS_TO_TOMAN_RATE = 1000; // 1 point = 1000 Toman

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cart, updateQuantity, settings }) => {
    const { menu, customers, checkStockForSale, addAuditLog, processTransaction } = useRestaurantStore();
    const { currentUser } = useAuth();
    const { showToast } = useToast();

    const [successfulSale, setSuccessfulSale] = useState<Sale | null>(null);
    const [shortageInfo, setShortageInfo] = useState<{ type: 'BLOCKED' | 'NEEDS_CONFIRMATION', items: InsufficientItem[] } | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
    const [customerPhoneNumber, setCustomerPhoneNumber] = useState('');
    const [discountValue, setDiscountValue] = useState(0);
    const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
    const [pointsToUse, setPointsToUse] = useState(0);
    const [useWallet, setUseWallet] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [identifiedCustomer, setIdentifiedCustomer] = useState<Customer | null>(null);

    const receiptRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        content: () => receiptRef.current,
    });

    useEffect(() => {
        if (customerPhoneNumber && (customerPhoneNumber.length === 11 && customerPhoneNumber.startsWith('09'))) {
            const foundCustomer = customers.find(c => c.phoneNumber === customerPhoneNumber);
            setIdentifiedCustomer(foundCustomer || null);
        } else {
            setIdentifiedCustomer(null);
        }
    }, [customerPhoneNumber, customers]);

    useEffect(() => {
        setUseWallet(false);
        setPointsToUse(0);
    }, [identifiedCustomer]);
    
    useEffect(() => {
        if(isOpen) {
            setCustomerPhoneNumber('');
            setDiscountValue(0);
            setPointsToUse(0);
            setIdentifiedCustomer(null);
            setErrors({});
            setShortageInfo(null);
            setSuccessfulSale(null);
            setUseWallet(false);
        }
    }, [isOpen]);
    
    useEffect(() => {
        if (successfulSale) {
            handlePrint();
        }
    }, [successfulSale]);

    const loyaltySettings = settings.loyaltySettings;

    const subtotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
    const taxAmount = Math.round(subtotal * (settings.taxRate / 100));
    const manualDiscount = discountType === 'percent' ? Math.round(subtotal * (discountValue / 100)) : discountValue;
    
    const pointsDiscount = useMemo(() => {
        if (loyaltySettings?.enabled && loyaltySettings.programType === 'points' && identifiedCustomer && pointsToUse > 0) {
            return pointsToUse * POINTS_TO_TOMAN_RATE;
        }
        return 0;
    }, [pointsToUse, identifiedCustomer, loyaltySettings]);

    const walletDiscount = useMemo(() => {
        if (loyaltySettings?.enabled && loyaltySettings.programType === 'cashback' && identifiedCustomer && useWallet) {
            const totalBeforeWallet = subtotal + taxAmount - manualDiscount;
            return Math.min(totalBeforeWallet, identifiedCustomer.walletBalance);
        }
        return 0;
    }, [useWallet, identifiedCustomer, loyaltySettings, subtotal, taxAmount, manualDiscount]);
    
    const cashbackEarned = useMemo(() => {
        if (loyaltySettings?.enabled && loyaltySettings.programType === 'cashback' && loyaltySettings.cashbackPercentage > 0) {
            return Math.round(subtotal * (loyaltySettings.cashbackPercentage / 100));
        }
        return 0;
    }, [loyaltySettings, subtotal]);

    const totalDiscount = manualDiscount + pointsDiscount + walletDiscount;
    const payableAmount = subtotal + taxAmount - totalDiscount;

    const validateCheckout = () => {
        const validationErrors = validate(
            { discountValue, customerPhoneNumber, pointsToUse },
            {
                discountValue: { isNumber: true, min: 0 },
                customerPhoneNumber: {
                    pattern: {
                        value: /^09\d{9}$/,
                        message: 'فرمت شماره موبایل صحیح نیست (مثال: 09123456789).'
                    }
                },
                pointsToUse: {
                    isNumber: true, min: 0,
                    max: identifiedCustomer?.loyaltyPoints,
                }
            }
        );
        if (payableAmount < 0) {
            validationErrors.discountValue = 'تخفیف نمی‌تواند از مبلغ کل بیشتر باشد.';
        }
        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    };

    const onFinalCheckout = async () => {
        if (!validateCheckout() || isProcessing || !currentUser) return;
        
        setIsProcessing(true);

        const { status, insufficientItems } = checkStockForSale(cart);
        
        const executeTransaction = async () => {
            try {
                const currentShift = useRestaurantStore.getState().shifts.find(s => s.status === 'open');
                // @ts-ignore - walletAmountUsed is a new property not yet in the store type definition
                const { newSale, inventoryShortage, prepShortage } = processTransaction(cart, {
                    operator: currentUser,
                    method: paymentMethod,
                    discount: totalDiscount,
                    tax: settings.taxRate,
                    shiftId: currentShift?.id,
                    customerPhoneNumber: customerPhoneNumber?.trim(),
                    pointsUsed: pointsToUse,
                    walletAmountUsed: walletDiscount,
                });
                
                setSuccessfulSale(newSale); // Triggers printing via useEffect
                showToast('فاکتور با موفقیت ثبت شد');

                if (inventoryShortage || prepShortage) {
                    setTimeout(() => {
                        showToast("هشدار: کسری موجودی ثبت شد و به مرکز عملیات اضافه گردید.", 'warning');
                    }, 500);
                }
            } catch (e: any) {
                showToast(e.message || 'خطا در ثبت سفارش.', 'error');
            }
        };

        if (status === 'OK') {
            await executeTransaction();
        } else {
            const itemNames = insufficientItems.map(i => i.name).join(', ');
            if (status === 'BLOCKED') {
                addAuditLog('TRANSACTION', 'INVENTORY', `Sale blocked due to insufficient stock for: ${itemNames}.`);
                setShortageInfo({ type: 'BLOCKED', items: insufficientItems });
            } else if (status === 'NEEDS_CONFIRMATION') {
                setShortageInfo({ type: 'NEEDS_CONFIRMATION', items: insufficientItems });
            }
        }
        setIsProcessing(false);
    };

    const handleConfirmShortage = async () => {
        if (shortageInfo && shortageInfo.type === 'NEEDS_CONFIRMATION') {
            addAuditLog('TRANSACTION', 'INVENTORY', `User confirmed sale despite shortage for: ${shortageInfo.items.map(i => i.name).join(', ')}.`);
            setShortageInfo(null);
            
            setIsProcessing(true);
            const currentShift = useRestaurantStore.getState().shifts.find(s => s.status === 'open');
            // @ts-ignore
            const { newSale } = processTransaction(cart, {
                operator: currentUser!, method: paymentMethod, discount: totalDiscount, tax: settings.taxRate,
                shiftId: currentShift?.id, customerPhoneNumber: customerPhoneNumber, pointsUsed: pointsToUse, walletAmountUsed: walletDiscount
            });
            setSuccessfulSale(newSale);
            setIsProcessing(false);
        }
    };
    
    if (!isOpen) return null;

    const renderSuccessView = () => (
        <>
            <div className="p-8 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-500">
                    <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">پرداخت موفق بود</h2>
                <p className="text-slate-500 mb-8">فاکتور با شماره {successfulSale?.invoiceNumber} با موفقیت ثبت شد.</p>
            </div>
            <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                <button onClick={onClose} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold">فاکتور جدید</button>
                <button onClick={handlePrint} className="flex-1 py-4 text-slate-600 hover:bg-slate-100 rounded-2xl font-bold transition-colors flex items-center justify-center gap-2">
                    <Printer className="w-5 h-5"/>
                    چاپ مجدد
                </button>
            </div>
            {successfulSale && (
                <div className="hidden">
                    <ReceiptTemplate 
                        ref={receiptRef}
                        sale={successfulSale}
                        settings={settings}
                        menuItems={menu}
                        customer={customers.find(c => c.id === successfulSale.customerId) || null}
                    />
                </div>
            )}
        </>
    );

    const renderShortageView = () => (
        <>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className={`text-xl font-extrabold flex items-center gap-2 ${shortageInfo?.type === 'BLOCKED' ? 'text-rose-600' : 'text-amber-600'}`}>
                    <AlertTriangle className="w-6 h-6" />
                    {shortageInfo?.type === 'BLOCKED' ? 'فروش مسدود شد' : 'کمبود موجودی'}
                </h3>
                <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400">
                    <X className="w-5 h-5"/>
                </button>
            </div>
            <div className="p-6 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                <p className="text-sm text-slate-600 mb-4">
                    {shortageInfo?.type === 'BLOCKED'
                        ? 'به دلیل سیاست‌های انبار، فروش تا زمان تامین موجودی کالاهای زیر امکان‌پذیر نیست:'
                        : 'موجودی کالاهای زیر کافی نیست. آیا مایل به ثبت فروش و کسر از انبار هستید؟'}
                </p>
                <div className="space-y-2">
                    {shortageInfo?.items.map(item => (
                        <div key={item.id} className="bg-slate-50 p-3 rounded-xl text-sm border border-slate-200">
                            <p className="font-bold col-span-3 text-slate-800">{item.name}</p>
                            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                                <span>مورد نیاز: <span className="font-bold text-rose-600 font-mono">{item.required.toFixed(2)}</span></span>
                                <span>موجود: <span className="font-bold text-emerald-600 font-mono">{item.available.toFixed(2)}</span></span>
                                <span>واحد: <span className="font-bold">{item.unit}</span></span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex gap-4 shrink-0">
                {shortageInfo?.type === 'BLOCKED' ? (
                    <button onClick={() => setShortageInfo(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">متوجه شدم</button>
                ) : (
                    <>
                        <button onClick={() => setShortageInfo(null)} className="flex-1 py-4 text-slate-600 hover:bg-slate-100 rounded-2xl font-bold transition-colors">انصراف</button>
                        <button onClick={handleConfirmShortage} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold">تایید و ثبت</button>
                    </>
                )}
            </div>
        </>
    );

    const renderCheckoutView = () => (
        <>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-extrabold text-slate-800">مشاهده و پرداخت</h3>
                <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                {cart.map(({item, quantity}) => (
                    <div key={item.id} className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-sm text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-400 font-medium">{item.price.toLocaleString()} تومان</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 rounded-full p-1 border border-slate-200">
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm"><Plus className="w-4 h-4"/></button>
                            <span className="w-8 text-center font-bold text-sm">{quantity}</span>
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm"><Minus className="w-4 h-4"/></button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-slate-100 space-y-4 shrink-0">
                <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="tel" value={customerPhoneNumber} onChange={e => setCustomerPhoneNumber(e.target.value)} placeholder="شماره موبایل مشتری (اختیاری)" className="w-full bg-white border-slate-200 rounded-2xl p-4 pr-12 text-sm font-bold" />
                    {errors.customerPhoneNumber && <p className="text-rose-500 text-xs mt-1">{errors.customerPhoneNumber}</p>}
                </div>

                {loyaltySettings?.enabled && identifiedCustomer && (
                    <>
                        {loyaltySettings.programType === 'cashback' && identifiedCustomer.walletBalance > 0 && (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3 text-sm font-bold flex items-center justify-between">
                                <label htmlFor="useWallet" className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" id="useWallet" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
                                    استفاده از کیف پول
                                </label>
                                <span>{identifiedCustomer.walletBalance.toLocaleString()} تومان</span>
                            </div>
                        )}
                        {loyaltySettings.programType === 'points' && (
                            <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl p-3 text-xs font-bold flex items-center justify-between">
                                <div className="flex items-center gap-2"><Star className="w-4 h-4" /><span>{identifiedCustomer.fullName || 'مشتری'} ({identifiedCustomer.loyaltyPoints} امتیاز)</span></div>
                                {identifiedCustomer.loyaltyPoints > 0 && (
                                    <div className="flex items-center gap-2">
                                        <label>استفاده:</label>
                                        <input type="number" value={pointsToUse || ''} onChange={e => setPointsToUse(Number(e.target.value))} max={identifiedCustomer.loyaltyPoints} className="w-16 p-1 rounded-md border border-indigo-200 text-center" />
                                        {errors.pointsToUse && <p className="text-rose-500 text-xs mt-1">{errors.pointsToUse}</p>}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
                
                <div className="flex gap-2">
                    <input type="number" value={discountValue || ''} onChange={e=>setDiscountValue(Number(e.target.value))} placeholder="تخفیف دستی" className="w-full bg-white border-slate-200 rounded-2xl p-4 text-sm font-bold"/>
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
                        <button onClick={()=>setDiscountType('amount')} className={`px-3 py-2 rounded-xl text-xs font-bold ${discountType === 'amount' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>تومان</button>
                        <button onClick={()=>setDiscountType('percent')} className={`px-3 py-2 rounded-xl text-xs font-bold ${discountType === 'percent' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>%</button>
                    </div>
                </div>
                 {errors.discountValue && <p className="text-rose-500 text-xs mt-1">{errors.discountValue}</p>}

                <div className="space-y-1 text-sm font-bold text-slate-600 border-t border-slate-200 pt-3">
                    <div className="flex justify-between"><span>جمع کل</span><span>{subtotal.toLocaleString()}</span></div>
                    {settings.taxRate > 0 && <div className="flex justify-between"><span>مالیات ({settings.taxRate}%)</span><span>{taxAmount.toLocaleString()}</span></div>}
                    {totalDiscount > 0 && <div className="flex justify-between text-rose-500"><span>تخفیف</span><span>- {totalDiscount.toLocaleString()}</span></div>}
                    {cashbackEarned > 0 && (
                        <div className="flex justify-between text-emerald-600">
                            <span>سود شما از این خرید</span>
                            <span>+ {cashbackEarned.toLocaleString()} تومان</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-5 bg-white border-t border-slate-100 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500">مبلغ قابل پرداخت</span>
                    <span className="text-3xl font-black text-slate-800">{payableAmount.toLocaleString()} <span className="text-base font-normal">تومان</span></span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setPaymentMethod('card')} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 transition-colors ${paymentMethod === 'card' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-transparent'}`}><CreditCard className="w-5 h-5"/> <span className="text-xs font-bold">کارتخوان</span></button>
                    <button onClick={() => setPaymentMethod('cash')} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 transition-colors ${paymentMethod === 'cash' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-transparent'}`}><Banknote className="w-5 h-5"/> <span className="text-xs font-bold">نقد</span></button>
                    <button onClick={() => setPaymentMethod('online')} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 transition-colors ${paymentMethod === 'online' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-transparent'}`}><Globe className="w-5 h-5"/> <span className="text-xs font-bold">آنلاین</span></button>
                </div>
                <button 
                    onClick={onFinalCheckout}
                    disabled={isProcessing}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-slate-300 active:scale-95 disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin"/> : 'ثبت نهایی و چاپ فیش'}
                </button>
            </div>
        </>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] w-full max-w-md flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                {successfulSale ? renderSuccessView() : shortageInfo ? renderShortageView() : renderCheckoutView()}
            </div>
        </div>
    );
};