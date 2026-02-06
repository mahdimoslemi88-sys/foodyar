// domain/inventory.ts
import { RecipeIngredient, Ingredient, PrepTask, getConversionFactor, MenuItem, InsufficientItem } from '../types';

/**
 * Calculates the deductions needed from inventory and prep tasks for a sale.
 * @param cart - The items and quantities in the current sale.
 * @param inventory - The current state of the inventory (Array or Map).
 * @param prepTasks - The current state of prepared items (Array or Map).
 * @returns An object with two maps: `inventoryDeductions` and `prepDeductions`.
 * @throws An error if a unit conversion is not possible.
 */
export const calculateDeductions = (
  cart: { item: MenuItem, quantity: number }[],
  inventory: readonly Ingredient[] | Map<string, Ingredient>,
  prepTasks: readonly PrepTask[] | Map<string, PrepTask>
): { inventoryDeductions: Map<string, number>, prepDeductions: Map<string, number> } => {
  const inventoryDeductions = new Map<string, number>();
  const prepDeductions = new Map<string, number>();

  const inventoryMap = inventory instanceof Map ? inventory : new Map(inventory.map(i => [i.id, i]));
  const prepMap = prepTasks instanceof Map ? prepTasks : new Map(prepTasks.map(p => [p.id, p]));

  cart.forEach(cartItem => {
    cartItem.item.recipe.forEach(recipeIngredient => {
      const totalQuantityToDeduct = recipeIngredient.amount * cartItem.quantity;

      if (recipeIngredient.source === 'prep') {
        const prepItem = prepMap.get(recipeIngredient.ingredientId);
        if (prepItem) {
          const factor = getConversionFactor(recipeIngredient.unit, prepItem.unit);
          if (factor === null) {
              throw new Error(`واحد مصرف آیتم آماده سازی ("${prepItem.item}") با واحد دستور پخت قابل تبدیل نیست. لطفا فرمولاسیون را اصلاح کنید.`);
          }
          const amountInBaseUnit = totalQuantityToDeduct * factor;
          const currentDeduction = prepDeductions.get(recipeIngredient.ingredientId) || 0;
          prepDeductions.set(recipeIngredient.ingredientId, currentDeduction + amountInBaseUnit);
        }
      } else { // 'inventory'
        const inventoryItem = inventoryMap.get(recipeIngredient.ingredientId);
        if (inventoryItem) {
          const factor = getConversionFactor(recipeIngredient.unit, inventoryItem.usageUnit);
          if (factor === null) {
              throw new Error(`واحد مصرف ماده اولیه ("${inventoryItem.name}") با واحد انبار قابل تبدیل نیست. لطفا فرمولاسیون را اصلاح کنید.`);
          }
          const amountInBaseUnit = totalQuantityToDeduct * factor;
          const currentDeduction = inventoryDeductions.get(recipeIngredient.ingredientId) || 0;
          inventoryDeductions.set(recipeIngredient.ingredientId, currentDeduction + amountInBaseUnit);
        }
      }
    });
  });

  return { inventoryDeductions, prepDeductions };
};

export const checkStockAvailability = (
    inventory: readonly Ingredient[] | Map<string, Ingredient>,
    prepTasks: readonly PrepTask[] | Map<string, PrepTask>,
    inventoryDeductions: Map<string, number>,
    prepDeductions: Map<string, number>
): { insufficientItems: InsufficientItem[] } => {
    const insufficientItems: InsufficientItem[] = [];

    const inventoryMap = inventory instanceof Map ? inventory : new Map(inventory.map(i => [i.id, i]));
    const prepMap = prepTasks instanceof Map ? prepTasks : new Map(prepTasks.map(p => [p.id, p]));

    inventoryDeductions.forEach((required, id) => {
        const item = inventoryMap.get(id);
        if (item && item.currentStock < required) {
            insufficientItems.push({
                id,
                name: item.name,
                required,
                available: item.currentStock,
                unit: item.usageUnit,
                source: 'inventory'
            });
        }
    });

    prepDeductions.forEach((required, id) => {
        const item = prepMap.get(id);
        if (item && item.onHand < required) {
            insufficientItems.push({
                id,
                name: item.item,
                required,
                available: item.onHand,
                unit: item.unit,
                source: 'prep'
            });
        }
    });

    return { insufficientItems };
};