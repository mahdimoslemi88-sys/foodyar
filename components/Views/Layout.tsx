import React, { useState } from 'react';
import { LayoutDashboard, ShoppingBasket, ChefHat, Store, Menu as MenuIcon, ClipboardList, Bot, Sparkles, LogOut, Users, User as UserIcon, Heart, Settings, BarChart3, Truck, MoreHorizontal, X, ListChecks, HeartPulse, Sunrise, History } from 'lucide-react';
import { View } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import * as features from '../../config/features';

interface LayoutProps {
  currentView: View;
  onChangeView: (view: View) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, children }) => {
  const { currentUser, logout } = useAuth();
  const [isMorePanelOpen, setIsMorePanelOpen] = useState(false);

  if (!currentUser) return null;
  
  const allNavItems = [
    { id: 'daily-brief', label: 'خلاصه روزانه', icon: Sunrise },
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'action-center', label: 'مرکز عملیات', icon: ListChecks },
    { id: 'pos', label: 'صندوق', icon: Store },
    { id: 'kitchen-prep', label: 'میزانپلاس', icon: ClipboardList, enabled: features.enableKitchenPrep },
    { id: 'inventory', label: 'انبار', icon: ShoppingBasket },
    { id: 'procurement', label: 'تدارکات', icon: Truck, enabled: features.enableProcurement },
    { id: 'menu', label: 'منو', icon: MenuIcon },
    { id: 'reports', label: 'گزارشات', icon: BarChart3 },
    { id: 'customers', label: 'مشتریان', icon: Heart, enabled: features.enableCRM },
    { id: 'ai-assistant', label: 'هوش مصنوعی', icon: Bot, enabled: features.enableAI },
    { id: 'data-health', label: 'سلامت داده‌ها', icon: HeartPulse },
    { id: 'audit-log', label: 'گزارش رویدادها', icon: History },
    { id: 'users', label: 'کاربران', icon: Users, enabled: features.enableUsers },
    { id: 'settings', label: 'تنظیمات', icon: Settings },
  ];
  
  const allowedViews = currentUser.permissions || [];
  const navItems = allNavItems.filter(item => 
    (item.enabled === undefined || item.enabled === true) && allowedViews.includes(item.id as View)
  );

  const mainMobileNavIds: View[] = ['dashboard', 'pos', 'inventory', 'reports'];
  const mainMobileNavItems = navItems.filter(item => mainMobileNavIds.includes(item.id as View));
  const moreNavItems = navItems.filter(item => !mainMobileNavIds.includes(item.id as View));

  const handleMoreItemClick = (view: View) => {
    onChangeView(view);
    setIsMorePanelOpen(false);
  };
  
  return (
    <div className="flex h-[100dvh] bg-[#F5F5F7] font-['Vazirmatn'] overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* --- Desktop Sidebar --- */}
      <aside className="w-64 hidden md:flex flex-col z-30 m-6 mr-0">
        <div className="px-6 pb-8 pt-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-300/50">
                <ChefHat className="w-5 h-5" />
             </div>
             <div>
                <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">Foodyar 2</h1>
                <span className="text-[10px] font-bold text-slate-400">Restaurant OS</span>
             </div>
          </div>
        </div>

        <div className="px-4 mb-6">
            <button onClick={() => onChangeView('profile')} className="w-full bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 hover:shadow-md hover:border-indigo-100 active:scale-95 transition-all text-right">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white shrink-0 ${currentUser.role === 'manager' ? 'bg-indigo-500' : currentUser.role === 'chef' ? 'bg-orange-500' : currentUser.role === 'cashier' ? 'bg-emerald-500' : 'bg-slate-500'}`}>
                    {currentUser.fullName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <p className="font-bold text-slate-800 text-sm truncate">{currentUser.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-bold truncate">{currentUser.username}</p>
                </div>
            </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button key={item.id} onClick={() => onChangeView(item.id as View)} className={`group flex items-center w-full px-4 py-3.5 rounded-2xl transition-all duration-300 active:scale-95 ${isActive ? 'bg-white text-slate-900 shadow-sm font-bold scale-[1.02]' : 'text-slate-500 hover:bg-white/40 hover:text-slate-700 font-medium'}`}>
                <item.icon className={`w-5 h-5 ml-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={isActive ? 2.5 : 2}/>
                <span className="text-sm">{item.label}</span>
                {isActive && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-indigo-600"></div>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* --- Mobile Top Bar --- */}
      <div className="md:hidden fixed top-0 w-full bg-[#F5F5F7]/80 backdrop-blur-xl z-40 px-5 py-3 flex justify-between items-center border-b border-white/50">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white"><ChefHat className="w-4 h-4" /></div>
            <span className="font-black text-lg text-slate-800">Foodyar 2</span>
         </div>
         <div className="flex items-center gap-3">
             {features.enableAI && allowedViews.includes('ai-assistant') && (
                <button onClick={() => onChangeView('ai-assistant')} title="دستیار هوشمند" className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-sm border border-indigo-100 active:scale-95 transition-transform"><Sparkles className="w-5 h-5" /></button>
             )}
             <button onClick={() => onChangeView('profile')} title="پروفایل کاربری" className="w-9 h-9 rounded-full bg-white text-slate-600 flex items-center justify-center shadow-sm border border-slate-100 active:scale-95 transition-transform"><UserIcon className="w-4 h-4" /></button>
         </div>
      </div>

      {/* --- Mobile Bottom Nav --- */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-slate-100/80 backdrop-blur-xl border-t border-white/50">
        <nav className="flex justify-around items-start p-2">
           {mainMobileNavItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                 <button key={item.id} onClick={() => onChangeView(item.id as View)} className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 rounded-2xl transition-all duration-300 active:scale-95 ${isActive ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
                    <item.icon className={`w-6 h-6 mb-1 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    <span className="text-[10px] font-bold">{item.label}</span>
                 </button>
              );
           })}
            <button onClick={() => setIsMorePanelOpen(true)} className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 rounded-2xl transition-all duration-300 active:scale-95 ${isMorePanelOpen ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
              <MoreHorizontal className={`w-6 h-6 mb-1 ${isMorePanelOpen ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] font-bold">بیشتر</span>
            </button>
        </nav>
      </div>

      {/* --- Mobile More Panel --- */}
      {isMorePanelOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60]" onClick={() => setIsMorePanelOpen(false)}>
          <div className="absolute bottom-0 inset-x-0 bg-slate-50 rounded-t-[32px] p-4 pb-24 animate-in slide-in-from-bottom-5 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            <div className="grid grid-cols-4 gap-2">
              {moreNavItems.map(item => (
                <button key={item.id} onClick={() => handleMoreItemClick(item.id as View)} className="flex flex-col items-center justify-center text-center p-3 rounded-2xl hover:bg-white active:scale-95">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-500 border border-slate-100 shadow-sm mb-2"><item.icon className="w-6 h-6" /></div>
                  <span className="text-xs font-bold text-slate-600">{item.label}</span>
                </button>
              ))}
              <button onClick={() => { logout(); setIsMorePanelOpen(false); }} className="flex flex-col items-center justify-center text-center p-3 rounded-2xl hover:bg-white active:scale-95">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-rose-500 border border-slate-100 shadow-sm mb-2"><LogOut className="w-6 h-6" /></div>
                <span className="text-xs font-bold text-rose-500">خروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Main Content --- */}
      <main className="flex-1 h-full relative overflow-hidden bg-[#F5F5F7] md:bg-[#F5F5F7] md:rounded-l-[40px] md:my-4 md:mr-4 md:shadow-inner md:border md:border-white/50">
        {features.enableAI && allowedViews.includes('ai-assistant') && (
            <button onClick={() => onChangeView('ai-assistant')} title="دستیار هوشمند AssistChef" className="hidden md:flex absolute top-6 left-6 w-14 h-14 bg-slate-900 text-white rounded-full items-center justify-center shadow-2xl shadow-slate-900/20 z-40 hover:scale-110 hover:shadow-slate-900/30 active:scale-95 transition-all group">
                <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            </button>
        )}
        {children}
      </main>
    </div>
  );
};