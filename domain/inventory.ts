// domain/inventory.ts
import { RecipeIngredient, Ingredient, PrepTask, getConversionFactor, MenuItem, InsufficientItem } from '../types';

/**
 * Calculates the deductions needed from inventory and prep tasks for a sale.
 * @param cart - The items and quantities in the current sale.
 * @param inventory - The current state of the inventory (Array or Map for O(1) lookup).
 * @param prepTasks - The current state of prepared items (Array or Map for O(1) lookup).
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

  const inventoryMap = inventory instanceof Map ? inventory : null;
  const prepMap = prepTasks instanceof Map ? prepTasks : null;

  cart.forEach(cartItem => {
    cartItem.item.recipe.forEach(recipeIngredient => {
      const totalQuantityToDeduct = recipeIngredient.amount * cartItem.quantity;

      if (recipeIngredient.source === 'prep') {
        const prepItem = prepMap ? prepMap.get(recipeIngredient.ingredientId) : (prepTasks as readonly PrepTask[]).find(p => p.id === recipeIngredient.ingredientId);
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
        const inventoryItem = inventoryMap ? inventoryMap.get(recipeIngredient.ingredientId) : (inventory as readonly Ingredient[]).find(i => i.id === recipeIngredient.ingredientId);
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

    const inventoryMap = inventory instanceof Map ? inventory : null;
    const prepMap = prepTasks instanceof Map ? prepTasks : null;

    inventoryDeductions.forEach((required, id) => {
        const item = inventoryMap ? inventoryMap.get(id) : (inventory as readonly Ingredient[]).find(i => i.id === id);
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
        const item = prepMap ? prepMap.get(id) : (prepTasks as readonly PrepTask[]).find(p => p.id === id);
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
