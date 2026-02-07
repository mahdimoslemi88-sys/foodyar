// domain/pricing.ts
import { RecipeIngredient, Ingredient, PrepTask, getConversionFactor } from '../types';
import { getCostPerUsageUnit as getInventoryCostPerUsageUnit } from './costing';

type IngredientData = readonly Ingredient[] | Map<string, Ingredient>;
type PrepTaskData = readonly PrepTask[] | Map<string, PrepTask>;

const getIngredient = (data: IngredientData, id: string): Ingredient | undefined => {
  return data instanceof Map ? data.get(id) : data.find(i => i.id === id);
};

const getPrepTask = (data: PrepTaskData, id: string): PrepTask | undefined => {
  return data instanceof Map ? data.get(id) : data.find(p => p.id === id);
};

/**
 * Calculates the total cost of goods sold (COGS) for a given recipe.
 * @param recipe - The list of ingredients and their amounts.
 * @param inventory - The current state of the inventory (Array or Map).
 * @param prepTasks - The current state of prepared items (Array or Map).
 * @returns The calculated cost for one unit of the recipe.
 */
export const calculateRecipeCost = (
  recipe: RecipeIngredient[],
  inventory: IngredientData,
  prepTasks: PrepTaskData
): number => {
  if (!recipe || recipe.length === 0) {
    return 0;
  }

  const totalCost = recipe.reduce((total, item) => {
    let itemCost = 0;
    
    if (item.source === 'prep') {
      const prepItem = getPrepTask(prepTasks, item.ingredientId);
      if (prepItem?.costPerUnit) {
        const factor = getConversionFactor(item.unit, prepItem.unit);
        if (factor !== null) {
            itemCost = prepItem.costPerUnit * item.amount * factor;
        } else {
            console.warn(`Incompatible units in recipe for prep item '${prepItem.item}': '${item.unit}' cannot be converted to '${prepItem.unit}'. Cost calculated as 0.`);
        }
      }
    } else { // 'inventory'
      const ing = getIngredient(inventory, item.ingredientId);
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
