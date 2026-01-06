import { Ingredient, MenuItem, Sale, Expense, Supplier, WasteRecord, Shift, PrepTask, PurchaseInvoice, AuditLog, Customer, ManagerTask } from '../types';

const now = Date.now();

export const suppliers: Supplier[] = [
    { id: 'sup1', name: 'قصابی مرکزی', category: 'گوشت', phoneNumber: '09123456789' },
    { id: 'sup2', name: 'میدان تره بار', category: 'سبزیجات', phoneNumber: '09129876543' },
    { id: 'sup3', name: 'نان فانتزی نان آوران', category: 'نان', phoneNumber: '09121112233' },
    { id: 'sup4', name: 'لبنیات و مواد پروتئینی پگاه', category: 'لبنیات', phoneNumber: '09124445566' },
];

export const inventory: Ingredient[] = [
  { id: 'ing1', name: 'گوشت چرخ کرده گوساله', purchaseUnit: 'kg', usageUnit: 'gram', conversionRate: 1000, currentStock: 25000, costPerUnit: 450000, minThreshold: 10000, supplierId: 'sup1', purchaseHistory: [{ date: now, quantity: 25, costPerUnit: 450000 }] },
  { id: 'ing2', name: 'نان همبرگر', purchaseUnit: 'number', usageUnit: 'number', conversionRate: 1, currentStock: 100, costPerUnit: 8000, minThreshold: 40, supplierId: 'sup3', purchaseHistory: [{ date: now, quantity: 100, costPerUnit: 8000 }] },
  { id: 'ing3', name: 'پنیر ورقه‌ای گودا', purchaseUnit: 'pack', usageUnit: 'slice', conversionRate: 20, currentStock: 180, costPerUnit: 60000, minThreshold: 200, supplierId: 'sup4', purchaseHistory: [{ date: now, quantity: 30, costPerUnit: 60000 }] },
  { id: 'ing4', name: 'گوجه فرنگی', purchaseUnit: 'kg', usageUnit: 'gram', conversionRate: 1000, currentStock: 15000, costPerUnit: 25000, minThreshold: 5000, supplierId: 'sup2', purchaseHistory: [{ date: now, quantity: 15, costPerUnit: 25000 }] },
  { id: 'ing5', name: 'سیب زمینی', purchaseUnit: 'kg', usageUnit: 'gram', conversionRate: 1000, currentStock: 50000, costPerUnit: 18000, minThreshold: 20000, supplierId: 'sup2', purchaseHistory: [{ date: now, quantity: 50, costPerUnit: 18000 }] },
  { id: 'ing6', name: 'دانه قهوه اسپرسو', purchaseUnit: 'kg', usageUnit: 'gram', conversionRate: 1000, currentStock: 5000, costPerUnit: 900000, minThreshold: 2000, purchaseHistory: [{ date: now, quantity: 5, costPerUnit: 900000 }] },
  { id: 'ing7', name: 'شیر', purchaseUnit: 'liter', usageUnit: 'ml', conversionRate: 1000, currentStock: 10000, costPerUnit: 28000, minThreshold: 5000, supplierId: 'sup4', purchaseHistory: [{ date: now, quantity: 10, costPerUnit: 28000 }] },
  { id: 'ing8', name: 'سینه مرغ', purchaseUnit: 'kg', usageUnit: 'gram', conversionRate: 1000, currentStock: 20000, costPerUnit: 250000, minThreshold: 8000, supplierId: 'sup1', purchaseHistory: [{ date: now, quantity: 20, costPerUnit: 250000 }] },
  { id: 'ing9', name: 'کاهو', purchaseUnit: 'kg', usageUnit: 'gram', conversionRate: 1000, currentStock: 8000, costPerUnit: 20000, minThreshold: 3000, supplierId: 'sup2', purchaseHistory: [{ date: now, quantity: 8, costPerUnit: 20000 }] },
  { id: 'ing10', name: 'پیاز', purchaseUnit: 'kg', usageUnit: 'gram', conversionRate: 1000, currentStock: 12000, costPerUnit: 15000, minThreshold: 5000, supplierId: 'sup2', purchaseHistory: [{ date: now, quantity: 12, costPerUnit: 15000 }] },
  { id: 'ing11', name: 'روغن سرخ کردنی', purchaseUnit: 'liter', usageUnit: 'ml', conversionRate: 1000, currentStock: 18000, costPerUnit: 65000, minThreshold: 5000, purchaseHistory: [{ date: now, quantity: 18, costPerUnit: 65000 }] },
  { id: 'ing12', name: 'آرد سوخاری', purchaseUnit: 'kg', usageUnit: 'gram', conversionRate: 1000, currentStock: 5000, costPerUnit: 80000, minThreshold: 2000, purchaseHistory: [{ date: now, quantity: 5, costPerUnit: 80000 }] },
  { id: 'ing13', name: 'تخم مرغ', purchaseUnit: 'number', usageUnit: 'number', conversionRate: 1, currentStock: 60, costPerUnit: 2500, minThreshold: 30, supplierId: 'sup4', purchaseHistory: [{ date: now, quantity: 60, costPerUnit: 2500 }] },
  { id: 'ing14', name: 'خیارشور', purchaseUnit: 'kg', usageUnit: 'gram', conversionRate: 1000, currentStock: 7000, costPerUnit: 70000, minThreshold: 2000, purchaseHistory: [{ date: now, quantity: 7, costPerUnit: 70000 }] },
];

