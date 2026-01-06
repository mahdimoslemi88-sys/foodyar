import React, { useState, useMemo } from 'react';
import { ManagerTask, ManagerTaskCategory, ManagerTaskPriority, ManagerTaskStatus, View, User } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { EmptyState } from '../EmptyState';
import { ListChecks, Search, ChevronDown, RefreshCw, Plus, Loader2, CheckCircle, XCircle, UserPlus, MoreVertical, Clock, Circle, PlayCircle, ExternalLink, X } from 'lucide-react';

interface ActionCenterProps {
  onNavigate: (view: View, entityId?: string) => void;
}

const priorityStyles: Record<ManagerTaskPriority, { bg: string, text: string, border: string, label: string }> = {
    high: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'بالا' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'متوسط' },
    low: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'پایین' },
};

const categoryLabels: Record<ManagerTaskCategory, string> = {
    sales: 'فروش', inventory: 'انبار', procurement: 'تدارکات', staff: 'پرسنل',
    quality: 'کیفیت', finance: 'مالی', other: 'سایر'
};

const statusLabels: Record<ManagerTaskStatus, string> = {
    open: 'باز', in_progress: 'در حال انجام', done: 'انجام شده', dismissed: 'نادیده گرفته شده'
};

const AddTaskModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (taskData: Omit<ManagerTask, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
    users: User[];
    currentUser: User;
}> = ({ isOpen, onClose, onSave, users, currentUser }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ManagerTaskCategory>('other');
    const [priority, setPriority] = useState<ManagerTaskPriority>('medium');
    const [assignedToUserId, setAssignedToUserId] = useState<string | null>(null);
    const [dueDate, setDueDate] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        if (!title) return;
        const dueAt = dueDate ? new Date(dueDate).getTime() : null;
        onSave({
            title, description, category, priority,
            assignedToUserId, dueAt,
            source: 'manual',
            createdByUserId: currentUser.id,
            evidence: []
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800">ایجاد وظیفه جدید</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <input type="text" placeholder="عنوان وظیفه" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold" />
                    <textarea placeholder="توضیحات (اختیاری)" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold h-24" />
                    <div className="grid grid-cols-2 gap-4">
                        <select value={category} onChange={e => setCategory(e.target.value as ManagerTaskCategory)} className="w-full p-4 bg-slate-50 rounded-xl font-bold">
                            {Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                        <select value={priority} onChange={e => setPriority(e.target.value as ManagerTaskPriority)} className="w-full p-4 bg-slate-50 rounded-xl font-bold">
                            {Object.entries(priorityStyles).map(([key, {label}]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <select value={assignedToUserId || ''} onChange={e => setAssignedToUserId(e.target.value || null)} className="w-full p-4 bg-slate-50 rounded-xl font-bold">
                            <option value="">اختصاص به...</option>
                            {users.map(user => <option key={user.id} value={user.id}>{user.fullName}</option>)}
                        </select>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-bold" />
                    </div>
                </div>
                <div className="p-6 border-t flex gap-2"><button onClick={onClose} className="flex-1 py-3 text-slate-500 rounded-xl font-bold">انصراف</button><button onClick={handleSave} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">ذخیره</button></div>
            </div>
        </div>
    );
};

export const ActionCenterView: React.FC<ActionCenterProps> = ({ onNavigate }) => {
    const { managerTasks, generateTasksFromRules, updateManagerTask, addManagerTask } = useRestaurantStore();
    const { currentUser, users } = useAuth();
    const { showToast } = useToast();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({ status: 'active', category: 'all', priority: 'all' });
    const [loading, setLoading] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

    const filteredTasks = useMemo(() => {
        return managerTasks
            .filter(task => {
                const statusMatch = filters.status === 'all' || 
                                    (filters.status === 'active' && (task.status === 'open' || task.status === 'in_progress')) ||
                                    task.status === filters.status;
                const categoryMatch = filters.category === 'all' || task.category === filters.category;
                const priorityMatch = filters.priority === 'all' || task.priority === filters.priority;
                const searchMatch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    task.description.toLowerCase().includes(searchQuery.toLowerCase());
                return statusMatch && categoryMatch && priorityMatch && searchMatch;
            })
            .sort((a, b) => b.createdAt - a.createdAt);
    }, [managerTasks, searchQuery, filters]);

    const handleGenerateTasks = () => {
        setLoading(true);
        // @ts-ignore
        const newTasksCount = generateTasksFromRules();
        setTimeout(() => {
             setLoading(false);
             showToast(newTasksCount > 0 ? `${newTasksCount} وظیفه جدید شناسایی شد.` : 'موردی برای ایجاد وظیفه جدید یافت نشد.', 'success');
        }, 500);
    };

    const handleStatusChange = (taskId: string, status: ManagerTaskStatus) => {
        updateManagerTask(taskId, { status });
        setOpenMenuId(null);
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 pt-24 pb-32 md:pb-12 md:pt-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ListChecks className="w-8 h-8 text-indigo-600" />
                        مرکز عملیات
                    </h2>
                    <p className="text-slate-400 font-bold text-sm mt-1">وظایف و هشدارهای مدیریتی سیستم</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleGenerateTasks} disabled={loading} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-3 rounded-full font-bold shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <RefreshCw className="w-5 h-5 text-indigo-500" />}
                        <span className="text-sm">تحلیل و ایجاد وظایف</span>
                    </button>
                    <button onClick={() => setIsAddTaskModalOpen(true)} className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-3 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-95 transition-transform">
                        <Plus className="w-5 h-5"/>
                        <span className="text-sm">افزودن دستی</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-2">
                     <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                     <input type="text" placeholder="جستجوی وظیفه..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-12 pl-4 text-sm font-bold shadow-sm" />
                </div>
                <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold shadow-sm">
                    <option value="active">وضعیت: فعال</option>
                    <option value="open">باز</option>
                    <option value="in_progress">در حال انجام</option>
                    <option value="done">انجام شده</option>
                    <option value="dismissed">نادیده گرفته شده</option>
                    <option value="all">همه</option>
                </select>
                <select value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})} className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold shadow-sm">
                    <option value="all">همه اولویت‌ها</option>
                    <option value="high">بالا</option>
                    <option value="medium">متوسط</option>
                    <option value="low">پایین</option>
                </select>
            </div>

            {filteredTasks.length === 0 ? (
                <div className="mt-10">
                    <EmptyState
                        icon={<ListChecks className="w-12 h-12" />}
                        title="هیچ وظیفه‌ای برای نمایش وجود ندارد"
                        description="برای شناسایی هشدارهای سیستمی، روی دکمه 'تحلیل و ایجاد وظایف' کلیک کنید."
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTasks.map(task => {
                        const priorityStyle = priorityStyles[task.priority];
                        return (
                            <div key={task.id} className={`bg-white rounded-3xl border ${task.status === 'done' || task.status === 'dismissed' ? 'opacity-50' : ''} ${priorityStyle.border} shadow-sm transition-all overflow-hidden`}>
                                <div className={`h-2 ${priorityStyle.bg.replace('50', '200')}`}></div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-black ${priorityStyle.bg} ${priorityStyle.text}`}>{priorityStyle.label}</span>
                                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{categoryLabels[task.category]}</span>
                                            </div>
                                            <h3 className="font-bold text-slate-800">{task.title}</h3>
                                            <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400">{statusLabels[task.status]}</span>
                                            <div className="relative">
                                                <button onClick={() => setOpenMenuId(prev => prev === task.id ? null : task.id)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"><MoreVertical className="w-4 h-4 text-slate-500"/></button>
                                                {openMenuId === task.id && (
                                                    <div className="absolute left-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-slate-100 z-10 text-sm font-bold">
                                                        <button onClick={() => handleStatusChange(task.id, 'in_progress')} className="w-full text-right p-3 hover:bg-slate-50 flex items-center gap-2"><PlayCircle className="w-4 h-4"/> در حال انجام</button>
                                                        <button onClick={() => handleStatusChange(task.id, 'done')} className="w-full text-right p-3 hover:bg-slate-50 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500"/> انجام شد</button>
                                                        <button onClick={() => handleStatusChange(task.id, 'dismissed')} className="w-full text-right p-3 hover:bg-slate-50 flex items-center gap-2 text-rose-500"><XCircle className="w-4 h-4"/> نادیده گرفتن</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {task.evidence.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <h4 className="text-xs font-bold text-slate-400 mb-2">شواهد</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {task.evidence.map((e, i) => {
                                                  if (e.type === 'link' && e.view) {
                                                    return (
                                                        <button key={i} onClick={() => onNavigate(e.view as View, e.value as string)} className="bg-slate-50 border border-slate-200/50 rounded-lg px-3 py-2 text-xs flex items-center gap-2 hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                                                            <span className="font-bold text-indigo-700">{e.label}</span>
                                                            <ExternalLink className="w-3 h-3 text-indigo-500" />
                                                        </button>
                                                    );
                                                  }
                                                  return (
                                                    <div key={i} className="bg-slate-50 border border-slate-200/50 rounded-lg px-3 py-2 text-xs">
                                                        <span className="text-slate-500">{e.label}: </span>
                                                        <span className="font-bold text-slate-800">{e.value}</span>
                                                    </div>
                                                  );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            {currentUser && <AddTaskModal
                isOpen={isAddTaskModalOpen}
                onClose={() => setIsAddTaskModalOpen(false)}
                onSave={(taskData) => {
                    addManagerTask(taskData);
                    showToast('وظیفه جدید با موفقیت ایجاد شد.');
                    setIsAddTaskModalOpen(false);
                }}
                users={users}
                currentUser={currentUser}
            />}
        </div>
    );
};
