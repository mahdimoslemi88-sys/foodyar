import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User as UserIcon, ShieldCheck, ChefHat, Store, Loader2, RefreshCw, X, AlertTriangle, FileText, CheckSquare } from 'lucide-react';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';

export const ProfileView: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const { resetData } = useRestaurantStore();
    const { showToast } = useToast();
    
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetConfirmationText, setResetConfirmationText] = useState('');

    if (!currentUser) return null;

    const getRoleDetails = (role: string) => {
        switch(role) {
            case 'manager': return { label: 'مدیر رستوران', icon: <ShieldCheck className="w-6 h-6" />, colorClass: 'bg-indigo-100 text-indigo-600' };
            case 'chef': return { label: 'سرآشپز', icon: <ChefHat className="w-6 h-6" />, colorClass: 'bg-orange-100 text-orange-600' };
            case 'cashier': return { label: 'صندوق‌دار', icon: <Store className="w-6 h-6" />, colorClass: 'bg-emerald-100 text-emerald-600' };
            default: return { label: 'پرسنل', icon: <UserIcon className="w-6 h-6" />, colorClass: 'bg-slate-100 text-slate-600' };
        }
    };

    const roleDetails = getRoleDetails(currentUser.role);

    const handleResetData = () => {
        if (resetConfirmationText !== 'RESET') {
            showToast('برای تایید، عبارت RESET را به درستی وارد کنید.', 'error');
            return;
        }
        
        // This only resets the client-side state to default mock data.
        // In a real Supabase app, you'd call a function to delete user's data from DB.
        resetData();
        showToast('تمام داده‌های برنامه با موفقیت بازنشانی شدند.');
        setIsResetModalOpen(false);
        setResetConfirmationText('');
        // Force a reload to re-fetch clean state from store defaults
        window.location.reload();
    };


    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 pt-24 pb-32 md:pb-12 md:pt-12 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-5xl font-black text-slate-500 border-4 border-white shadow-md">
                    {currentUser.fullName.charAt(0)}
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">{currentUser.fullName}</h2>
                    <div className={`mt-2 flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold w-fit ${roleDetails.colorClass}`}>
                        {roleDetails.icon}
                        <span>{roleDetails.label}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">اطلاعات حساب کاربری</h3>
                <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-slate-50 rounded-xl"><span className="font-bold text-slate-500">نام کامل:</span><span className="font-bold text-slate-800">{currentUser.fullName}</span></div>
                    <div className="flex justify-between p-3 bg-slate-50 rounded-xl"><span className="font-bold text-slate-500">نام کاربری:</span><span className="font-mono text-slate-800">{currentUser.username}</span></div>
                    <div className="flex justify-between p-3 bg-slate-50 rounded-xl"><span className="font-bold text-slate-500">نقش:</span><span className="font-bold text-slate-800">{currentUser.role}</span></div>
                </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                 <h3 className="text-lg font-bold text-slate-800 mb-4">دسترسی‌ها</h3>
                 <div className="flex flex-wrap gap-2">
                     {currentUser.permissions.map(p => (
                         <span key={p} className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5" />{p}</span>
                     ))}
                 </div>
            </div>
            
             <div className="bg-rose-50 border-2 border-dashed border-rose-200 rounded-[32px] p-8">
                <h3 className="text-lg font-bold text-rose-800 mb-2">منطقه خطر</h3>
                <p className="text-sm text-rose-600 mb-4">عملیات زیر غیرقابل بازگشت هستند و ممکن است باعث از دست رفتن داده‌ها شوند.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={logout}
                        className="flex-1 flex items-center justify-center gap-3 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        خروج از حساب کاربری
                    </button>
                    {currentUser.role === 'manager' && (
                        <button 
                            onClick={() => setIsResetModalOpen(true)}
                            className="flex-1 flex items-center justify-center gap-3 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            ریست کردن داده‌های برنامه
                        </button>
                    )}
                </div>
            </div>

            {isResetModalOpen && (
                 <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border-t-8 border-rose-500">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-rose-500">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-rose-900">بازنشانی تمام داده‌ها</h3>
                            <p className="text-sm text-rose-700 mt-2">این عمل تمام داده‌های انبار، منو، فروش و ... را به حالت پیش‌فرض اولیه بازمی‌گرداند. این کار غیرقابل بازگشت است.</p>
                        </div>
                        <div className="p-6 space-y-4">
                             <label className="text-xs font-bold text-slate-500">برای تایید، عبارت <code className="font-mono bg-slate-100 p-1 rounded">RESET</code> را در کادر زیر وارد کنید.</label>
                            <input 
                                type="text" 
                                value={resetConfirmationText}
                                onChange={e => setResetConfirmationText(e.target.value)}
                                className="w-full p-4 bg-slate-100 border-2 border-slate-200 rounded-2xl font-mono tracking-widest text-center text-lg font-bold outline-none focus:ring-2 focus:ring-rose-300"
                            />
                        </div>
                        <div className="p-6 border-t border-slate-100 flex gap-4">
                            <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">انصراف</button>
                            <button onClick={handleResetData} className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all">تایید و ریست</button>
                        </div>
                     </div>
                </div>
            )}

        </div>
    );
};
