import { DailyBrief, Ingredient, MenuItem, Sale, RecommendedAction, BriefAnomaly, WasteRecord, PrepTask } from '../types';
import { calculateRecipeCost } from '../domain/pricing';

type RestaurantState = {
    sales: Sale[];
    inventory: Ingredient[];
    menu: MenuItem[];
    wasteRecords: WasteRecord[];
    prepTasks: PrepTask[];
}

export const generateDailyBrief = (state: RestaurantState, targetDate: Date = new Date()): DailyBrief => {
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).getTime();
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).getTime();
    const sevenDaysAgo = startOfDay - 6 * 86400000; // Start of 7 days ago

    const salesToday = state.sales.filter(s => s.timestamp >= startOfDay && s.timestamp <= endOfDay);
    const salesLast7Days = state.sales.filter(s => s.timestamp >= sevenDaysAgo && s.timestamp <= endOfDay);
    const wasteLast7DaysRecords = state.wasteRecords.filter(w => w.date >= sevenDaysAgo && w.date <= endOfDay);

    // --- KPI Calculations ---
    const salesTodayTotal = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
    const cogsToday = salesToday.reduce((sum, s) => sum + s.totalCost, 0);
    const grossProfitEstimateToday = salesTodayTotal - cogsToday;
    const grossMarginToday = salesTodayTotal > 0 ? (grossProfitEstimateToday / salesTodayTotal) * 100 : 0;

    const sales7DaysTotal = salesLast7Days.reduce((sum, s) => sum + s.totalAmount, 0);
    const cogs7Days = salesLast7Days.reduce((sum, s) => sum + s.totalCost, 0);
    const grossProfit7Days = sales7DaysTotal - cogs7Days;
    const grossMarginLast7Days = sales7DaysTotal > 0 ? (grossProfit7Days / sales7DaysTotal) * 100 : 0;
    
    const wasteLossLast7Days = wasteLast7DaysRecords.reduce((sum, w) => sum + w.costLoss, 0);

    const menuMap = new Map(state.menu.map(m => [m.id, m]));

    const itemProfits: Record<string, number> = {};
    salesLast7Days.forEach(sale => {
        sale.items.forEach(item => {
            const menuItem = menuMap.get(item.menuItemId);
            if (menuItem) {
                // Using costAtSale for historical accuracy if available, otherwise recalculate
                const profitPerItem = item.priceAtSale - item.costAtSale;
                itemProfits[item.menuItemId] = (itemProfits[item.menuItemId] || 0) + (profitPerItem * item.quantity);
            }
        });
    });

    const topProfitEntry = Object.entries(itemProfits).sort((a, b) => b[1] - a[1])[0];
    const topProfitItemLast7Days = topProfitEntry && topProfitEntry[1] > 0 ? {
        item: menuMap.get(topProfitEntry[0])!,
        profit: topProfitEntry[1]
    } : null;

    // 2. Inventory
    const lowStockItems = state.inventory
        .filter(i => !i.isDeleted && i.minThreshold > 0 && i.currentStock <= i.minThreshold)
        .sort((a,b) => (a.currentStock/a.minThreshold) - (b.currentStock/b.minThreshold)) // sort by severity
        .slice(0, 5);

    // 3. Top Selling Items
    const itemSalesCount: Record<string, number> = {};
    salesToday.forEach(sale => {
        sale.items.forEach(item => {
            itemSalesCount[item.menuItemId] = (itemSalesCount[item.menuItemId] || 0) + item.quantity;
        });
    });

    const topSellingItemsToday = Object.entries(itemSalesCount)
        .map(([menuItemId, quantity]) => ({
            item: menuMap.get(menuItemId)!,
            quantity
        }))
        .filter(i => i.item)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
        
    // 4. Anomalies
    const anomalies: BriefAnomaly[] = [];
    const yesterdayStart = startOfDay - 86400000;
    const yesterdayEnd = endOfDay - 86400000;
    const salesYesterday = state.sales.filter(s => s.timestamp >= yesterdayStart && s.timestamp <= yesterdayEnd);
    const salesYesterdayTotal = salesYesterday.reduce((sum, s) => sum + s.totalAmount, 0);
    if (salesTodayTotal > 0 && salesYesterdayTotal > 0 && salesTodayTotal < salesYesterdayTotal * 0.75) {
        anomalies.push({
            id: 'sales-drop',
            type: 'sales_drop',
            description: `فروش امروز (${salesTodayTotal.toLocaleString()} تومان) به طور قابل توجهی کمتر از روز گذشته (${salesYesterdayTotal.toLocaleString()} تومان) بوده است.`
        });
    }

    // 5. Recommended Actions
    const recommendedActions: RecommendedAction[] = [];

     // New Commercial KPIs Recommendations
    if (salesLast7Days.length > 5 && grossMarginLast7Days < 45) {
        recommendedActions.push({
            id: 'action-low-margin',
            title: 'بررسی حاشیه سود',
            description: `حاشیه سود ناخالص هفت روز گذشته (${grossMarginLast7Days.toFixed(0)}%) پایین است. هزینه‌های تمام شده آیتم‌های منو را بازبینی کنید.`,
            category: 'finance', priority: 'high',
            evidence: [{ type: 'link', label: 'رفتن به مدیریت منو', value: 'menu', view: 'menu' }]
        });
    }
    if (topProfitItemLast7Days) {
        recommendedActions.push({
            id: 'action-top-profit',
            title: `قهرمان سودآوری: ${topProfitItemLast7Days.item.name}`,
            description: `آیتم "${topProfitItemLast7Days.item.name}" سودآورترین محصول شما در هفته گذشته بوده است. آن را در منو برجسته کرده یا به مشتریان پیشنهاد دهید.`,
            category: 'sales', priority: 'medium',
            evidence: [{ type: 'link', label: 'مشاهده آیتم در منو', value: topProfitItemLast7Days.item.id, view: 'menu' }]
        });
    }
    if (wasteLossLast7Days > 200000) {
        recommendedActions.push({
            id: 'action-high-waste',
            title: 'کاهش ضایعات',
            description: `میزان ضایعات ثبت شده در هفته گذشته (${wasteLossLast7Days.toLocaleString()} تومان) بالاست. موجودی کالاهای با مصرف کم را بررسی کنید.`,
            category: 'inventory', priority: 'medium',
            evidence: [{ type: 'link', label: 'بررسی انبار', value: 'inventory', view: 'inventory' }]
        });
    }
    
    // Existing Recommendations
    if (lowStockItems.length > 0) {
        recommendedActions.push({
            id: 'action-low-stock',
            title: 'بررسی و سفارش کالاهای رو به اتمام',
            description: `${lowStockItems.length} کالا در انبار به زیر حد آستانه رسیده‌اند. برای جلوگیری از کمبود، لیست خرید را آماده کنید.`,
            category: 'inventory',
            priority: 'high',
            evidence: lowStockItems.map(i => ({ type: 'link', label: i.name, value: i.id, view: 'inventory' }))
        });
    }
     if (topSellingItemsToday.length > 0) {
         const topItem = topSellingItemsToday[0];
         const prepItemsForTopSeller = topItem.item.recipe.filter(r => r.source === 'prep');
         if(prepItemsForTopSeller.length > 0) {
             recommendedActions.push({
                id: 'action-prep-for-top-seller',
                title: `آماده‌سازی برای آیتم پرفروش: ${topItem.item.name}`,
                description: `با توجه به فروش بالای "${topItem.item.name}"، از کافی بودن موجودی آیتم‌های آماده‌سازی (Mise en place) مربوط به آن اطمینان حاصل کنید.`,
                category: 'quality',
                priority: 'medium',
                evidence: [{ type: 'link', label: 'مشاهده آیتم', value: topItem.item.id, view: 'menu' }]
            });
         }
     }
     if (anomalies.some(a => a.type === 'sales_drop')) {
         recommendedActions.push({
            id: 'action-sales-drop',
            title: 'بررسی دلیل افت فروش',
            description: 'فروش امروز به طور قابل توجهی نسبت به روز گذشته کاهش داشته است. دلایل احتمالی مانند مشکلات کیفی، بازاریابی یا رویدادهای خارجی را بررسی کنید.',
            category: 'sales',
            priority: 'high',
            evidence: []
         });
     }

    return {
        date: startOfDay,
        salesTodayTotal,
        salesTodayCount: salesToday.length,
        grossProfitEstimateToday,
        grossMarginToday,
        grossMarginLast7Days,
        topProfitItemLast7Days,
        wasteLossLast7Days,
        lowStockItems,
        topSellingItemsToday,
        anomalies,
        recommendedActions,
    };
};