export const prepTasks: PrepTask[] = [
    { 
      id: 'prep1', 
      item: 'سس مخصوص', 
      station: 'سرد', 
      parLevel: 5, 
      onHand: 4, 
      unit: 'liter', 
      recipe: [
        { ingredientId: 'ing4', amount: 50, unit: 'gram' }, // گوجه
        { ingredientId: 'ing10', amount: 50, unit: 'gram' }, // پیاز
        { ingredientId: 'ing14', amount: 100, unit: 'gram' } // خیارشور
      ], 
      batchSize: 1, 
      costPerUnit: 50000 
    },
    {
      id: 'prep2',
      item: 'فیله مرغ سوخاری آماده',
      station: 'آماده‌سازی',
      parLevel: 5,
      onHand: 3,
      unit: 'kg',
      recipe: [
        { ingredientId: 'ing8', amount: 1, unit: 'kg' }, // سینه مرغ
        { ingredientId: 'ing12', amount: 200, unit: 'gram' }, // آرد سوخاری
        { ingredientId: 'ing13', amount: 2, unit: 'number' }, // تخم مرغ
      ],
      batchSize: 1,
      costPerUnit: 300000
    }
];

export const menu: MenuItem[] = [
  { id: 'menu1', name: 'همبرگر کلاسیک', category: 'غذا', price: 285000, recipe: [
    { ingredientId: 'ing1', amount: 150, unit: 'gram', source: 'inventory' }, // گوشت
    { ingredientId: 'ing2', amount: 1, unit: 'number', source: 'inventory' }, // نان
    { ingredientId: 'ing4', amount: 20, unit: 'gram', source: 'inventory' }, // گوجه
    { ingredientId: 'ing9', amount: 30, unit: 'gram', source: 'inventory' }, // کاهو
    { ingredientId: 'ing14', amount: 25, unit: 'gram', source: 'inventory' },// خیارشور
    { ingredientId: 'prep1', amount: 30, unit: 'ml', source: 'prep' },       // سس مخصوص
  ]},
  { id: 'menu2', name: 'چیزبرگر', category: 'غذا', price: 315000, recipe: [
    { ingredientId: 'ing1', amount: 150, unit: 'gram', source: 'inventory' }, // گوشت
    { ingredientId: 'ing2', amount: 1, unit: 'number', source: 'inventory' }, // نان
    { ingredientId: 'ing3', amount: 1, unit: 'slice', source: 'inventory' },  // پنیر (1 slice)
    { ingredientId: 'ing9', amount: 30, unit: 'gram', source: 'inventory' },  // کاهو
    { ingredientId: 'prep1', amount: 30, unit: 'ml', source: 'prep' },        // سس مخصوص
  ]},
  { id: 'menu3', name: 'ساندویچ مرغ سوخاری', category: 'غذا', price: 265000, recipe: [
    { ingredientId: 'prep2', amount: 150, unit: 'gram', source: 'prep' }, // فیله مرغ
    { ingredientId: 'ing2', amount: 1, unit: 'number', source: 'inventory' }, // نان
    { ingredientId: 'ing9', amount: 40, unit: 'gram', source: 'inventory' }, // کاهو
    { ingredientId: 'ing14', amount: 30, unit: 'gram', source: 'inventory' },// خیارشور
  ]},
  { id: 'menu4', name: 'سیب زمینی سرخ کرده', category: 'پیش‌غذا', price: 95000, recipe: [
    { ingredientId: 'ing5', amount: 300, unit: 'gram', source: 'inventory' }, // سیب زمینی
    { ingredientId: 'ing11', amount: 50, unit: 'ml', source: 'inventory' },   // روغن
  ]},
  { id: 'menu5', name: 'لاته', category: 'نوشیدنی', price: 85000, recipe: [
    { ingredientId: 'ing6', amount: 18, unit: 'gram', source: 'inventory' }, // قهوه
    { ingredientId: 'ing7', amount: 200, unit: 'ml', source: 'inventory' },   // شیر
  ]},
];

