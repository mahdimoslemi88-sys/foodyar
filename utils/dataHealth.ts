import { 
  MenuItem, 
  Ingredient, 
  PrepTask,
  RecipeIngredient,
  getConversionFactor,
  HealthIssue,
} from '../types';

// The state type from zustand is complex, we redefine a simpler one for this utility.
type RestaurantState = {
    menu: MenuItem[];
    inventory: Ingredient[];
    prepTasks: PrepTask[];
}

type CheckFunction = (state: RestaurantState) => HealthIssue[];

// Rule 1: Menu items without recipes
const checkMenuItemsWithoutRecipe: CheckFunction = (state) => {
  const issues: HealthIssue[] = [];
  state.menu.forEach(item => {
    if (!item.isDeleted && (!item.recipe || item.recipe.length === 0)) {
      issues.push({
        id: `menu-no-recipe-${item.id}`,
        severity: 'high',
        title: 'آیتم منو بدون فرمولاسیون',
        description: `آیتم "${item.name}" فاقد دستور پخت است که برای محاسبه بهای تمام شده و مدیریت انبار ضروری است.`,
        entityType: 'MENU',
        entityId: item.id,
        entityName: item.name,
        suggestedFix: 'به بخش مدیریت منو رفته و برای این آیتم یک دستور پخت تعریف کنید.'
      });
    }
  });
  return issues;
};

