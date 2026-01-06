import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PERMISSIONS_LIST } from '../../types';
import { User as UserIcon, Lock, Phone, ChefHat, Loader2, ArrowLeft } from 'lucide-react';

export const AuthView: React.FC = () => {
    const { registerUser, login, checkSystemStatus } = useAuth();
    const { showToast } = useToast();
    
    const [systemStatus, setSystemStatus] = useState<'INITIALIZED' | 'NOT_INITIALIZED' | 'CHECKING'>('CHECKING');
    const [mode, setMode] = useState<'login' | 'register'>('login');
    
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const check = async () => {
            const status = await checkSystemStatus();
            setSystemStatus(status);
            if (status === 'NOT_INITIALIZED') {
                setMode('register');
            } else {
                setMode('login');
            }
        };
        check();
    }, [checkSystemStatus]);
    
    const resetForm = () => {
        setError('');
        setFullName('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('رمزهای عبور با یکدیگر مطابقت ندارند.');
            return;
        }
        setLoading(true);
        try {
            const allPermissions = PERMISSIONS_LIST.map(p => p.id);
            const isFirstUser = systemStatus === 'NOT_INITIALIZED';

            await registerUser({
                username,
                password,
                fullName,
                role: isFirstUser ? 'manager' : 'server', // First user is always manager
                permissions: isFirstUser ? allPermissions : ['pos'],
                isActive: true
            });
            // onAuthStateChange handles login after successful registration
            showToast('حساب شما با موفقیت ایجاد شد. لطفا وارد شوید.', 'success');
            setMode('login');
            
        } catch (err: any) {
            setError(err.message || 'خطا در ایجاد حساب کاربری');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            // onAuthStateChange handles successful login
        } catch (err: any) {
            setError(err.message || 'خطا در ورود');
        } finally {
            setLoading(false);
        }
    };
    
    const Header = () => (
        <div className="p-8 text-center bg-slate-900 relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]"></div>
            <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <ChefHat className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">Foodyar 2</h1>
                <p className="text-slate-400 font-bold text-sm">سیستم مدیریت هوشمند رستوران</p>
            </div>
        </div>
    );
    
    if (systemStatus === 'CHECKING') {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        </div>
      );
    }

    const renderContent = () => {
        switch(mode) {
            case 'register':
                return (
                    <>
                        <h2 className="text-xl font-extrabold text-slate-800 text-center mb-6">
                            {systemStatus === 'NOT_INITIALIZED' ? 'ایجاد حساب مدیر' : 'ایجاد حساب جدید'}
                        </h2>
                        {error && <p className="bg-rose-50 text-rose-600 text-center text-sm font-bold py-2.5 rounded-xl mb-4">{error}</p>}
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="relative">
                                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="text" placeholder="نام و نام خانوادگی" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200" />
                            </div>
                            <div className="relative">
                                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="email" placeholder="ایمیل" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200" />
                            </div>
                            <div className="relative">
                                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="password" placeholder="رمز عبور" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200" />
                            </div>
                            <div className="relative">
                                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="password" placeholder="تکرار رمز عبور" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200" />
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 shadow-xl shadow-slate-300 transition-all active:scale-[0.98] flex items-center justify-center">
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'ثبت نام'}
                            </button>
                        </form>
                        {systemStatus === 'INITIALIZED' && (
                            <div className="text-center mt-6 pt-6 border-t border-slate-100">
                                <button onClick={() => { setMode('login'); resetForm(); }} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                                    قبلا ثبت نام کرده‌اید؟ <span className="text-indigo-600 hover:text-indigo-700">وارد شوید</span>
                                </button>
                            </div>
                        )}
                    </>
                );

            case 'login':
            default:
                return (
                    <>
                        <h2 className="text-xl font-extrabold text-slate-800 text-center mb-6">ورود به حساب</h2>
                        {error && <p className="bg-rose-50 text-rose-600 text-center text-sm font-bold py-2.5 rounded-xl mb-4">{error}</p>}
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="relative">
                                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="email" placeholder="ایمیل" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200" />
                            </div>
                            <div className="relative">
                                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="password" placeholder="رمز عبور" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200" />
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 shadow-xl shadow-slate-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'ورود'}
                                {!loading && <ArrowLeft className="w-5 h-5" />}
                            </button>
                        </form>
                        <div className="text-center mt-6 pt-6 border-t border-slate-100 space-y-4">
                            {systemStatus === 'INITIALIZED' && (
                                <p>
                                    <button onClick={() => { setMode('register'); resetForm(); }} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                                        حساب کاربری ندارید؟ <span className="text-indigo-600 hover:text-indigo-700">ایجاد حساب</span>
                                    </button>
                                </p>
                            )}
                        </div>
                    </>
                );
        }
    };


    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                <Header />
                <div className="p-8 relative">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
