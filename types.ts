// NOTE: For all financial values (prices, costs, etc.), the `number` type represents
// the raw amount in the base currency (e.g., Toman). Calculations should be handled
// with care to avoid floating-point inaccuracies. Use utility functions where possible.

export interface PurchaseHistory {
  date: number;
  quantity: number;
  costPerUnit: number;
}

export interface Ingredient {
  id: string;
  name: string;
  purchaseUnit?: string; // e.g., 'Box', 'Kg'. The unit in which the item is bought.
  usageUnit: string; // e.g., 'Can', 'Gram'. The unit used in recipes.
  conversionRate?: number; // How many usageUnits are in one purchaseUnit. Defaults to 1.
  currentStock: number; // Stored in the smallest unit (usageUnit) for precision.
  costPerUnit: number; // Cost of ONE purchaseUnit.
  minThreshold: number; // Low stock alert level, in usageUnit.
  supplierId?: string; // Link to specific supplier
  purchaseHistory: PurchaseHistory[]; // For calculating weighed average cost
  isDeleted?: boolean;
  customUnitConversions?: Record<string, { toUnit: string, factor: number }>;
}

export interface Supplier {
  id: string;
  name: string;
  category: string; // e.g. Butcher, Grocery
  phoneNumber: string;
  isDeleted?: boolean;
}

export type Unit = 'kg' | 'gram' | 'mg' | 'liter' | 'ml' | 'cc' | 'number' | 'pack' | 'can' | 'portion' | 'slice' | 'carton' | 'bucket' | 'tin' | 'bag' | 'box';
export const ALL_UNITS: Unit[] = ['kg', 'gram', 'mg', 'liter', 'ml', 'cc', 'number', 'pack', 'can', 'portion', 'slice', 'carton', 'bucket', 'tin', 'bag', 'box'];

const unitMap: Record<string, string> = {
  // Mass
  'kg': 'kg', 'کیلوگرم': 'kg', 'کیلو': 'kg',
  'gram': 'gram', 'g': 'gram', 'gr': 'gram', 'گرم': 'gram',
  'mg': 'mg', 'میلی گرم': 'mg',

  // Volume
  'liter': 'liter', 'لیتر': 'liter', 'l': 'liter',
  'ml': 'ml', 'میلی لیتر': 'ml',
  'cc': 'cc', 'سی سی': 'cc',

  // Pieces
  'number': 'number', 'عدد': 'number', 'pcs': 'number', 'piece': 'number',
  'pack': 'pack', 'بسته': 'pack', 'پک': 'pack',
  'can': 'can', 'قوطی': 'can', 'کنسرو': 'can',
  'portion': 'portion', 'پرس': 'portion',
  'slice': 'slice', 'ورقه': 'slice', 'اسلایس': 'slice',

  // Custom Local Units
  'carton': 'carton', 'کارتن': 'carton',
  'bucket': 'bucket', 'سطل': 'bucket',
  'tin': 'tin', 'حلب': 'tin',
  'bag': 'bag', 'کیسه': 'bag',
  'box': 'box', 'جعبه': 'box',
};

export const normalizeUnit = (rawUnit: string): string => {
    if (!rawUnit) return '';
    const cleanedUnit = rawUnit.toLowerCase().trim().replace(/\s+/g, ' ');
    return unitMap[cleanedUnit] || cleanedUnit; // Return cleaned unit if no match
};

