import React, { useState } from 'react';
import { useRestaurantStore } from '../../store/restaurantStore';
import { SubscriptionTier } from '../../types';
import { Check, Star, Zap, Building, Loader2 } from 'lucide-react';

interface SubscriptionViewProps {
    onComplete: () => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ onComplete }) => {
    const { settings, setSettings } = useRestaurantStore();
    const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);

    const handleSelectPlan = async (tier: SubscriptionTier) => {
        if (tier === 'enterprise') {
            // In a real app, this would open a contact form or a mailto link.
            alert('لطفا برای اطلاعات بیشتر با تیم فروش ما تماس بگیرید.');
            return;
        }

        setLoadingTier(tier);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 750));

        const now = Date.now();
        const expiryDate = (tier === 'free_trial')
            ? now + (14 * 24 * 60 * 60 * 1000) // 14 days for free trial
            : now + (30 * 24 * 60 * 60 * 1000); // 30 days for other plans (placeholder)
        
        setSettings(prev => ({
            ...prev,
            subscription: {
                tier: tier,
                startDate: now,
                expiryDate: expiryDate,
                isActive: true,
            }
        }));

        setLoadingTier(null);
        
        onComplete();
    };
    
    const PlanCard: React.FC<{
        tier: SubscriptionTier;
        title: string;
        price: string;
        period?: string;
        features: string[];
        isPopular?: boolean;
        buttonText: string;
        icon: React.ReactNode;
    }> = ({ tier, title, price, period, features, isPopular, buttonText, icon }) => {
        const isLoading = loadingTier === tier;
        return (
            <div className={`bg-white rounded-3xl p-8 border-2 ${isPopular ? 'border-indigo-500 shadow-2xl shadow-indigo-200/50' : 'border-slate-100 shadow-lg shadow-slate-200/50'} relative flex flex-col`}>
                {isPopular && (
                    <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3"/>
                        محبوب‌ترین
                    </div>
                )}
                <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPopular ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{icon}</div>
                    <h3 className="text-xl font-extrabold text-slate-800">{title}</h3>
                </div>
                
                <div className="mb-8">
                    <span className="text-4xl font-black tracking-tighter text-slate-900">{price}</span>
                    {period && <span className="text-slate-400 font-bold ml-1">{period}</span>}
                </div>
                
                <ul className="space-y-3 mb-10 flex-1">
                    {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-slate-600 font-medium">{f}</span>
                        </li>
                    ))}
                </ul>
                
                <button 
                    onClick={() => handleSelectPlan(tier)}
                    disabled={isLoading}
                    className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center ${
                        isPopular 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700' 
                        : 'bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800'
                    } active:scale-95 disabled:opacity-50`}
                >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin"/> : buttonText}
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-3">پلن اشتراک خود را انتخاب کنید</h1>
                <p className="text-slate-500 max-w-2xl mx-auto text-lg">برای شروع، دوره آزمایشی ۱۴ روزه رایگان را فعال کنید یا یکی از پلن‌های حرفه‌ای ما را انتخاب نمایید.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl w-full">
                <div className="lg:col-span-1 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-100 fill-mode-forwards">
                     <PlanCard
                        tier="free_trial"
                        title="آزمایشی رایگان"
                        price="۰"
                        period="تومان"
                        features={["۱۴ روز استفاده کامل", "بدون نیاز به کارت بانکی", "دسترسی به تمام ماژول‌ها", "پشتیبانی اولیه"]}
                        buttonText="فعالسازی دوره آزمایشی"
                        icon={<Zap className="w-6 h-6"/>}
                    />
                </div>

                <div className="lg:col-span-1 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-200 fill-mode-forwards">
                     <PlanCard
                        tier="basic"
                        title="پایه"
                        price="۱.۵"
                        period="م / ماهانه"
                        features={["صندوق فروش (POS)", "انبارداری پایه", "مدیریت منو", "گزارشات فروش", "تا ۳ کاربر"]}
                        buttonText="انتخاب طرح"
                        icon={<Check className="w-6 h-6"/>}
                    />
                </div>

                <div className="lg:col-span-1 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300 fill-mode-forwards">
                     <PlanCard
                        tier="pro"
                        title="حرفه‌ای"
                        price="۳"
                        period="م / ماهانه"
                        features={["تمام امکانات پلن پایه", "هوش مصنوعی AssistChef", "باشگاه مشتریان (CRM)", "حسابداری و شیفت‌ها", "تا ۱۰ کاربر", "پشتیبانی ویژه"]}
                        isPopular
                        buttonText="انتخاب طرح"
                        icon={<Star className="w-6 h-6"/>}
                    />
                </div>
                
                <div className="lg:col-span-1 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-400 fill-mode-forwards">
                     <PlanCard
                        tier="enterprise"
                        title="سازمانی"
                        price="تماس"
                        period="بگیرید"
                        features={["تمام امکانات پلن حرفه‌ای", "کاربر نامحدود", "راهکارهای زنجیره‌ای", "API اختصاصی", "مدیر حساب اختصاصی"]}
                        buttonText="تماس با فروش"
                        icon={<Building className="w-6 h-6"/>}
                    />
                </div>
            </div>
        </div>
    );
};

export default SubscriptionView;