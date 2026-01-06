import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRestaurantStore } from '../../store/restaurantStore';
import { runDataHealthChecks } from '../../utils/dataHealth';
import { HealthIssue, View } from '../../types';
import { EmptyState } from '../EmptyState';
import { HeartPulse, ShieldCheck, ShieldAlert, Shield, Filter, Menu, ShoppingBasket, ClipboardList, RefreshCw } from 'lucide-react';

interface DataHealthViewProps {
  onNavigate: (view: View, entityId?: string) => void;
}

const severityConfig = {
    high: { label: 'بحرانی', icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
    medium: { label: 'مهم', icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    low: { label: 'جزئی', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
};

const entityConfig: Record<HealthIssue['entityType'], { label: string; icon: React.FC<any>; view: View }> = {
    MENU: { label: 'منو', icon: Menu, view: 'menu' },
    INVENTORY: { label: 'انبار', icon: ShoppingBasket, view: 'inventory' },
    PREP: { label: 'آماده‌سازی', icon: ClipboardList, view: 'kitchen-prep' },
};

export const DataHealthView: React.FC<DataHealthViewProps> = ({ onNavigate }) => {
    const { menu, inventory, prepTasks } = useRestaurantStore(state => ({
        menu: state.menu,
        inventory: state.inventory,
        prepTasks: state.prepTasks,
    }));
    
    const [issues, setIssues] = useState<HealthIssue[]>([]);
    const [filters, setFilters] = useState({ severity: 'all', entityType: 'all' });
    
    const recomputeIssues = useCallback(() => {
        const result = runDataHealthChecks({ menu, inventory, prepTasks });
        setIssues(result.issues);
    }, [menu, inventory, prepTasks]);
    
    useEffect(() => {
        recomputeIssues();
    }, [recomputeIssues]);

    const handleRefresh = () => {
        recomputeIssues();
    };

    const filteredIssues = useMemo(() => {
        return issues.filter(issue => 
            (filters.severity === 'all' || issue.severity === filters.severity) &&
            (filters.entityType === 'all' || issue.entityType === filters.entityType)
        ).sort((a, b) => {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }, [issues, filters]);
    
    const summary = useMemo(() => {
        return issues.reduce((acc, issue) => {
            acc[issue.severity] = (acc[issue.severity] || 0) + 1;
            return acc;
        }, { high: 0, medium: 0, low: 0 });
    }, [issues]);

    const handleNavigate = (issue: HealthIssue) => {
        const targetView = entityConfig[issue.entityType]?.view;
        if (targetView && issue.entityId) {
            const firstEntityId = issue.entityId.split(',')[0];
            onNavigate(targetView, firstEntityId);
        }
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 pt-24 pb-32 md:pb-12 md:pt-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <HeartPulse className="w-8 h-8 text-indigo-600" />
                    سلامت داده‌ها
                </h2>
                <p className="text-slate-400 font-bold text-sm mt-1">
                    {issues.length > 0 ? `${issues.length} مشکل شناسایی شد` : 'داده‌های شما در وضعیت مطلوبی قرار دارند.'}
                </p>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-700 text-sm ml-2">خلاصه:</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-black ${severityConfig.high.bg} ${severityConfig.high.color}`}>بحرانی: {summary.high}</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-black ${severityConfig.medium.bg} ${severityConfig.medium.color}`}>مهم: {summary.medium}</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-black ${severityConfig.low.bg} ${severityConfig.low.color}`}>جزئی: {summary.low}</span>
                </div>
                <button onClick={handleRefresh} className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 self-end md:self-center">
                    <RefreshCw className="w-3.5 h-3.5"/>
                    به‌روزرسانی
                </button>
            </div>


            <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Filter className="w-5 h-5 text-slate-400" />
                <select value={filters.severity} onChange={e => setFilters({...filters, severity: e.target.value})} className="bg-slate-100 border-none rounded-lg py-2 px-3 text-sm font-bold shadow-inner">
                    <option value="all">همه شدت‌ها</option>
                    <option value="high">بحرانی</option>
                    <option value="medium">مهم</option>
                    <option value="low">جزئی</option>
                </select>
                 <select value={filters.entityType} onChange={e => setFilters({...filters, entityType: e.target.value})} className="bg-slate-100 border-none rounded-lg py-2 px-3 text-sm font-bold shadow-inner">
                    <option value="all">همه بخش‌ها</option>
                    <option value="MENU">منو</option>
                    <option value="INVENTORY">انبار</option>
                    <option value="PREP">آماده‌سازی</option>
                </select>
            </div>

            {filteredIssues.length === 0 ? (
                <div className="mt-10">
                    <EmptyState
                        icon={<ShieldCheck className="w-16 h-16 text-emerald-500" />}
                        title="هیچ مشکلی یافت نشد"
                        description="بر اساس بررسی‌های انجام شده، داده‌های سیستم شما یکپارچه و صحیح به نظر می‌رسند."
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredIssues.map(issue => {
                        const sevConfig = severityConfig[issue.severity];
                        const entConfig = entityConfig[issue.entityType];
                        const SeverityIcon = sevConfig.icon;
                        
                        return (
                            <div key={issue.id} className={`p-5 rounded-2xl border ${sevConfig.bg} ${sevConfig.border}`}>
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="flex items-start gap-4">
                                        <SeverityIcon className={`w-6 h-6 ${sevConfig.color} shrink-0`} />
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md bg-white`}>{sevConfig.label}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md bg-white`}>{entConfig.label}</span>
                                            </div>
                                            <h3 className={`font-bold ${sevConfig.color.replace('600', '900')}`}>{issue.title}: <span className="text-slate-700 font-medium">{issue.entityName}</span></h3>
                                            <p className={`text-sm mt-1 ${sevConfig.color.replace('600', '700')}`}>{issue.description}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleNavigate(issue)} className="bg-white text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 shadow-sm whitespace-nowrap self-end md:self-center">
                                        رفتن به آیتم
                                    </button>
                                </div>
                                <div className="mt-3 pt-3 border-t border-current opacity-20">
                                    <p className={`text-xs font-bold ${sevConfig.color.replace('600', '800')}`}>
                                        <span className="opacity-70">راه‌حل پیشنهادی: </span>{issue.suggestedFix}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};
