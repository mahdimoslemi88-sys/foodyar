import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../../store/restaurantStore';
import { generateDailyBrief } from '../../utils/dailyBrief';
import { DailyBrief, RecommendedAction, View } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import * as features from '../../config/features';
import { explainDailyBrief } from '../../services/geminiService';
import { Sunrise, TrendingUp, TrendingDown, DollarSign, List, Package, AlertTriangle, Sparkles, Loader2, ListTodo } from 'lucide-react';
import { EmptyState } from '../EmptyState';

interface DailyBriefProps {
  onNavigate: (view: View, entityId?: string) => void;
}

export const DailyBriefView: React.FC<DailyBriefProps> = ({ onNavigate }) => {
    const store = useRestaurantStore();
    const { addManagerTask } = store;
    const { showToast } = useToast();
    
    const [brief, setBrief] = useState<DailyBrief | null>(null);
    const [aiExplanation, setAiExplanation] = useState<string>('');
    const [isExplaining, setIsExplaining] = useState(false);
    const [createdTaskIds, setCreatedTaskIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const briefData = generateDailyBrief(store);
        setBrief(briefData);
    }, [store.sales, store.inventory, store.wasteRecords, store.prepTasks]); // Re-generate brief if sales or inventory change

    const handleExplain = async () => {
        if (!brief) return;
        setIsExplaining(true);
        try {
            const explanation = await explainDailyBrief(brief);
            setAiExplanation(explanation);
        } catch (error) {
            showToast("خطا در ارتباط با هوش مصنوعی", 'error');
        } finally {
            setIsExplaining(false);
        }
    };
    
    const handleCreateTask = (action: RecommendedAction) => {
        addManagerTask({
            title: action.title,
            description: action.description,
            category: action.category,
            priority: action.priority,
            evidence: action.evidence,
            source: 'rule',
            assignedToUserId: null,
            createdByUserId: 'system',
            dueAt: null,
        });
        setCreatedTaskIds(prev => new Set(prev).add(action.id));
        showToast('وظیفه با موفقیت به مرکز عملیات اضافه شد.', 'success');
    };

    if (!brief) {
        return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 pt-24 pb-32 md:pb-12 md:pt-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Sunrise className="w-8 h-8 text-indigo-600" />
                        خلاصه عملکرد امروز
                    </h2>
                    <p className="text-slate-400 font-bold text-sm mt-1">{new Date(brief.date).toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                {features.enableAI && (
                    <button onClick={handleExplain} disabled={isExplaining} className="bg-white text-indigo-700 px-5 py-3 rounded-full font-bold text-sm flex items-center gap-2 border border-indigo-100 shadow-sm hover:bg-indigo-50 transition-colors disabled:opacity-50">
                        {isExplaining ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                        {isExplaining ? 'در حال تحلیل...' : 'توضیح با هوش مصنوعی'}
                    </button>
                )}
            </div>
            
            {aiExplanation && (
                <div className="p-5 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-800 text-sm font-medium leading-relaxed animate-in fade-in duration-300">
                    {aiExplanation}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"><p className="text-xs text-slate-400 font-bold">فروش کل</p><p className="text-3xl font-black text-slate-800 mt-1">{brief.salesTodayTotal.toLocaleString()} <span className="text-base font-normal">تومان</span></p></div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"><p className="text-xs text-slate-400 font-bold">تعداد فاکتور</p><p className="text-3xl font-black text-slate-800 mt-1">{brief.salesTodayCount}</p></div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"><p className="text-xs text-slate-400 font-bold">سود ناخالص (تخمینی)</p><p className="text-3xl font-black text-emerald-600 mt-1">{brief.grossProfitEstimateToday.toLocaleString()} <span className="text-base font-normal">تومان</span></p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ListTodo className="w-5 h-5 text-indigo-500" />اقدامات پیشنهادی برای فردا</h3>
                    {brief.recommendedActions.length > 0 ? (
                        <div className="space-y-3">
                        {brief.recommendedActions.map(action => (
                            <div key={action.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{action.title}</p>
                                    <p className="text-xs text-slate-500 mt-1">{action.description}</p>
                                </div>
                                <button onClick={() => handleCreateTask(action)} disabled={createdTaskIds.has(action.id)} className="text-xs font-bold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:bg-emerald-100 disabled:text-emerald-700 transition-colors whitespace-nowrap">
                                    {createdTaskIds.has(action.id) ? 'اضافه شد' : 'تبدیل به وظیفه'}
                                </button>
                            </div>
                        ))}
                        </div>
                    ) : <p className="text-sm text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-100">هیچ اقدام فوری پیشنهاد نمی‌شود.</p>}
                </div>
                 <div>
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500" />پرفروش‌ترین‌های امروز</h3>
                     {brief.topSellingItemsToday.length > 0 ? (
                        <div className="space-y-2">
                        {brief.topSellingItemsToday.map(({ item, quantity }) => (
                            <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-700">{item.name}</span>
                                <span className="font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs">{quantity} عدد</span>
                            </div>
                        ))}
                        </div>
                    ) : <p className="text-sm text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-100">هنوز فروشی ثبت نشده است.</p>}
                </div>
                 <div>
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-indigo-500" />کالاهای رو به اتمام</h3>
                     {brief.lowStockItems.length > 0 ? (
                        <div className="space-y-2">
                        {brief.lowStockItems.map(item => (
                             <button key={item.id} onClick={() => onNavigate('inventory', item.id)} className="w-full text-right bg-white p-3 rounded-xl border border-amber-100 flex justify-between items-center text-sm hover:bg-amber-50 transition-colors">
                                <span className="font-bold text-amber-800">{item.name}</span>
                                <span className="font-mono font-bold text-amber-600 text-xs">موجودی: {item.currentStock}</span>
                            </button>
                        ))}
                        </div>
                    ) : <p className="text-sm text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-100">وضعیت موجودی مطلوب است.</p>}
                </div>
                 <div>
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-indigo-500" />هشدارها و ناهنجاری‌ها</h3>
                    {brief.anomalies.length > 0 ? (
                         <div className="space-y-2">
                            {brief.anomalies.map(anomaly => (
                                <div key={anomaly.id} className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-100 text-sm font-medium">
                                    {anomaly.description}
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-100">مورد غیرعادی یافت نشد.</p>}
                </div>
            </div>
        </div>
    );
};