export const getConversionFactor = (
    fromUnit: string,
    toUnit: string,
    context?: { customUnitConversions?: Record<string, { toUnit: string; factor: number; }> }
): number | null => {
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);

    if (from === to) return 1;

    // Standard conversions
    const conversions: Record<string, Record<string, number>> = {
      'kg': { 'gram': 1000, 'mg': 1000000 },
      'gram': { 'kg': 0.001, 'mg': 1000 },
      'mg': { 'gram': 0.001, 'kg': 0.000001 },
      'liter': { 'ml': 1000, 'cc': 1000 },
      'ml': { 'liter': 0.001, 'cc': 1 },
      'cc': { 'liter': 0.001, 'ml': 1 },
    };
    
    if (conversions[from] && conversions[from][to]) {
        return conversions[from][to];
    }
    
    if (conversions[to] && conversions[to][from]) {
        return 1 / conversions[to][from];
    }

    // Check for custom conversions from context (e.g., an Ingredient object)
    if (context?.customUnitConversions) {
        // Case 1: fromUnit is custom (e.g., 'carton' -> 'kg')
        const customConversion = context.customUnitConversions[from];
        if (customConversion) {
            // Direct custom conversion match: carton -> kg, and we want kg
            if (customConversion.toUnit === to) {
                return customConversion.factor;
            }
            // Chained conversion: carton -> gram (via carton -> kg -> gram)
            const intermediateFactor = getConversionFactor(customConversion.toUnit, to);
            if (intermediateFactor !== null) {
                return customConversion.factor * intermediateFactor;
            }
        }

        // Case 2: toUnit is custom (e.g. converting from 'kg' -> 'carton')
        const inverseCustomConversion = context.customUnitConversions[to];
        if (inverseCustomConversion) {
            // Direct inverse: kg -> carton, where custom mapping is carton -> kg
            if (inverseCustomConversion.toUnit === from) {
                return 1 / inverseCustomConversion.factor;
            }
            // Chained inverse: gram -> carton (via gram -> kg -> carton)
            const intermediateFactor = getConversionFactor(from, inverseCustomConversion.toUnit);
            if (intermediateFactor !== null) {
                return (1 / inverseCustomConversion.factor) * intermediateFactor;
            }
        }
    }

    return null; // Return null if not convertible
};


export interface RecipeIngredient {
  ingredientId: string;
  amount: number;
  unit: string; 
  source?: 'inventory' | 'prep';
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number; // Selling price
  recipe: RecipeIngredient[];
  imageUrl?: string;
  isDeleted?: boolean;
}

export interface SaleItem {
  menuItemId: string;
  quantity: number;
  priceAtSale: number;
  costAtSale: number; // Calculated COGS at moment of sale
}

export type PaymentMethod = 'cash' | 'card' | 'online' | 'void';

export interface Sale {
  id: string;
  invoiceNumber: string; // Sequential, human-readable invoice number e.g., FYR-2024-0001
  timestamp: number; // Represents payment/closing time
  items: SaleItem[];
  totalAmount: number;
  totalCost: number; // Total COGS
  tax?: number;      
  discount?: number; 
  paymentMethod?: PaymentMethod; 
  shiftId?: string;
  tableNumber?: string;
  status?: 'pending' | 'preparing' | 'ready' | 'delivered';
  customerId?: string;
  customerPhoneNumber?: string;
  operatorId: string; // ID of the user (cashier/server) who made the sale
  operatorName: string; // Name of the user for quick display
  isDeleted?: boolean;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'rent' | 'salary' | 'utilities' | 'marketing' | 'maintenance' | 'other';
  date: number;
  description?: string;
}

export interface WasteRecord {
  id: string;
  itemId: string; // Can be ingredientId or prepTaskId
  itemName: string;
  itemSource: 'inventory' | 'prep';
  amount: number;
  unit: string;
  costLoss: number;
  reason: string;
  date: number;
}

export interface Shift {
  id: string;
  startTime: number;
  endTime?: number;
  startingCash: number;
  expectedCashSales?: number;
  actualCashSales?: number;
  cardSales?: number;
  onlineSales?: number;
  bankDeposit?: number;
  discrepancy?: number;
  status: 'open' | 'closed';
  operatorName?: string;
}

export interface AIReport {
  type: 'financial' | 'inventory' | 'waste' | 'recipe';
  content: string;
  timestamp: number;
}

export interface GeneratedRecipe {
  name: string;
  description: string;
  category: string;
  suggestedPrice: number;
  ingredients: {
    ingredientId: string;
    amount: number;
    unit: string;
    name: string;
  }[];
  reasoning: string;
}

export interface PrepTask {
  id: string;
  item: string;
  station: string;
  parLevel: number;
  onHand: number;
  unit: string;
  recipe?: RecipeIngredient[];
  batchSize?: number;
  costPerUnit?: number;
}