// Rule 2, 3, and new Prep Task rules: Check for invalid IDs and incompatible units in recipes
const checkRecipeIntegrity: CheckFunction = (state) => {
    const issues: HealthIssue[] = [];
    const allIngredients = new Map(state.inventory.map(i => [i.id, i]));
    const allPrepTasks = new Map(state.prepTasks.map(p => [p.id, p]));
  
    const checkRecipe = (recipe: RecipeIngredient[], parentEntity: MenuItem | PrepTask, parentType: 'MENU' | 'PREP') => {
      const parentName = parentType === 'MENU' ? (parentEntity as MenuItem).name : (parentEntity as PrepTask).item;

      recipe.forEach(ri => {
        
        // --- Check ingredients sourced from PREP tasks ---
        if (ri.source === 'prep') {
            const prepItem = allPrepTasks.get(ri.ingredientId);

            // Reference Integrity Check
            if (!prepItem) {
                issues.push({
                    id: `recipe-invalid-prep-${parentEntity.id}-${ri.ingredientId}`,
                    severity: 'high',
                    title: 'آیتم آماده‌سازی نامعتبر در دستور پخت',
                    description: `دستور پخت آیتم "${parentName}" به یک آیتم آماده‌سازی (Mise en place) اشاره دارد که حذف شده یا وجود ندارد.`,
                    entityType: parentType,
                    entityId: parentEntity.id,
                    entityName: parentName,
                    suggestedFix: 'دستور پخت آیتم را ویرایش کرده و آیتم آماده‌سازی نامعتبر را حذف یا با یک مورد موجود جایگزین کنید.'
                });
                return; // Skip further checks
            }
            
            // Unit Consistency Check
            const factor = getConversionFactor(ri.unit, prepItem.unit);
            if (factor === null) {
                issues.push({
                    id: `recipe-incompatible-prep-unit-${parentEntity.id}-${ri.ingredientId}`,
                    severity: 'high',
                    title: 'ناسازگاری واحد رسپی و آماده‌سازی',
                    description: `در دستور پخت آیتم "${parentName}"، واحد مصرف "${ri.unit}" برای آیتم آماده‌سازی "${prepItem.item}" با واحد پایه آن ("${prepItem.unit}") قابل تبدیل نیست.`,
                    entityType: parentType,
                    entityId: parentEntity.id,
                    entityName: parentName,
                    suggestedFix: `دستور پخت را ویرایش کرده و واحد مصرف را به یک واحد سازگار (مانند ${prepItem.unit}) تغییر دهید.`
                });
            }

        // --- Check ingredients sourced from INVENTORY ---
        } else {
            const inventoryItem = allIngredients.get(ri.ingredientId);

            // Reference Integrity Check
            if (!inventoryItem) {
                const title = parentType === 'PREP' ? 'ماده اولیه نامعتبر در فرمول تولید' : 'ماده اولیه نامعتبر در دستور پخت';
                const description = parentType === 'PREP' 
                    ? `فرمول تولید آیتم آماده‌سازی "${parentName}" به یک ماده اولیه خام اشاره دارد که حذف شده یا وجود ندارد.`
                    : `دستور پخت آیتم "${parentName}" به یک ماده اولیه خام اشاره دارد که حذف شده یا وجود ندارد.`;
                const suggestedFix = parentType === 'PREP'
                    ? 'فرمول تولید این آیتم را ویرایش کرده و ماده اولیه نامعتبر را حذف یا جایگزین کنید.'
                    : 'دستور پخت آیتم را ویرایش کرده و ماده اولیه نامعتبر را حذف یا با یک مورد موجود جایگزین کنید.';

                issues.push({
                    id: `recipe-invalid-ing-${parentEntity.id}-${ri.ingredientId}`,
                    severity: 'high',
                    title: title,
                    description: description,
                    entityType: parentType,
                    entityId: parentEntity.id,
                    entityName: parentName,
                    suggestedFix: suggestedFix,
                });
                return; // Skip further checks
            }
            
            if (!ri.unit || ri.unit.trim() === '') {
                issues.push({
                    id: `recipe-empty-unit-${parentEntity.id}-${ri.ingredientId}`,
                    severity: 'high',
                    title: 'واحد مصرف در رسپی تعریف نشده',
                    description: `در دستور پخت "${parentName}", واحد مصرف برای ماده اولیه "${inventoryItem.name}" تعریف نشده است.`,
                    entityType: parentType,
                    entityId: parentEntity.id,
                    entityName: parentName,
                    suggestedFix: 'دستور پخت را ویرایش کرده و یک واحد مصرف معتبر (مانند گرم، عدد، ...) برای این ماده اولیه انتخاب کنید.'
                });
                return; 
            }

            // Unit Compatibility Check
            const factor = getConversionFactor(ri.unit, inventoryItem.usageUnit, inventoryItem);
            if (factor === null) {
                 issues.push({
                    id: `recipe-incompatible-unit-${parentEntity.id}-${ri.ingredientId}`,
                    severity: 'high',
                    title: 'ناسازگاری واحد رسپی و انبار',
                    description: `در دستور پخت "${parentName}", واحد مصرف "${ri.unit}" برای ماده اولیه "${inventoryItem.name}" با واحد پایه انبار ("${inventoryItem.usageUnit}") قابل تبدیل نیست.`,
                    entityType: parentType,
                    entityId: parentEntity.id,
                    entityName: parentName,
                    suggestedFix: 'واحد مصرف رسپی یا واحد انبار را طوری تنظیم کنید که قابل تبدیل باشند (مثلاً گرم↔کیلو) یا یک تبدیل سفارشی برای آن تعریف کنید.'
                });
            }
        }
      });
    };
  
    state.menu.forEach(item => {
      if (!item.isDeleted && item.recipe) checkRecipe(item.recipe, item, 'MENU');
    });
    state.prepTasks.forEach(task => {
      if (task.recipe) checkRecipe(task.recipe, task, 'PREP');
    });
  
    return issues;
};


// Rule 4: Negative stock or minThreshold
const checkNegativeInventoryValues: CheckFunction = (state) => {
    const issues: HealthIssue[] = [];
    state.inventory.forEach(item => {
        if (!item.isDeleted && item.currentStock < 0) {
            issues.push({
                id: `inv-neg-stock-${item.id}`,
                severity: 'high',
                title: 'موجودی انبار منفی',
                description: `موجودی کالای "${item.name}" منفی (${item.currentStock}) است که نشان‌دهنده خطای محاسباتی یا ثبت داده است.`,
                entityType: 'INVENTORY',
                entityId: item.id,
                entityName: item.name,
                suggestedFix: 'موجودی کالا را بررسی و اصلاح کنید. ممکن است یک دستور پخت نادرست باعث کسر بیش از حد شده باشد.'
            });
        }
        if (!item.isDeleted && item.minThreshold && item.minThreshold < 0) {
             issues.push({
                id: `inv-neg-threshold-${item.id}`,
                severity: 'medium',
                title: 'حد آستانه منفی',
                description: `حد آستانه هشدار برای کالای "${item.name}" منفی (${item.minThreshold}) است.`,
                entityType: 'INVENTORY',
                entityId: item.id,
                entityName: item.name,
                suggestedFix: 'مقدار حد آستانه را به صفر یا یک عدد مثبت تغییر دهید.'
            });
        }
    });
    return issues;
};

