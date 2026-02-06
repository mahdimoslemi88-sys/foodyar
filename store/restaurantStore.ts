import { create } from 'zustand';
import type { SetStateAction } from 'react';
import {
  Ingredient, MenuItem, Sale, Expense, Supplier, WasteRecord, Shift, PrepTask,
  PurchaseInvoice, AuditLog, AIRun, SaleItem, Customer, SystemSettings, User, 
  Transaction, PaymentMethod, ManagerTask, ManagerTaskStatus,
  BackupData, View, ManagerTaskCategory, ManagerTaskPriority, ManagerTaskSource, InsufficientItem
} from '../types';
import * as defaultData from '../services/defaultData';
import * as gemini from '../services/geminiService';
import { calculateRecipeCost } from '../domain/pricing';
import { nextInvoiceNumber } from '../domain/invoicing';
import { calculateDeductions, checkStockAvailability } from '../domain/inventory';
import { determineCustomerSegment } from '../domain/customer';

// Define the shape of the state and actions
export interface RestaurantState {
  inventory: Ingredient[];
  menu: MenuItem[];
  sales: Sale[];
  expenses: Expense[];
  suppliers: Supplier[];
  wasteRecords: WasteRecord[];
  shifts: Shift[];
  prepTasks: PrepTask[];
  purchaseInvoices: PurchaseInvoice[];
  auditLogs: AuditLog[];
  customers: Customer[];
  managerTasks: ManagerTask[];
  invoiceCounter: number;
  settings: SystemSettings;
  transactions: Transaction[];
  menuAnalysisRun: AIRun | null;
  procurementRun: AIRun | null;
  operationalForecast: any | null; // This was not in scope for refactoring
  navigationIntent: { view: View; entityId?: string } | null;
}