// FIX: Add OperationalForecast types to resolve import errors.
export interface OperationalForecastTask {
  prepTaskId: string;
  prepTaskName: string;
  quantityToPrep: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface OperationalForecast {
  forecastDate: number;
  summary: string;
  tasks: OperationalForecastTask[];
}

export interface PurchaseInvoice {
  id: string;
  supplierId?: string;
  invoiceNumber?: string;
  invoiceDate: number;
  totalAmount: number;
  status: 'paid' | 'unpaid';
  items: {
    name: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
  }[];
}

export interface ProcessedInvoiceItem {
    name: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    isNew: boolean;
    matchedId?: string;
}


export interface AuditLog {
  id: string;
  timestamp: number;
  userId: string | null;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'WASTE' | 'SHIFT_CLOSE' | 'INVOICE_ADD' | 'TRANSACTION';
  entity: 'MENU' | 'INVENTORY' | 'EXPENSE' | 'SHIFT' | 'USER' | 'INVOICE' | 'PREP' | 'ACTION_CENTER' | 'DATA_HEALTH' | 'SALE';
  entityId: string | null;
  details: string;
  before: any | null;
  after: any | null;
}


// --- Unified AI Contract ---
export type AIFeatureType = 'PROCUREMENT' | 'MARGIN' | 'ALERTS';
export type AIConfidence = 'LOW' | 'MED' | 'HIGH';
export type AIActionType = 'BUY' | 'PRICE_CHANGE' | 'PREP_CHANGE' | 'INVESTIGATE';
export type AITargetType = 'INGREDIENT' | 'MENU_ITEM' | 'GENERAL';

export interface AIInsight {
  id: string;
  title: string;
  detail: string;
  severity?: 'LOW' | 'MED' | 'HIGH';
  createdAt: number;
}

export interface AIAction {
  id: string;
  actionType: AIActionType;
  targetType: AITargetType;
  targetId: string;
  targetName: string; // e.g., "Beef" or "Hamburger"
  recommendedValue?: number | string;
  unit?: string;
  rationale: string;
  expectedImpact?: string;
  confidence: AIConfidence;
  createdAt: number;
  supplierId?: string;
}

export interface AIRun {
  id: string;
  featureType: AIFeatureType;
  model: string;
  promptVersion: number;
  contextHash: string;
  dataWindow: { start: number, end: number };
  insights: AIInsight[];
  actions: AIAction[];
  validation: {
      isValid: boolean;
      errors?: string[];
  };
  createdAt: number;
}
// --- End Unified AI Contract ---

// --- Action Center Types ---
export type ManagerTaskCategory = 'sales' | 'inventory' | 'procurement' | 'staff' | 'quality' | 'finance' | 'other';
export type ManagerTaskPriority = 'low' | 'medium' | 'high';
export type ManagerTaskStatus = 'open' | 'in_progress' | 'done' | 'dismissed';
export type ManagerTaskSource = 'manual' | 'rule' | 'ai' | 'copilot';

export interface ManagerTaskEvidenceItem {
  type: 'metric' | 'link' | 'text';
  label: string;
  value: string | number;
  view?: View; // Optional: for creating links to other views
}

export interface ManagerTask {
  id: string;
  title: string;
  description: string;
  category: ManagerTaskCategory;
  priority: ManagerTaskPriority;
  status: ManagerTaskStatus;
  dueAt: number | null;
  createdAt: number;
  updatedAt: number;
  createdByUserId: string | null;
  assignedToUserId: string | null;
  source: ManagerTaskSource;
  evidence: ManagerTaskEvidenceItem[];
}
// --- End Action Center Types ---

// --- Data Health Types ---
export interface HealthIssue {
  id: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  entityType: 'MENU' | 'INVENTORY' | 'PREP';
  entityId: string;
  entityName: string;
  suggestedFix: string;
}
// --- End Data Health Types ---

// --- Daily Brief Types ---
export interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  category: ManagerTaskCategory;
  priority: ManagerTaskPriority;
  evidence: ManagerTaskEvidenceItem[];
}
export interface BriefAnomaly {
    id: string;
    type: 'sales_drop' | 'high_waste';
    description: string;
}
export interface DailyBrief {
    date: number;
    salesTodayTotal: number;
    salesTodayCount: number;
    grossProfitEstimateToday: number;
    grossMarginToday: number;
    grossMarginLast7Days: number;
    topProfitItemLast7Days: { item: MenuItem; profit: number } | null;
    wasteLossLast7Days: number;
    lowStockItems: Ingredient[];
    topSellingItemsToday: { item: MenuItem; quantity: number }[];
    anomalies: BriefAnomaly[];
    recommendedActions: RecommendedAction[];
}
// --- End Daily Brief Types ---

// --- Manager Copilot Types ---
export interface CopilotTask {
    title: string;
    description: string;
    category: ManagerTaskCategory;
    priority: ManagerTaskPriority;
    dueInHours?: number | null;
    evidence: ManagerTaskEvidenceItem[];
}
export interface ManagerCopilotResponse {
    answerText: string;
    tasks: CopilotTask[];
    questionsToAsk: string[];
}
// --- End Manager Copilot Types ---


export type UserRole = 'manager' | 'cashier' | 'chef' | 'server';

