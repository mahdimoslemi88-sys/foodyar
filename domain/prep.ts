// domain/prep.ts
import { RecipeIngredient, Ingredient, getConversionFactor } from '../types';
import { getCostPerUsageUnit } from './costing';

/**
 * Calculates the total cost of a batch for a prepared item based on its recipe.
 * A prep item's recipe should only consist of raw inventory ingredients.
 * @param recipe - The list of ingredients and their amounts for the batch.
 * @param inventory - The current state of the inventory.
 * @returns The calculated cost for one batch of the recipe.
 */
export const calculateBatchCost = (
  recipe: RecipeIngredient[],
  inventory: readonly Ingredient[]
): number => {
  if (!recipe || recipe.length === 0) {
    return 0;
  }

  const totalCost = recipe.reduce((total, recipeItem) => {
    // A prep recipe should only source from raw inventory
    if (recipeItem.source === 'prep') {
      console.warn(`Prep item recipe contains another prep item (${recipeItem.ingredientId}). This is not supported for cost calculation.`);
      return total;
    }

    const inventoryItem = inventory.find(i => i.id === recipeItem.ingredientId);
    if (!inventoryItem) {
      return total;
    }

    const costPerUsageUnit = getCostPerUsageUnit(inventoryItem);
    const conversionFactor = getConversionFactor(recipeItem.unit, inventoryItem.usageUnit);
    const itemCost = recipeItem.amount * costPerUsageUnit * conversionFactor;
    
    return total + itemCost;
  }, 0);

  return Math.round(totalCost);
};