export const sales: Sale[] = [
  { 
    id: 'sale1', 
    invoiceNumber: 'FYR-2024-0001',
    operatorId: 'admin-user',
    operatorName: 'Admin',
    timestamp: Date.now() - 86400000, 
    items: [{ menuItemId: 'menu1', quantity: 2, priceAtSale: 285000, costAtSale: 135000 }, { menuItemId: 'menu4', quantity: 1, priceAtSale: 95000, costAtSale: 15000 }], 
    totalAmount: 665000, 
    totalCost: 285000, 
    paymentMethod: 'card' 
  },
  { 
    id: 'sale2', 
    invoiceNumber: 'FYR-2024-0002',
    operatorId: 'admin-user',
    operatorName: 'Admin',
    timestamp: Date.now() - 43200000, 
    items: [{ menuItemId: 'menu2', quantity: 1, priceAtSale: 315000, costAtSale: 150000 }, { menuItemId: 'menu4', quantity: 1, priceAtSale: 95000, costAtSale: 15000 }], 
    totalAmount: 410000, 
    totalCost: 165000, 
    paymentMethod: 'cash' 
  },
  { 
    id: 'sale3', 
    invoiceNumber: 'FYR-2024-0003',
    operatorId: 'admin-user',
    operatorName: 'Admin',
    timestamp: Date.now() - 21600000, 
    items: [{ menuItemId: 'menu3', quantity: 2, priceAtSale: 265000, costAtSale: 120000 }, { menuItemId: 'menu5', quantity: 2, priceAtSale: 85000, costAtSale: 40000 }], 
    totalAmount: 700000, 
    totalCost: 320000, 
    paymentMethod: 'card' 
  },
];

export const expenses: Expense[] = [
  { id: 'exp1', title: 'اجاره ماهانه', amount: 20000000, category: 'rent', date: Date.now() - 604800000 },
  { id: 'exp2', title: 'حقوق پرسنل', amount: 15000000, category: 'salary', date: Date.now() - 86400000 },
];

export const waste: WasteRecord[] = [
    { id: 'waste1', itemId: 'ing4', itemName: 'گوجه فرنگی', itemSource: 'inventory', amount: 1, unit: 'kg', costLoss: 25000, reason: 'خرابی', date: Date.now() - 172800000 }
];

export const shifts: Shift[] = [
    { id: 'shift1', startTime: Date.now() - 86400000, endTime: Date.now() - 57600000, startingCash: 500000, actualCashSales: 1250000, expectedCashSales: 1255000, cardSales: 3400000, onlineSales: 850000, bankDeposit: 1200000, discrepancy: -5000, status: 'closed' }
];

export const purchaseInvoices: PurchaseInvoice[] = [];

export const auditLogs: AuditLog[] = [];

export const customers: Customer[] = [];

export const managerTasks: ManagerTask[] = [];