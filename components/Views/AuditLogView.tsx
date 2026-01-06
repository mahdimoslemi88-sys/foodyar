import React, { useState, useMemo, useEffect } from 'react';
import { useRestaurantStore } from '../../store/restaurantStore';
import { AuditLog } from '../../types';
import { History, Filter, Search, X } from 'lucide-react';

const timeAgo = (timestamp: number) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - timestamp) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " سال پیش";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " ماه پیش";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " روز پیش";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " ساعت پیش";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " دقیقه پیش";
    return "همین الان";
};

const actionLabels: Record<AuditLog['action'], string> = {
    CREATE: 'ایجاد', UPDATE: 'ویرایش', DELETE: 'حذف', WASTE: 'ضایعات',
    SHIFT_CLOSE: 'بستن شیفت', INVOICE_ADD: 'ورود فاکتور', TRANSACTION: 'فروش'
};

const entityLabels: Record<AuditLog['entity'], string> = {
    MENU: 'منو', INVENTORY: 'انبار', EXPENSE: 'هزینه', SHIFT: 'شیفت', USER: 'کاربر',
    INVOICE: 'فاکتور', PREP: 'میزانپلاس', ACTION_CENTER: 'مرکز عملیات', DATA_HEALTH: 'سلامت داده', SALE: 'فروش'
};


export const AuditLogView: React.FC = () => {
    const { auditLogs, navigationIntent, clearNavigationIntent } = useRestaurantStore();
    
    const [filters, setFilters] = useState({
        entityId: '',
        entity: 'all',
        action: 'all',
        search: ''
    });

    useEffect(() => {
        if (navigationIntent?.view === 'audit-log' && navigationIntent.entityId) {
            setFilters(prev => ({ ...prev, entityId: navigationIntent.entityId! }));
            clearNavigationIntent();
        }
    }, [navigationIntent, clearNavigationIntent]);

    const filteredLogs = useMemo(() => {
        return auditLogs.filter(log => 
            (filters.entityId ? log.entityId === filters.entityId : true) &&
            (filters.entity === 'all' ? true : log.entity === filters.entity) &&
            (filters.action === 'all' ? true : log.action === filters.action) &&
            (filters.search ? log.details.toLowerCase().includes(filters.search.toLowerCase()) : true)
        );
    }, [auditLogs, filters]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({...prev, [key]: value }));
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 pt-24 pb-32 md:pb-12 md:pt-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <History className="w-8 h-8 text-indigo-600" />
                    گزارش رویدادها (Audit Log)
                </h2>
                <p className="text-slate-400 font-bold text-sm mt-1">تاریخچه تمام تغییرات و فعالیت‌های ثبت شده در سیستم</p>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="جستجو در جزئیات..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} className="w-full bg-slate-100 border-none rounded-lg py-2 pr-10 pl-4 text-sm font-bold shadow-inner" />
                </div>
                <select value={filters.entity} onChange={e => handleFilterChange('entity', e.target.value)} className="bg-slate-100 border-none rounded-lg py-2 px-3 text-sm font-bold shadow-inner">
                    <option value="all">همه بخش‌ها</option>
                    {Object.entries(entityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                <select value={filters.action} onChange={e => handleFilterChange('action', e.target.value)} className="bg-slate-100 border-none rounded-lg py-2 px-3 text-sm font-bold shadow-inner">
                    <option value="all">همه عملیات‌ها</option>
                    {Object.entries(actionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                {filters.entityId && (
                     <div className="md:col-span-4 flex items-center gap-2 p-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold">
                        <Filter className="w-4 h-4" />
                        <span>فیلتر شده برای شناسه: <code className="font-mono">{filters.entityId}</code></span>
                        <button onClick={() => handleFilterChange('entityId', '')} className="mr-auto p-1 hover:bg-indigo-100 rounded-full"><X className="w-4 h-4"/></button>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {filteredLogs.map(log => {
                    const delta = (log.after?.currentStock !== undefined && log.before?.currentStock !== undefined) 
                        ? log.after.currentStock - log.before.currentStock
                        : null;
                    
                    return (
                        <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="md:col-span-2">
                                <p className="font-bold text-slate-800 text-sm">{log.details}</p>
                                <p className="text-xs text-slate-400 font-mono mt-1" dir="ltr">{log.entityId}</p>
                            </div>
                            <div>
                                {delta !== null && (
                                    <div className={`text-sm font-mono font-bold flex items-center justify-end md:justify-start gap-2 ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        <span>{delta >= 0 ? '+' : ''}{delta.toFixed(2)}</span>
                                        <div className="text-xs text-slate-400 font-sans">({log.before.currentStock.toFixed(2)} → {log.after.currentStock.toFixed(2)})</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between md:justify-end text-xs font-bold text-slate-500 gap-4">
                                <span>{log.userName}</span>
                                <span>{timeAgo(log.timestamp)}</span>
                                <span className="px-2 py-1 bg-slate-100 rounded-md">{actionLabels[log.action] || log.action}</span>
                            </div>
                        </div>
                    )
                })}
            </div>

        </div>
    );
};