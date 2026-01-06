

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
import { useRestaurantStore } from '../../store/restaurantStore';
import { ModalProvider } from '../../contexts/ModalContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../services/supabase';

const AppLogic: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { settings, inventory, navigationIntent, setNavigationIntent, initState } = useRestaurantStore();
  const { showToast } = useToast();
  
  const [currentView, setCurrentView] = React.useState<View>('dashboard');
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [, forceRerender] = React.useState(0);
  
  const [isStoreReady, setIsStoreReady] = React.useState(false);

  useEffect(() => {
    const hydrateStoreFromSupabase = async () => {
        setIsStoreReady(false);
        try {
            // RLS policies should handle filtering by user_id
            const [
                inventory, menu, sales, expenses, suppliers, shifts, customers,
                prepTasks, purchaseInvoices, auditLogs, managerTasks, settings, transactions
            ] = await Promise.all([
                supabase.from('inventory').select('*'),
                supabase.from('menu').select('*'),
                supabase.from('sales').select('*'),
                supabase.from('expenses').select('*'),
                supabase.from('suppliers').select('*'),
                supabase.from('shifts').select('*'),
                supabase.from('customers').select('*'),
                supabase.from('prep_tasks').select('*'),
                supabase.from('purchase_invoices').select('*'),
                supabase.from('audit_logs').select('*'),
                supabase.from('manager_tasks').select('*'),
                supabase.from('settings').select('*').single(),
                supabase.from('transactions').select('*'),
            ]);
            
            // Check for errors and initialize state
            // A simple error check for one of the queries
            if (inventory.error) throw inventory.error;
            
            const loadedState = {
                inventory: inventory.data || [],
                menu: menu.data || [],
                sales: sales.data || [],
                expenses: expenses.data || [],
                suppliers: suppliers.data || [],
                shifts: shifts.data || [],
                customers: customers.data || [],
                prepTasks: prepTasks.data || [],
                purchaseInvoices: purchaseInvoices.data || [],
                auditLogs: auditLogs.data || [],
                managerTasks: managerTasks.data || [],
                settings: settings.data,
                transactions: transactions.data || [],
            };
            
            initState(loadedState);
            showToast("اطلاعات با موفقیت از سرور بارگذاری شد.", "success");

        } catch (error: any) {
            console.error("Failed to hydrate store from Supabase:", error);
            showToast(`خطا در بارگذاری اطلاعات: ${error.message}`, "error");
        } finally {
            setIsStoreReady(true);
        }
    };

    if (currentUser) {
        hydrateStoreFromSupabase();
    } else {
        // If user logs out, we are ready with the default (empty) store state
        setIsStoreReady(true);
    }
}, [currentUser, initState, showToast]);


  React.useEffect(() => {
    if (isStoreReady && currentUser?.role === 'manager') {
        const onboardingComplete = localStorage.getItem('foodyar_onboarding_complete');
        // A simple check if the business is new (no inventory)
        if (!onboardingComplete && inventory.length === 0) {
            setShowOnboarding(true);
        }
    }
  }, [currentUser, inventory, isStoreReady]);

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

  if (authLoading || (!isStoreReady && currentUser)) {
    return (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-100">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="mt-4 text-slate-500 font-bold">در حال بارگذاری...</p>
        </div>
    );
  }

  if (!currentUser) {
    return <AuthView />;
  }
  
  // NOTE: Subscription logic is now managed by your backend/database.
  // This is a placeholder check.
  const isSubValid = true; // Assume valid if logged in for now.

  if (!isSubValid) {
      return (
        <div className="w-full h-screen flex items-center justify-center p-8 bg-slate-100">
          <EmptyState
            icon={<ShieldOff className="w-12 h-12" />}
            title="اشتراک شما معتبر نیست"
            description="لطفا برای بررسی وضعیت اشتراک با مدیر سیستم تماس بگیرید."
          />
        </div>
      );
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
