import React, { useState, useEffect } from 'react';
import { PrepTask, OperationalForecast } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { ClipboardList, Flame, Snowflake, Search, Plus, CheckCircle2, UtensilsCrossed, Settings, Factory, ChevronDown, ListOrdered, Sparkles, Loader2, BarChart, Minus, AlertTriangle } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { PrepAddItemModal } from '../KitchenPrep/PrepAddItemModal';
import { PrepProductionModal } from '../KitchenPrep/PrepProductionModal';
import { PrepWasteModal } from '../KitchenPrep/PrepWasteModal';
import { PrepRecipeModal } from '../KitchenPrep/PrepRecipeModal';

export const KitchenPrepView: React.FC = () => {
  const { 
      prepTasks, setPrepTasks, 
      operationalForecast, generateOperationalForecast,
      navigationIntent, clearNavigationIntent
  } = useRestaurantStore();

  const [activeStation, setActiveStation] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<PrepTask | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);

  const stations = ['همه', 'گریل', 'سرد', 'سرخ کن', 'آماده‌سازی'];

  const filteredTasks = prepTasks.filter(task => {
    const matchesStation = activeStation === 'همه' || task.station === activeStation;
    const matchesSearch = task.item.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStation && matchesSearch;
  });
  
  const openModal = (modalType: 'recipe' | 'production' | 'waste' | 'add', task?: PrepTask) => {
      setSelectedTask(task || null);
      setActiveDropdown(null);
      if (modalType === 'recipe') setIsRecipeModalOpen(true);
      if (modalType === 'production') setIsProductionModalOpen(true);
      if (modalType === 'waste') setIsWasteModalOpen(true);
      if (modalType === 'add') setIsAddItemModalOpen(true);
  };
  
  useEffect(() => {
    if (navigationIntent?.view === 'kitchen-prep' && navigationIntent.entityId) {
      const taskToOpen = prepTasks.find(t => t.id === navigationIntent.entityId);
      if (taskToOpen) {
        // Use a timeout to ensure the view has rendered before opening the modal
        setTimeout(() => openModal('recipe', taskToOpen), 0);
      }
      clearNavigationIntent(); // Consume the intent
    }
  }, [navigationIntent, prepTasks, clearNavigationIntent]);

  const handleGenerateForecast = async () => {
      setIsForecasting(true);
      try {
          await generateOperationalForecast();
      } finally {
          setIsForecasting(false);
      }
  };

  const updateOnHand = (id: string, delta: number) => {
    setPrepTasks(prev => prev.map(task => 
        task.id === id ? { ...task, onHand: Math.max(0, task.onHand + delta) } : task
    ));
  };

  const getStationIcon = (station: string) => {
      if (station === 'گریل') return <Flame className="w-4 h-4" />;
      if (station === 'سرد') return <Snowflake className="w-4 h-4" />;
      return <UtensilsCrossed className="w-4 h-4" />;
  };

  const totalTasks = filteredTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((filteredTasks.filter(t => t.onHand >= t.parLevel).length / totalTasks) * 100) : 100;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 pt-24 pb-32 md:pb-8 md:pt-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
               <ClipboardList className="w-8 h-8 text-indigo-600" />
               مدیریت تولید و میزانپلاس
           </h2>
           <p className="text-slate-500 mt-1 font-medium text-sm">برنامه‌ریزی تولید مواد نیمه‌آماده و کنترل پار لول</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:flex-none md:w-72">
                <input 
                    type="text" 
                    placeholder="جستجو..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm font-bold"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
            <button
                onClick={() => openModal('add')}
                className="bg-indigo-600 text-white h-12 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all font-bold"
            >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">آیتم جدید</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <ListOrdered className="w-5 h-5 text-indigo-500"/>
                        برنامه کاری هوشمند
                    </h3>
                    <p className="text-sm text-slate-500">لیست آماده‌سازی اولویت‌بندی شده بر اساس پیش‌بینی فروش</p>
                </div>
                <button onClick={handleGenerateForecast} disabled={isForecasting} className="bg-slate-900 text-white px-5 py-3 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-slate-800 active:scale-95 transition-colors disabled:opacity-50 self-end md:self-center">
                    {isForecasting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                    {isForecasting ? 'در حال تحلیل...' : 'تولید برنامه کاری'}
                </button>
            </div>
            {operationalForecast && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in duration-300">
                    <p className="text-xs font-bold text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-100 mb-2">{operationalForecast.summary}</p>
                    {operationalForecast.tasks.map(task => (
                        <div key={task.prepTaskId} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-700">{task.prepTaskName}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 font-bold">تولید: {task.quantityToPrep}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    task.priority === 'high' ? 'bg-rose-100 text-rose-600' :
                                    task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                }`}>
                                    {task.priority === 'high' ? 'بالا' : task.priority === 'medium' ? 'متوسط' : 'پایین'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-[24px] shadow-xl shadow-slate-900/10 flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl -mr-16 -mt-16 opacity-30"></div>
               <div>
                   <h3 className="font-bold text-slate-200 mb-1 flex items-center gap-2"><BarChart className="w-4 h-4"/> آمادگی سرویس</h3>
                   <span className="text-4xl font-extrabold">{completionRate}%</span>
               </div>
               <div className="h-2 bg-slate-700 rounded-full overflow-hidden mt-4">
                   <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${completionRate}%` }}></div>
               </div>
          </div>
      </div>

      <div className="bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
            {stations.map(station => (
                <button
                key={station}
                onClick={() => setActiveStation(station)}
                className={`px-6 py-4 rounded-2xl text-sm font-bold whitespace-nowrap transition-all flex-1 md:flex-none ${
                    activeStation === station
                    ? 'bg-slate-100 text-slate-900 shadow-inner'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                >
                    {station}
                </button>
            ))}
      </div>

      {prepTasks.length === 0 ? (
           <div className="mt-8">
              <EmptyState
                  icon={<ClipboardList className="w-12 h-12" />}
                  title="هیچ آیتم آماده‌سازی تعریف نشده"
                  description="با تعریف آیتم‌های میزانپلاس مانند سس‌ها یا گوشت‌های مزه‌دار شده، به آشپزخانه خود نظم دهید."
                  action={{
                      label: 'افزودن آیتم آماده‌سازی',
                      onClick: () => openModal('add')
                  }}
              />
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTasks.map(task => {
                const progress = Math.min(100, (task.onHand / task.parLevel) * 100);
                const needed = Math.max(0, task.parLevel - task.onHand);
                
                return (
                    <div key={task.id} className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-slate-100 text-slate-600 border-slate-200 flex items-center gap-1">
                                        {getStationIcon(task.station)}
                                        {task.station}
                                    </span>
                                    {task.recipe && task.recipe.length > 0 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">
                                            <Factory className="w-3 h-3" />
                                            تولیدی
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg">{task.item}</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1">
                                    هزینه واحد: {task.costPerUnit ? task.costPerUnit.toLocaleString() : '-'} ت
                                </p>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${needed === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                {needed === 0 ? <CheckCircle2 className="w-5 h-5"/> : task.unit}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-xs font-bold text-slate-400">موجودی / هدف: {task.parLevel}</span>
                                    <span className={`text-sm font-black ${needed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {task.onHand} <span className="text-slate-400 font-medium">موجود</span>
                                    </span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${needed > 0 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200">
                                    <button onClick={() => updateOnHand(task.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-colors"><Minus className="w-4 h-4"/></button>
                                    <span className="w-10 text-center font-bold text-sm">{task.onHand}</span>
                                    <button onClick={() => updateOnHand(task.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-colors"><Plus className="w-4 h-4"/></button>
                                </div>

                                <button 
                                    onClick={() => openModal('production', task)} 
                                    disabled={!task.recipe || task.recipe.length === 0}
                                    className="flex-1 h-10 px-4 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Factory className="w-4 h-4" />
                                    تولید
                                </button>
                                
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDropdown(prev => prev === task.id ? null : task.id);
                                        }}
                                        className="h-10 w-10 flex items-center justify-center bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200"
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                    {activeDropdown === task.id && (
                                        <div 
                                            className="absolute left-0 bottom-12 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200"
                                            onMouseLeave={() => setActiveDropdown(null)}
                                        >
                                            <button onClick={() => openModal('recipe', task)} className="w-full text-right px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Settings className="w-4 h-4" /> ویرایش تولید</button>
                                            <button onClick={() => openModal('waste', task)} className="w-full text-right px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> ثبت ضایعات</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      <PrepAddItemModal isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} />
      <PrepProductionModal isOpen={isProductionModalOpen} onClose={() => setIsProductionModalOpen(false)} task={selectedTask} />
      <PrepWasteModal isOpen={isWasteModalOpen} onClose={() => setIsWasteModalOpen(false)} task={selectedTask} />
      <PrepRecipeModal isOpen={isRecipeModalOpen} onClose={() => setIsRecipeModalOpen(false)} task={selectedTask} />

    </div>
  );
};