// Rule 5: Invalid conversionRate
const checkInvalidConversionRate: CheckFunction = (state) => {
    const issues: HealthIssue[] = [];
    state.inventory.forEach(item => {
        if (!item.isDeleted && item.conversionRate !== undefined && item.conversionRate <= 0) {
             issues.push({
                id: `inv-invalid-conversion-${item.id}`,
                severity: 'medium',
                title: 'ضریب تبدیل نامعتبر',
                description: `ضریب تبدیل بین واحد خرید و مصرف برای کالای "${item.name}" صفر یا منفی است که محاسبات هزینه را مختل می‌کند.`,
                entityType: 'INVENTORY',
                entityId: item.id,
                entityName: item.name,
                suggestedFix: 'ضریب تبدیل را به یک عدد مثبت و صحیح تغییر دهید.'
            });
        }
    });
    return issues;
};

// Rule 6: Duplicate names
const checkDuplicateNames: CheckFunction = (state) => {
    const issues: HealthIssue[] = [];
    const inventoryNames = new Map<string, string[]>();
    const menuNames = new Map<string, string[]>();
    
    state.inventory.forEach(item => {
        if (!item.isDeleted) {
            const lowerName = item.name.toLowerCase().trim();
            if (!inventoryNames.has(lowerName)) inventoryNames.set(lowerName, []);
            inventoryNames.get(lowerName)!.push(item.id);
        }
    });
    
    state.menu.forEach(item => {
        if (!item.isDeleted) {
            const lowerName = item.name.toLowerCase().trim();
            if (!menuNames.has(lowerName)) menuNames.set(lowerName, []);
            menuNames.get(lowerName)!.push(item.id);
        }
    });

    inventoryNames.forEach((ids, name) => {
        if (ids.length > 1) {
            const originalItem = state.inventory.find(i => i.id === ids[0])!;
            issues.push({
                id: `inv-duplicate-name-${name}`,
                severity: 'medium',
                title: 'نام کالای تکراری در انبار',
                description: `چندین کالا با نام "${originalItem.name}" در انبار وجود دارد که می‌تواند باعث خطا در گزارشات شود.`,
                entityType: 'INVENTORY',
                entityId: ids.join(','),
                entityName: originalItem.name,
                suggestedFix: 'نام کالاهای تکراری را تغییر دهید یا موارد اضافی را حذف کنید.'
            });
        }
    });

    menuNames.forEach((ids, name) => {
        if (ids.length > 1) {
            const originalItem = state.menu.find(m => m.id === ids[0])!;
            issues.push({
                id: `menu-duplicate-name-${name}`,
                severity: 'medium',
                title: 'نام آیتم تکراری در منو',
                description: `چندین آیتم با نام "${originalItem.name}" در منو وجود دارد که می‌تواند باعث خطا در گزارشات شود.`,
                entityType: 'MENU',
                entityId: ids.join(','),
                entityName: originalItem.name,
                suggestedFix: 'نام آیتم‌های تکراری را تغییر دهید یا موارد اضافی را حذف کنید.'
            });
        }
    });

    return issues;
};

export const runDataHealthChecks = (state: RestaurantState): { issues: HealthIssue[] } => {
    const checks: CheckFunction[] = [
        checkMenuItemsWithoutRecipe,
        checkRecipeIntegrity,
        checkNegativeInventoryValues,
        checkInvalidConversionRate,
        checkDuplicateNames,
    ];
    
    const allIssues = checks.flatMap(check => check(state));
    
    return { issues: allIssues };
};