export type View = 'dashboard' | 'inventory' | 'menu' | 'pos' | 'ai-assistant' | 'reports' | 'procurement' | 'kitchen-prep' | 'users' | 'profile' | 'customers' | 'settings' | 'action-center' | 'data-health' | 'daily-brief' | 'audit-log';

export interface User {
  id: string;
  username: string; // Phone number is the unique ID
  password: string; // In real app use hash, for MVP use plain text
  fullName: string;
  role: 'manager' | 'cashier' | 'chef' | 'server';
  permissions: View[]; // Array of allowed views e.g., ['pos', 'menu']
  isActive: boolean; // Admin can ban users
  createdAt: number;
  isDeleted?: boolean;
}

export const PERMISSIONS_LIST: {id: View, label: string}[] = [
   { id: 'dashboard', label: 'داشبورد مدیریت' },
   { id: 'daily-brief', label: 'خلاصه روزانه' },
   { id: 'pos', label: 'صندوق فروش' },
   { id: 'reports', label: 'گزارشات مالی' },
   { id: 'action-center', label: 'مرکز عملیات' },
   { id: 'inventory', label: 'انبارداری' },
   { id: 'menu', label: 'مدیریت منو' },
   { id: 'customers', label: 'باشگاه مشتریان' },
   { id: 'users', label: 'مدیریت کاربران' },
   { id: 'kitchen-prep', label: 'مانیتور آشپزخانه' },
   { id: 'procurement', label: 'خرید و تدارکات' },
   { id: 'ai-assistant', label: 'هوش مصنوعی' },
   { id: 'data-health', label: 'سلامت داده‌ها' },
   { id: 'audit-log', label: 'گزارش رویدادها'},
   { id: 'settings', label: 'تنظیمات' },
   { id: 'profile', label: 'پروفایل کاربری' },
];

export type CustomerSegment = 'vip' | 'loyal' | 'new' | 'slipping' | 'churned';

export interface Customer {
  id: string;
  phoneNumber: string;
  fullName?: string; // Optional
  birthDate?: number; // Optional timestamp
  
  // RFM & Stats
  totalVisits: number;
  totalSpent: number;
  lastVisit: number; // timestamp
  averageOrderValue: number;
  
  // Loyalty
  loyaltyPoints: number;
  walletBalance: number;
  
  // Intelligence
  favoriteItems: { itemId: string; count: number }[]; // To track preferences
  segment: CustomerSegment;
  isDeleted?: boolean;
}

export type SubscriptionTier = 'free_trial' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionPlan = 'basic' | 'pro' | 'enterprise';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  startDate: number;
  expiryDate: number;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  planType: SubscriptionPlan;
  status: 'success' | 'failed' | 'pending';
  refId?: string; // Fake bank reference ID
  date: number;
}

export interface InsufficientItem {
    id: string;
    name: string;
    required: number;
    available: number;
    unit: string;
    source: 'inventory' | 'prep';
}

export type StockDeductionPolicy = 'ALLOW_NEGATIVE' | 'BLOCK_SALE_IF_INSUFFICIENT' | 'ALLOW_BUT_REQUIRE_CONFIRMATION';

export interface LoyaltySettings {
    enabled: boolean;
    programType: 'points' | 'cashback';
    cashbackPercentage: number; // e.g., 5 for 5%
    pointsRate: number; // e.g., 1000 Toman for 1 point
    minRedeemAmount: number; // Minimum purchase amount to be eligible for redemption
}

export interface SystemSettings {
  taxRate: number; // e.g., 9 for 9% VAT
  currencyUnit: string; // 'Toman'
  restaurantName: string;
  address: string;
  phoneNumber: string;
  subscription?: SubscriptionStatus; // Make it optional for backward compatibility
  stockDeductionPolicy?: StockDeductionPolicy;
  loyaltySettings?: LoyaltySettings;
}

export interface BackupData {
    schemaVersion: 2;
    exportedAt: string;
    data: {
        inventory?: Ingredient[];
        menu?: MenuItem[];
        sales?: Sale[];
        expenses?: Expense[];
        suppliers?: Supplier[];
        purchaseInvoices?: PurchaseInvoice[];
        managerTasks?: ManagerTask[];
        prepTasks?: PrepTask[];
        shifts?: Shift[];
        wasteRecords?: WasteRecord[];
        auditLogs?: AuditLog[];
        settings?: SystemSettings;
        customers?: Customer[];
        transactions?: Transaction[];
        invoiceCounter?: number;
    }
}