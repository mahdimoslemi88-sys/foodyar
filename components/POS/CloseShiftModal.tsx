import React, { useState, useMemo } from 'react';
import { Shift } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { X, PowerOff, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    shift: Shift;
}

export const CloseShiftModal: React.FC<Props> = ({ isOpen, onClose, shift }) => {
    // Optimization: Use individual selectors to prevent re-renders on unrelated store changes
    const sales = useRestaurantStore(state => state.sales);
    const closeShift = useRestaurantStore(state => state.closeShift);
    const { showToast } = useToast();
    
    const [actualCash, setActualCash] = useState<number>(0);
    const [bankDeposit, setBankDeposit] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const shiftSales = useMemo(() => {
        return sales.filter(s => s.shiftId === shift.id);
    }, [sales, shift.id]);

    const salesSummary = useMemo(() => {
        const cash = shiftSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalAmount, 0);
        const card = shiftSales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.totalAmount, 0);
        const online = shiftSales.filter(s => s.paymentMethod === 'online').reduce((sum, s) => sum + s.totalAmount, 0);
        return { cash, card, online };
    }, [shiftSales]);

    const expectedCash = shift.startingCash + salesSummary.cash;
    const discrepancy = actualCash - expectedCash;

    const handleCloseShift = async () => {
        setError('');
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async
            closeShift(shift.id, actualCash, bankDeposit);
            showToast('شیفت با موفقیت بسته شد.');
            onClose();
        } catch (e: any) {
            setError(e.message || 'خطا در بستن شیفت.');
            showToast(e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <PowerOff className="w-6 h-6 text-rose-500" />
                        بستن شیفت کاری
                    </h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-xs text-slate-400 font-bold">شروع شیفت</p><p className="font-bold text-sm text-slate-700">{new Date(shift.startTime).toLocaleTimeString('fa-IR')}</p></div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-xs text-slate-400 font-bold">صندوق‌دار</p><p className="font-bold text-sm text-slate-700">{shift.operatorName}</p></div>
                    </div>
                    
                    <div className="space-y-2 text-sm font-bold text-slate-600 border-t border-b border-slate-100 py-4">
                        <div className="flex justify-between"><span>موجودی اولیه</span><span>{shift.startingCash.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>فروش نقدی</span><span className="text-emerald-600">+ {salesSummary.cash.toLocaleString()}</span></div>
                        <div className="flex justify-between text-base font-black text-slate-900 pt-2 mt-2 border-t border-dashed border-slate-200"><span>جمع کل نقد مورد انتظار</span><span>{expectedCash.toLocaleString()}</span></div>
                    </div>

                    <div className="space-y-2 text-sm font-bold text-slate-600">
                        <div className="flex justify-between"><span>فروش کارتخوان</span><span>{salesSummary.card.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>فروش آنلاین</span><span>{salesSummary.online.toLocaleString()}</span></div>
                    </div>
                    
                     <div className="space-y-3 pt-4 border-t border-slate-100">
                        <input type="number" placeholder="موجودی نقد شمارش شده" value={actualCash || ''} onChange={e => setActualCash(Number(e.target.value))} className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:border-indigo-400 transition-colors text-center" />
                        <input type="number" placeholder="مبلغ واریز به بانک (اختیاری)" value={bankDeposit || ''} onChange={e => setBankDeposit(Number(e.target.value))} className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:border-indigo-400 transition-colors text-center" />
                    </div>

                    {discrepancy !== 0 && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 ${discrepancy > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                            <AlertTriangle className="w-8 h-8"/>
                            <div>
                                <h4 className="font-extrabold">مغایرت صندوق</h4>
                                <p className="text-sm font-bold">{Math.abs(discrepancy).toLocaleString()} تومان {discrepancy > 0 ? 'اضافه' : 'کسری'}</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-slate-100">
                    <button
                        onClick={handleCloseShift}
                        disabled={loading}
                        className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-rose-700 shadow-xl shadow-rose-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'تایید و بستن شیفت'}
                    </button>
                </div>
            </div>
        </div>
    );
};
