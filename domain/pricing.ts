// domain/pricing.ts
import { RecipeIngredient, Ingredient, PrepTask, getConversionFactor } from '../types';
import { getCostPerUsageUnit as getInventoryCostPerUsageUnit } from './costing';

/**
 * Calculates the total cost of goods sold (COGS) for a given recipe.
 * @param recipe - The list of ingredients and their amounts.
 * @param inventory - The current state of the inventory (Array or Map for O(1) lookup).
 * @param prepTasks - The current state of prepared items (Array or Map for O(1) lookup).
 * @returns The calculated cost for one unit of the recipe.
 */
export const calculateRecipeCost = (
  recipe: RecipeIngredient[],
  inventory: readonly Ingredient[] | Map<string, Ingredient>,
  prepTasks: readonly PrepTask[] | Map<string, PrepTask>
): number => {
  if (!recipe || recipe.length === 0) {
    return 0;
  }

  const inventoryMap = inventory instanceof Map ? inventory : null;
  const prepMap = prepTasks instanceof Map ? prepTasks : null;

  const totalCost = recipe.reduce((total, item) => {
    let itemCost = 0;
    
    if (item.source === 'prep') {
      const prepItem = prepMap ? prepMap.get(item.ingredientId) : (prepTasks as readonly PrepTask[]).find(p => p.id === item.ingredientId);
      if (prepItem?.costPerUnit) {
        const factor = getConversionFactor(item.unit, prepItem.unit);
        if (factor !== null) {
            itemCost = prepItem.costPerUnit * item.amount * factor;
        } else {
            console.warn(`Incompatible units in recipe for prep item '${prepItem.item}': '${item.unit}' cannot be converted to '${prepItem.unit}'. Cost calculated as 0.`);
        }
      }
    } else { // 'inventory'
      const ing = inventoryMap ? inventoryMap.get(item.ingredientId) : (inventory as readonly Ingredient[]).find(i => i.id === item.ingredientId);
      if (ing) {
        const costPerUsageUnit = getInventoryCostPerUsageUnit(ing);
        const factor = getConversionFactor(item.unit, ing.usageUnit);
        if (factor !== null) {
            itemCost = costPerUsageUnit * item.amount * factor;
        } else {
            console.warn(`Incompatible units in recipe for ingredient '${ing.name}': '${item.unit}' cannot be converted to '${ing.usageUnit}'. Cost calculated as 0.`);
        }
      }
    }
    
    return total + itemCost;
  }, 0);

  return Math.round(totalCost);
};
