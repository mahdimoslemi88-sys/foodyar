import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User as UserIcon, ShieldCheck, ChefHat, Store, Loader2, RefreshCw, X, AlertTriangle, FileText, CheckSquare } from 'lucide-react';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';

export const ProfileView: React.FC = () => {
    const { currentUser, logout, resetAuth } = useAuth();
    const { resetData, sales, shifts } = useRestaurantStore();
    const { showToast } = useToast();
    
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetConfirmationText, setResetConfirmationText] = useState('');

    if (!currentUser) return null;

    const getRoleDetails = (role: string) => {
        switch(role) {
            case 'manager': return { label: 'مدیر رستوران', icon: <ShieldCheck className="w-6 h-6" />, colorClass: 'bg-indigo-100 text-indigo-600' };
            case 'chef': return { label: 'سرآشپز', icon: <ChefHat className="w-6 h-6" />, colorClass: 'bg-orange-100 text-orange-600' };
            case 'cashier': return { label: 'صندوق‌دار', icon: <Store className="w-6 h-6" />, colorClass: 'bg-emerald-100 text-emerald-600' };
            default: return { label: 'کاربر', icon: <UserIcon className="w-6 h-6" />, colorClass: 'bg-slate-100 text-slate-600' };
        }
    };
    
    const handleReset = () => {
        setIsResetModalOpen(true);
    };
    
    const handleConfirmReset = async () => {
        if (resetConfirmationText !== 'RESET') {
            showToast('متن تایید اشتباه است.', 'error');
            return;
        }
        resetData();
        await resetAuth();
        localStorage.removeItem('foodyar_onboarding_complete');
        showToast('کل سیستم با موفقیت بازنشانی شد.', 'success');
        setIsResetModalOpen(false);
        setResetConfirmationText('');
    };

    const roleDetails = getRoleDetails(currentUser.role);
    const totalInvoices = sales.length;
    const totalShiftsClosed = shifts.filter(s => s.status === 'closed').length;
    
    return (
        <>
        <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 pt-24 pb-32 md:pb-12 md:pt-12 max-w-2xl mx-auto space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col items-center text-center">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center font-black text-6xl text-white mb-6 shadow-xl ${
                    currentUser.role === 'manager' ? 'bg-indigo-500 shadow-indigo-200' : 
                    currentUser.role === 'chef' ? 'bg-orange-500 shadow-orange-200' : 'bg-emerald-500 shadow-emerald-200'
                }`}>
                    {currentUser.fullName.charAt(0)}
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{currentUser.fullName}</h2>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${roleDetails.colorClass}`}>
                    {roleDetails.icon}
                    <span>{roleDetails.label}</span>
                </div>
                 <p className="text-slate-400 font-bold text-sm mt-3">{currentUser.username}</p>
            </div>
            
             <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">آمار عملکرد (سیستم)</h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <FileText className="w-8 h-8 mx-auto text-indigo-500 mb-2"/>
                        <p className="font-black text-2xl text-slate-800">{totalInvoices}</p>
                        <p className="text-xs text-slate-400 font-bold">فاکتور ثبت شده</p>
                    </div>
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <CheckSquare className="w-8 h-8 mx-auto text-emerald-500 mb-2"/>
                        <p className="font-black text-2xl text-slate-800">{totalShiftsClosed}</p>
                        <p className="text-xs text-slate-400 font-bold">شیفت بسته شده</p>
                    </div>
                </div>
             </div>

            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">تنظیمات حساب</h3>
                <div className="space-y-4">
                    <button 
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-colors font-bold text-base"
                    >
                        <LogOut className="w-5 h-5" />
                        خروج از حساب
                    </button>
                    {currentUser.role === 'manager' && (
                        <button 
                            onClick={handleReset}
                            className="w-full flex items-center justify-center gap-3 px-4 py-4 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors font-bold text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            بازنشانی داده‌های برنامه (حالت دمو)
                        </button>
                    )}
                </div>
            </div>
        </div>
        {isResetModalOpen && (
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border-t-8 border-rose-500">
                    <div className="p-6 bg-rose-50 flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-black text-rose-900 flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6" />
                                بازنشانی داده‌ها
                            </h3>
                            <p className="text-rose-700 text-sm mt-2">این عمل غیرقابل بازگشت است و تمام اطلاعات حذف خواهد شد.</p>
                        </div>
                        <button onClick={() => setIsResetModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-100 text-rose-500 transition-colors">✕</button>
                    </div>
                    <div className="p-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">برای تایید، عبارت <code className="font-mono bg-rose-100 text-rose-700 p-1 rounded-md">RESET</code> را وارد کنید:</label>
                        <input
                            type="text"
                            value={resetConfirmationText}
                            onChange={(e) => setResetConfirmationText(e.target.value)}
                            className="w-full bg-slate-100 border-2 border-slate-200 p-4 rounded-2xl text-center font-mono tracking-widest font-bold text-lg outline-none focus:border-rose-400 transition-colors"
                        />
                    </div>
                    <div className="p-6 border-t border-slate-100 flex gap-4">
                        <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">
                            انصراف
                        </button>
                        <button 
                            onClick={handleConfirmReset} 
                            disabled={resetConfirmationText !== 'RESET'}
                            className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            تایید و حذف کامل
                        </button>
                    </div>
                 </div>
            </div>
        )}
        </>
    );
};