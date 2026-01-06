import React, { useState } from 'react';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Lock, ArrowLeft, Loader2 } from 'lucide-react';

export const ShiftControlView: React.FC = () => {
    const { startShift } = useRestaurantStore();
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const [startingCash, setStartingCash] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleStartShift = async () => {
        if (!currentUser) {
            setError('کاربر شناسایی نشد.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async
            startShift(startingCash, currentUser);
            showToast('شیفت با موفقیت آغاز شد.', 'success');
        } catch (e: any) {
            setError(e.message || 'خطا در شروع شیفت.');
            showToast(e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto text-center bg-white p-8 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400">
                <Lock className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">شروع شیفت کاری</h2>
            <p className="text-slate-500 mb-8">برای ثبت فروش، ابتدا شیفت خود را با ثبت موجودی اولیه صندوق باز کنید.</p>
            
            {error && <p className="bg-rose-50 text-rose-600 text-center text-sm font-bold py-2.5 rounded-xl mb-4">{error}</p>}

            <div className="space-y-4">
                <input
                    type="number"
                    placeholder="موجودی اولیه صندوق (تومان)"
                    value={startingCash || ''}
                    onChange={e => setStartingCash(Number(e.target.value))}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200 text-center"
                />
                <button
                    onClick={handleStartShift}
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 shadow-xl shadow-slate-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'شروع شیفت'}
                    {!loading && <ArrowLeft className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
};
