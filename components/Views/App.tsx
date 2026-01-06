
import React, { useEffect, useState } from 'react';

// Layout and Auth Components
import { Layout } from './Layout';
import { AuthView } from './AuthView';

// Main View Components
import { UserManagementView } from './UserManagementView';
import { DashboardView } from './DashboardView';
import { InventoryView } from './InventoryView';
import { MenuView } from './MenuView';
import { POSView } from './POSView';
import { AIView } from './AIView';
import { ReportsView } from './ReportsView';
import { ProcurementView } from './ProcurementView';
import { KitchenPrepView } from './KitchenPrepView';
import { ProfileView } from './ProfileView';
import { CustomersView } from './CustomersView';
import { SettingsView } from './SettingsView';
import SubscriptionView from './SubscriptionView';
import { ActionCenterView } from './ActionCenterView';
import { DataHealthView } from './DataHealthView';
import { DailyBriefView } from './DailyBriefView';
import { AuditLogView } from './AuditLogView';


// Helper and Utility Components
import { OnboardingWizard } from '../OnboardingWizard';
import { EmptyState } from '../EmptyState';
import { Loader2, ShieldOff } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';

// Contexts, Store, Types and Repositories
import { View } from '../../types';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { useRestaurantStore, RestaurantState, RestaurantActions } from '../../store/restaurantStore';
import { ModalProvider } from '../../contexts/ModalContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { SupabaseAppRepository } from '../../repositories/supabaseAppRepository';

// سوئیچ به ریپازیتوری سوپابیس
const appRepository = new SupabaseAppRepository();

const AppLogic: React.FC = () => {
  const { currentUser, loading: authLoading, checkSystemStatus } = useAuth();
  const { settings, inventory, navigationIntent, setNavigationIntent } = useRestaurantStore();
  
  const [currentView, setCurrentView] = React.useState<View>('dashboard');
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [, forceRerender] = React.useState(0);
  
  const [isStoreReady, setIsStoreReady] = React.useState(false);

  useEffect(() => {
    const hydrateStore = async () => {
      const persistedState = await appRepository.load();
      if (persistedState) {
        useRestaurantStore.getState().initState(persistedState as any);
      }
      setIsStoreReady(true);
      
      const unsubscribe = useRestaurantStore.subscribe(
        (state: RestaurantState & RestaurantActions) => {
          const { initState, ...stateToSave } = state;
          appRepository.save(stateToSave);
        }
      );
      
      return () => unsubscribe();
    };
    
    hydrateStore();
  }, []);

  React.useEffect(() => {
    if (isStoreReady && currentUser?.role === 'manager') {
        const onboardingComplete = localStorage.getItem('foodyar_onboarding_complete');
        const isSubscribed = settings.subscription?.isActive && settings.subscription.expiryDate > Date.now();
        if (!onboardingComplete && inventory.length === 0 && isSubscribed) {
            setShowOnboarding(true);
        }
    }
  }, [currentUser, inventory, settings.subscription, isStoreReady]);

  React.useEffect(() => {
    if (currentUser && !navigationIntent) {
        const defaultView = currentUser.permissions.includes('dashboard') ? 'dashboard'
                          : currentUser.permissions.includes('pos') ? 'pos'
                          : currentUser.permissions.includes('kitchen-prep') ? 'kitchen-prep'
                          : currentUser.permissions[0] || 'profile';
        setCurrentView(defaultView);
    }
  }, [currentUser, navigationIntent]);

  React.useEffect(() => {
    if (navigationIntent) {
      setCurrentView(navigationIntent.view);
    }
  }, [navigationIntent]);
  
  const handleNavigate = (view: View, entityId?: string) => {
      setNavigationIntent(view, entityId);
  };

  if (!isStoreReady || authLoading) {
    return (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-100">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="mt-4 text-slate-500 font-bold">در حال اتصال به دیتابیس ابری...</p>
        </div>
    );
  }

  if (!currentUser) {
    const systemStatus = checkSystemStatus();
    return <AuthView systemStatus={systemStatus} />;
  }

  const isSubValid = settings.subscription?.isActive && settings.subscription.expiryDate > Date.now();

  if (!isSubValid) {
    if (currentUser.role === 'manager') {
      return <SubscriptionView onComplete={() => forceRerender(c => c + 1)} />;
    } else {
      return (
        <div className="w-full h-screen flex items-center justify-center p-8 bg-slate-100">
          <EmptyState
            icon={<ShieldOff className="w-12 h-12" />}
            title="اشتراک شما منقضی شده است"
            description="لطفا برای تمدید اشتراک با مدیر سیستم تماس بگیرید."
          />
        </div>
      );
    }
  }
  
  if (showOnboarding) {
      return (
          <OnboardingWizard onComplete={() => {
              localStorage.setItem('foodyar_onboarding_complete', 'true');
              setShowOnboarding(false);
          }} />
      );
  }
  
  const renderView = () => {
    const allowedViews = currentUser.permissions || [];
    
    if (!allowedViews.includes(currentView)) {
        const defaultView = allowedViews.includes('dashboard') ? 'dashboard' : allowedViews[0] || 'profile';
        if (currentView !== defaultView) {
            handleNavigate(defaultView);
        }
        return (
             <div className="h-full flex items-center justify-center p-8">
                <EmptyState
                    icon={<ShieldOff className="w-12 h-12" />}
                    title="دسترسی غیرمجاز"
                    description="شما مجوز لازم برای مشاهده این بخش را ندارید."
                />
            </div>
        );
    }

    switch (currentView) {
      case 'dashboard': return <DashboardView onNavigate={handleNavigate} />;
      case 'inventory': return <InventoryView />;
      case 'menu': return <MenuView />;
      case 'pos': return <POSView />;
      case 'ai-assistant': return <AIView />;
      case 'reports': return <ReportsView />;
      case 'procurement': return <ProcurementView />;
      case 'kitchen-prep': return <KitchenPrepView />;
      case 'customers': return <CustomersView />;
      case 'users': return <UserManagementView />;
      case 'profile': return <ProfileView />;
      case 'settings': return <SettingsView />;
      case 'action-center': return <ActionCenterView onNavigate={handleNavigate} />;
      case 'data-health': return <DataHealthView onNavigate={handleNavigate} />;
      case 'daily-brief': return <DailyBriefView onNavigate={handleNavigate} />;
      case 'audit-log': return <AuditLogView />;
      default:
        return null;
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={handleNavigate}>
      {renderView()}
    </Layout>
  );
};


const App: React.FC = () => (
  <AuthProvider>
    <ToastProvider>
      <ModalProvider>
        <ErrorBoundary>
          <AppLogic />
        </ErrorBoundary>
      </ModalProvider>
    </ToastProvider>
  </AuthProvider>
);

export default App;