export interface RestaurantActions {
  setInventory: (updater: SetStateAction<Ingredient[]>) => void;
  setMenu: (updater: SetStateAction<MenuItem[]>) => void;
  setSales: (updater: SetStateAction<Sale[]>) => void;
  setExpenses: (updater: SetStateAction<Expense[]>) => void;
  setSuppliers: (updater: SetStateAction<Supplier[]>) => void;
  setWasteRecords: (updater: SetStateAction<WasteRecord[]>) => void;
  setShifts: (updater: SetStateAction<Shift[]>) => void;
  setPrepTasks: (updater: SetStateAction<PrepTask[]>) => void;
  setPurchaseInvoices: (updater: SetStateAction<PurchaseInvoice[]>) => void;
  setAuditLogs: (updater: SetStateAction<AuditLog[]>) => void;
  setCustomers: (updater: SetStateAction<Customer[]>) => void;
  setManagerTasks: (updater: SetStateAction<ManagerTask[]>) => void;
  setSettings: (updater: SetStateAction<SystemSettings>) => void;
  addTransaction: (transaction: Transaction) => void;
  addAuditLog: (action: AuditLog['action'], entity: AuditLog['entity'], details: string) => void;
  addAuditLogDetailed: (action: AuditLog['action'], entity: AuditLog['entity'], entityId: string | null, before: any | null, after: any | null, details: string, user?: { id: string, fullName: string } | null) => void;
  resetData: () => void;
  generateMenuAnalysis: () => Promise<void>;
  generateProcurementForecast: () => Promise<void>;
  generateOperationalForecast: () => Promise<void>;
  clearMenuAnalysis: () => void;
  checkStockForSale: (cart: {item: MenuItem, quantity: number}[]) => { status: 'OK' | 'BLOCKED' | 'NEEDS_CONFIRMATION', insufficientItems: InsufficientItem[] };
  processTransaction: (cart: {item: MenuItem, quantity: number}[], paymentDetails: { operator: User, method: PaymentMethod, discount: number, tax: number, shiftId?: string, customerPhoneNumber?: string, pointsUsed?: number }) => { newSale: Sale, inventoryShortage: boolean; prepShortage: boolean; };
  startShift: (startingCash: number, operator: User) => void;
  closeShift: (shiftId: string, actualCash: number, bankDeposit: number) => void;
  // Action Center Actions
  addManagerTask: (taskDraft: Omit<ManagerTask, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateManagerTask: (taskId: string, updates: Partial<ManagerTask>) => void;
  generateTasksFromRules: () => void;
  // Backup & Restore
  restoreState: (data: Partial<BackupData['data']>) => void;
  // Navigation
  setNavigationIntent: (view: View, entityId?: string) => void;
  clearNavigationIntent: () => void;
  // Hydration
  initState: (persistedState: Partial<RestaurantState>) => void;
}

type RestaurantStore = RestaurantState & RestaurantActions;

export const useRestaurantStore = create<RestaurantStore>()(
  (set, get) => ({
    // Default State
    inventory: defaultData.inventory,
    menu: defaultData.menu,
    sales: defaultData.sales,
    expenses: defaultData.expenses,
    suppliers: defaultData.suppliers,
    wasteRecords: defaultData.waste,
    shifts: defaultData.shifts,
    prepTasks: defaultData.prepTasks,
    purchaseInvoices: defaultData.purchaseInvoices,
    auditLogs: defaultData.auditLogs,
    customers: defaultData.customers,
    managerTasks: defaultData.managerTasks,
    invoiceCounter: defaultData.sales.length,
    settings: {
      taxRate: 0,
      currencyUnit: 'تومان',
      restaurantName: 'فودیار',
      address: '',
      phoneNumber: '',
      subscription: {
          tier: 'free_trial',
          startDate: 0,
          expiryDate: 0,
          isActive: false
      },
      stockDeductionPolicy: 'ALLOW_NEGATIVE',
    },
    transactions: [],
    menuAnalysisRun: null,
    procurementRun: null,
    operationalForecast: null,
    navigationIntent: null,

    // --- ACTIONS ---
    initState: (persistedState) => set(persistedState),

    // Simple Setters
    setInventory: (updater) => set(state => ({ inventory: typeof updater === 'function' ? updater(state.inventory) : updater })),
    setMenu: (updater) => set(state => ({ menu: typeof updater === 'function' ? updater(state.menu) : updater })),
    setSales: (updater) => set(state => ({ sales: typeof updater === 'function' ? updater(state.sales) : updater })),
    setExpenses: (updater) => set(state => ({ expenses: typeof updater === 'function' ? updater(state.expenses) : updater })),
    setSuppliers: (updater) => set(state => ({ suppliers: typeof updater === 'function' ? updater(state.suppliers) : updater })),
    setWasteRecords: (updater) => set(state => ({ wasteRecords: typeof updater === 'function' ? updater(state.wasteRecords) : updater })),
    setShifts: (updater) => set(state => ({ shifts: typeof updater === 'function' ? updater(state.shifts) : updater })),
    setPrepTasks: (updater) => set(state => ({ prepTasks: typeof updater === 'function' ? updater(state.prepTasks) : updater })),
    setPurchaseInvoices: (updater) => set(state => ({ purchaseInvoices: typeof updater === 'function' ? updater(state.purchaseInvoices) : updater })),
    setAuditLogs: (updater) => set(state => ({ auditLogs: typeof updater === 'function' ? updater(state.auditLogs) : updater })),
    setCustomers: (updater) => set(state => ({ customers: typeof updater === 'function' ? updater(state.customers) : updater })),
    setManagerTasks: (updater) => set(state => ({ managerTasks: typeof updater === 'function' ? updater(state.managerTasks) : updater })),
    setSettings: (updater) => set(state => ({ settings: typeof updater === 'function' ? updater(state.settings) : updater })),
    addTransaction: (transaction) => set(state => ({ transactions: [transaction, ...state.transactions] })),

    addAuditLogDetailed: (action, entity, entityId, before, after, details, user) => {
      const logEntry: AuditLog = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        userId: user?.id ?? null,
        userName: user?.fullName ?? 'سیستم',
        action,
        entity,
        entityId,
        before,
        after,
        details,
      };
      set(state => ({ auditLogs: [logEntry, ...state.auditLogs] }));
    },

    addAuditLog: (action, entity, details) => {
      get().addAuditLogDetailed(action, entity, null, null, null, details, null);
    },

    resetData: () => {
        const defaultState = {
            inventory: defaultData.inventory,
            menu: defaultData.menu,
            sales: defaultData.sales,
            expenses: defaultData.expenses,
            suppliers: defaultData.suppliers,
            wasteRecords: defaultData.waste,
            shifts: defaultData.shifts,
            prepTasks: defaultData.prepTasks,
            purchaseInvoices: defaultData.purchaseInvoices,
            auditLogs: defaultData.auditLogs,
            managerTasks: defaultData.managerTasks,
            menuAnalysisRun: null,
            procurementRun: null,
            operationalForecast: null,
            customers: [],
            invoiceCounter: defaultData.sales.length,
        };
        set(defaultState);
        get().addAuditLog('DELETE', 'DATA_HEALTH', 'All application data has been reset.');
    },
    
    // AI Actions
    generateMenuAnalysis: async () => {
      const { menu, sales, inventory, prepTasks } = get();
      const result = await gemini.generateMenuEngineeringAnalysis(menu, sales, inventory, prepTasks);
      if (result) set({ menuAnalysisRun: result });
    },
    clearMenuAnalysis: () => set({ menuAnalysisRun: null }),
    generateProcurementForecast: async () => {
      const { sales, inventory, suppliers } = get();
      const result = await gemini.generateProcurementForecast(sales, inventory, suppliers);
      if (result) set({ procurementRun: result });
    },
    generateOperationalForecast: async () => {
      const { sales, prepTasks } = get();
      const result = await gemini.generateOperationalForecast(sales, prepTasks);
      if (result) set({ operationalForecast: result });
    },
    startShift: (startingCash, operator) => {
        const { shifts, addAuditLogDetailed } = get();
        if (shifts.some(s => s.status === 'open')) {
            throw new Error('یک شیفت باز در حال حاضر وجود دارد. ابتدا آن را ببندید.');
        }
        const newShift: Shift = {
            id: crypto.randomUUID(),
            startTime: Date.now(),
            startingCash: startingCash,
            status: 'open',
            operatorName: operator.fullName,
        };
        set(state => ({ shifts: [newShift, ...state.shifts] }));
        addAuditLogDetailed('CREATE', 'SHIFT', newShift.id, null, newShift, `Shift started with starting cash ${startingCash}`, operator);
    },
    closeShift: (shiftId, actualCash, bankDeposit) => {
        const { shifts, sales, addAuditLogDetailed } = get();
        const shiftToClose = shifts.find(s => s.id === shiftId && s.status === 'open');
        if (!shiftToClose) {
            throw new Error('شیفت باز برای بستن یافت نشد.');
        }

        const totals = sales.reduce((acc, s) => {
            if (s.shiftId === shiftToClose.id) {
                if (s.paymentMethod === 'cash') acc.cash += s.totalAmount;
                else if (s.paymentMethod === 'card') acc.card += s.totalAmount;
                else if (s.paymentMethod === 'online') acc.online += s.totalAmount;
            }
            return acc;
        }, { cash: 0, card: 0, online: 0 });
        
        const expectedCashInDrawer = shiftToClose.startingCash + totals.cash;
        const discrepancy = actualCash - expectedCashInDrawer;

        const closedShift: Shift = {
            ...shiftToClose,
            endTime: Date.now(),
            actualCashSales: actualCash,
            expectedCashSales: expectedCashInDrawer,
            cardSales: totals.card,
            onlineSales: totals.online,
            bankDeposit: bankDeposit,
            discrepancy: discrepancy,
            status: 'closed'
        };
        
        set(state => ({ shifts: state.shifts.map(s => s.id === shiftId ? closedShift : s) }));
        addAuditLogDetailed('SHIFT_CLOSE', 'SHIFT', shiftId, shiftToClose, closedShift, `Shift closed. Discrepancy: ${discrepancy}`, null);
    },
    checkStockForSale: (cart) => {
      const { inventory, prepTasks, settings } = get();
      const policy = settings.stockDeductionPolicy || 'ALLOW_NEGATIVE';
      if (policy === 'ALLOW_NEGATIVE') {
          return { status: 'OK', insufficientItems: [] };
      }

      const { inventoryDeductions, prepDeductions } = calculateDeductions(cart, inventory, prepTasks);
      const { insufficientItems } = checkStockAvailability(inventory, prepTasks, inventoryDeductions, prepDeductions);
      
      if (insufficientItems.length > 0) {
          if (policy === 'BLOCK_SALE_IF_INSUFFICIENT') {
              return { status: 'BLOCKED', insufficientItems };
          }
          if (policy === 'ALLOW_BUT_REQUIRE_CONFIRMATION') {
              return { status: 'NEEDS_CONFIRMATION', insufficientItems };
          }
      }
      
      return { status: 'OK', insufficientItems: [] };
    },
     // --- Action Center Actions ---
    addManagerTask: (taskDraft: Omit<ManagerTask, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
      const { addAuditLog } = get();
      const now = Date.now();
      const newTask: ManagerTask = {
        ...taskDraft,
        id: crypto.randomUUID(),
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };
      set(state => ({ managerTasks: [newTask, ...state.managerTasks] }));
      addAuditLog('CREATE', 'ACTION_CENTER', `Task created: ${newTask.title}`);
    },

    updateManagerTask: (taskId, updates) => {
      const { addAuditLog } = get();
      set(state => ({
        managerTasks: state.managerTasks.map(task => 
          task.id === taskId ? { ...task, ...updates, updatedAt: Date.now() } : task
        ),
      }));
      if(updates.status) {
        const task = get().managerTasks.find(t => t.id === taskId);
        addAuditLog('UPDATE', 'ACTION_CENTER', `Task status changed: "${task?.title}" to ${updates.status}`);
      }
    },

    generateTasksFromRules: () => {
        const { menu, inventory, sales, managerTasks, addManagerTask } = get();
        const openTasks = managerTasks.filter(t => t.status === 'open' || t.status === 'in_progress');
        const openTaskTitles = new Set(openTasks.map(t => t.title));
        let newTasksCreated = 0;

        const createTaskIfNotExists = (title: string, taskDraft: Omit<ManagerTask, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'title'>) => {
            if (!openTaskTitles.has(title)) {
                addManagerTask({ ...taskDraft, title });
                openTaskTitles.add(title);
                newTasksCreated++;
            }
        };

        // Rule 1: Menu items without recipes
        const itemsNeedingRecipe = menu.filter(item => !item.isDeleted && (!item.recipe || item.recipe.length === 0));
        if (itemsNeedingRecipe.length > 0) {
            createTaskIfNotExists('تکمیل فرمولاسیون آیتم‌های منو', {
                description: `${itemsNeedingRecipe.length} آیتم در منو فاقد دستور تهیه هستند. برای محاسبه دقیق بهای تمام شده و مدیریت انبار، آن‌ها را تکمیل کنید.`,
                category: 'quality', priority: 'high', dueAt: null,
                createdByUserId: 'system', assignedToUserId: null, source: 'rule',
                evidence: itemsNeedingRecipe.map(item => ({
                    type: 'link', label: item.name, value: item.id, view: 'menu'
                }))
            });
        }

        // Rule 2: Ingredients below minThreshold
        const lowStockItems = inventory.filter(item => !item.isDeleted && item.currentStock <= item.minThreshold && item.minThreshold > 0);
        lowStockItems.forEach(item => {
            createTaskIfNotExists(`موجودی کم: ${item.name}`, {
                description: `موجودی کالای "${item.name}" به کمتر از حد آستانه (${item.minThreshold} ${item.usageUnit}) رسیده است.`,
                category: 'inventory', priority: 'medium', dueAt: null,
                createdByUserId: 'system', assignedToUserId: null, source: 'rule',
                evidence: [
                    { type: 'metric', label: 'موجودی فعلی', value: `${item.currentStock} ${item.usageUnit}` },
                    { type: 'metric', label: 'حد آستانه', value: `${item.minThreshold} ${item.usageUnit}` },
                    { type: 'link', label: 'مشاهده در انبار', value: item.id, view: 'inventory' }
                ]
            });
        });

        // Rule 3: Sales drop check
        const today = new Date().setHours(0, 0, 0, 0);
        const sevenDaysAgo = today - 7 * 24 * 60 * 60 * 1000;
        const salesToday = sales.filter(s => s.timestamp >= today).reduce((sum, s) => sum + s.totalAmount, 0);
        const recentSales = sales.filter(s => s.timestamp >= sevenDaysAgo && s.timestamp < today);
        if (recentSales.length > 3) { // Only run if there's enough data
            const averageDailySales = recentSales.reduce((sum, s) => sum + s.totalAmount, 0) / 7;
            if (salesToday > 0 && averageDailySales > 0 && salesToday < averageDailySales * 0.8) {
                createTaskIfNotExists('هشدار افت فروش', {
                    description: 'فروش امروز به طور قابل توجهی (بیش از 20%) کمتر از میانگین هفته گذشته بوده است. لطفا دلایل احتمالی را بررسی کنید.',
                    category: 'sales', priority: 'high', dueAt: null,
                    createdByUserId: 'system', assignedToUserId: null, source: 'rule',
                    evidence: [
                        { type: 'metric', label: 'فروش امروز', value: `${salesToday.toLocaleString()} تومان` },
                        { type: 'metric', label: 'میانگین ۷ روز اخیر', value: `${Math.round(averageDailySales).toLocaleString()} تومان` },
                    ]
                });
            }
        }
         return newTasksCreated;
    },
    // Complex Business Logic
    processTransaction: (cart, paymentDetails) => {
      const { inventory, prepTasks, customers, settings, addAuditLogDetailed } = get();

      const inventoryMap = new Map(inventory.map(i => [i.id, i]));
      const prepTasksMap = new Map(prepTasks.map(p => [p.id, p]));

      let subtotal = 0;
      const saleItems: SaleItem[] = cart.map(cartItem => {
          const itemCost = calculateRecipeCost(cartItem.item.recipe, inventoryMap, prepTasksMap);
          subtotal += cartItem.item.price * cartItem.quantity;
          return { menuItemId: cartItem.item.id, quantity: cartItem.quantity, priceAtSale: cartItem.item.price, costAtSale: itemCost };
      });

      const totalCost = saleItems.reduce((sum, item) => sum + (item.costAtSale * item.quantity), 0);
      const totalAmount = subtotal * (1 + (paymentDetails.tax || 0) / 100) - (paymentDetails.discount || 0);
      
      let customerId: string | undefined = undefined;
      
      // --- CUSTOMER LOGIC ---
      if (paymentDetails.customerPhoneNumber) {
          const phone = paymentDetails.customerPhoneNumber;
          // Optimization: Single pass find for customer
          let customer = customers.find(c => c.phoneNumber === phone);
          let isNewCustomer = false;

          if (!customer) {
              customer = {
                  id: crypto.randomUUID(), phoneNumber: phone, totalVisits: 0, totalSpent: 0, lastVisit: 0,
                  averageOrderValue: 0, loyaltyPoints: 0, walletBalance: 0, favoriteItems: [], segment: 'new',
              };
              isNewCustomer = true;
          }

          const updatedCustomer = { ...customer };
          // Standard customer stats update
          updatedCustomer.totalVisits += 1;
          updatedCustomer.totalSpent += totalAmount;
          updatedCustomer.lastVisit = Date.now();
          updatedCustomer.averageOrderValue = updatedCustomer.totalSpent / updatedCustomer.totalVisits;

          // --- MODULAR LOYALTY REWARD CALCULATION ---
          const loyaltySettings = settings.loyaltySettings;
          if (loyaltySettings && loyaltySettings.enabled) {
              const beforeLoyaltyState = { loyaltyPoints: updatedCustomer.loyaltyPoints, walletBalance: updatedCustomer.walletBalance };

              if (loyaltySettings.programType === 'cashback' && loyaltySettings.cashbackPercentage > 0) {
                  const cashbackEarned = Math.round(totalAmount * (loyaltySettings.cashbackPercentage / 100));
                  if (cashbackEarned > 0) {
                      updatedCustomer.walletBalance += cashbackEarned;
                      addAuditLogDetailed('UPDATE', 'CUSTOMER' as any, updatedCustomer.id,
                          { walletBalance: beforeLoyaltyState.walletBalance },
                          { walletBalance: updatedCustomer.walletBalance },
                          `${cashbackEarned.toLocaleString()} تومان اعتبار کش‌بک به کیف پول مشتری اضافه شد.`,
                          paymentDetails.operator
                      );
                  }
              } else if (loyaltySettings.programType === 'points' && loyaltySettings.pointsRate > 0) {
                  const pointsEarned = Math.floor(totalAmount / loyaltySettings.pointsRate);
                  const pointsUsed = paymentDetails.pointsUsed || 0;
                  
                  if (pointsEarned > 0 || pointsUsed > 0) {
                      updatedCustomer.loyaltyPoints = Math.max(0, updatedCustomer.loyaltyPoints + pointsEarned - pointsUsed);
                      let logDetails = '';
                      if (pointsEarned > 0) logDetails += `${pointsEarned} امتیاز کسب شد. `;
                      if (pointsUsed > 0) logDetails += `${pointsUsed} امتیاز استفاده شد.`;

                      addAuditLogDetailed('UPDATE', 'CUSTOMER' as any, updatedCustomer.id,
                          { loyaltyPoints: beforeLoyaltyState.loyaltyPoints },
                          { loyaltyPoints: updatedCustomer.loyaltyPoints },
                          logDetails.trim(),
                          paymentDetails.operator
                      );
                  }
              }
          }
          // --- END LOYALTY LOGIC ---
          
          // --- Favorite Items & Segmentation ---
          // Optimization: Use a Map for O(1) favorite items updates
          const favMap = new Map(updatedCustomer.favoriteItems.map(f => [f.itemId, f]));
          saleItems.forEach(saleItem => {
              const existing = favMap.get(saleItem.menuItemId);
              if (existing) {
                  existing.count += saleItem.quantity;
              } else {
                  favMap.set(saleItem.menuItemId, { itemId: saleItem.menuItemId, count: saleItem.quantity });
              }
          });
          updatedCustomer.favoriteItems = Array.from(favMap.values());
          updatedCustomer.segment = determineCustomerSegment(updatedCustomer);

          // --- Persist Customer Update ---
          if (isNewCustomer) {
              set(state => ({ customers: [...state.customers, updatedCustomer] }));
          } else {
              set(state => ({
                  customers: state.customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c)
              }));
          }
          
          customerId = updatedCustomer.id;
      }
      // --- END CUSTOMER LOGIC ---


      const newSale: Sale = {
          id: crypto.randomUUID(), invoiceNumber: nextInvoiceNumber(() => get().invoiceCounter, (newCounter) => set({ invoiceCounter: newCounter })),
          timestamp: Date.now(), items: saleItems, totalAmount: totalAmount, totalCost: totalCost, tax: paymentDetails.tax || 0, discount: paymentDetails.discount || 0,
          paymentMethod: paymentDetails.method, shiftId: paymentDetails.shiftId, status: 'delivered', customerId: customerId,
          customerPhoneNumber: paymentDetails.customerPhoneNumber, operatorId: paymentDetails.operator.id, operatorName: paymentDetails.operator.fullName,
      };

      try {
          // Optimization: Pass pre-indexed Maps to domain functions
          const { inventoryDeductions, prepDeductions } = calculateDeductions(cart, inventoryMap, prepTasksMap);

          if (settings.stockDeductionPolicy === 'BLOCK_SALE_IF_INSUFFICIENT') {
              const { insufficientItems } = checkStockAvailability(inventoryMap, prepTasksMap, inventoryDeductions, prepDeductions);
              if (insufficientItems.length > 0) {
                  const itemNames = insufficientItems.map(i => i.name).join(', ');
                  throw new Error(`فروش مسدود است. موجودی برای "${itemNames}" کافی نیست.`);
              }
          }
          
          let inventoryShortage = false;
          let prepShortage = false;
          const tasksToCreate: Omit<ManagerTask, 'id' | 'createdAt' | 'updatedAt' | 'status'>[] = [];
          const newLogs: AuditLog[] = [];

          const updatedInventory = get().inventory.map(item => {
              const deduction = inventoryDeductions.get(item.id);
              if (deduction) {
                  const newStock = item.currentStock - deduction;
                  if (newStock < 0) inventoryShortage = true;

                  newLogs.push({
                      id: crypto.randomUUID(), timestamp: Date.now(), userId: paymentDetails.operator.id, userName: paymentDetails.operator.fullName,
                      action: 'TRANSACTION', entity: 'INVENTORY', entityId: item.id,
                      before: { currentStock: item.currentStock }, after: { currentStock: newStock },
                      details: `کسر از موجودی به دلیل فروش فاکتور ${newSale.invoiceNumber}`
                  });
                  return { ...item, currentStock: newStock };
              }
              return item;
          });

          const updatedPrepTasks = get().prepTasks.map(task => {
              const deduction = prepDeductions.get(task.id);
              if (deduction) {
                  const newOnHand = task.onHand - deduction;
                  if (newOnHand < 0 && task.onHand >= 0) {
                      prepShortage = true;
                      
                      const affectingMenuItems = cart
                          .filter(cartItem => cartItem.item.recipe.some(r => r.ingredientId === task.id))
                          .map(cartItem => `${cartItem.item.name} (x${cartItem.quantity})`)
                          .join(', ');

                      tasksToCreate.push({
                          title: `کسری موجودی میزانپلاس: ${task.item}`,
                          description: `موجودی "${task.item}" به دلیل فروش "${affectingMenuItems}" منفی شد. لطفا تولید این آیتم را در اولویت قرار دهید.`,
                          category: 'inventory' as ManagerTaskCategory,
                          priority: 'high' as ManagerTaskPriority,
                          evidence: [
                              { type: 'metric', label: 'موجودی قبلی', value: `${task.onHand.toFixed(2)} ${task.unit}` },
                              { type: 'metric', label: 'موجودی جدید', value: `${newOnHand.toFixed(2)} ${task.unit}` },
                              { type: 'link', label: 'مشاهده آیتم', value: task.id, view: 'kitchen-prep' }
                          ],
                          source: 'rule' as ManagerTaskSource,
                          createdByUserId: 'system',
                          assignedToUserId: null,
                          dueAt: null
                      });
                  }
                  return { ...task, onHand: newOnHand };
              }
              return task;
          });
          
          set(state => ({
              sales: [newSale, ...state.sales],
              inventory: updatedInventory,
              prepTasks: updatedPrepTasks,
              auditLogs: [...newLogs, ...state.auditLogs]
          }));
          
          tasksToCreate.forEach(taskDraft => get().addManagerTask(taskDraft));

          get().addAuditLogDetailed('CREATE', 'SALE', newSale.id, null, newSale, `فاکتور ${newSale.invoiceNumber} ثبت شد.`, paymentDetails.operator);
          return { newSale, inventoryShortage, prepShortage };

      } catch (error: any) {
          console.error("Transaction failed during deduction calculation:", error.message);
          throw error;
      }
    },
    restoreState: (data: Partial<BackupData['data']>) => {
        set(state => ({ ...state, ...data }));
    },
    // Navigation Actions
    setNavigationIntent: (view, entityId) => set({ navigationIntent: { view, entityId } }),
    clearNavigationIntent: () => set({ navigationIntent: null }),
  })
);