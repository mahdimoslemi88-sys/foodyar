// domain/costing.ts
import { Ingredient, getConversionFactor } from '../types';

/**
 * Returns the conversion rate from purchase unit to usage unit, defaulting to 1 if not specified.
 * @param ingredient The ingredient to get the rate for.
 * @returns The conversion rate.
 */
export const getSafeConversionRate = (ingredient: Ingredient): number => {
    return ingredient.conversionRate || 1;
};

/**
 * Calculates the cost per single usage unit (e.g., cost per gram).
 * @param ingredient The ingredient to calculate the cost for.
 * @returns The cost per usage unit.
 */
export const getCostPerUsageUnit = (ingredient: Ingredient): number => {
    if (!ingredient.costPerUnit) return 0;
    return ingredient.costPerUnit / getSafeConversionRate(ingredient);
};

/**
 * Calculates the total financial value of a given inventory item's stock.
 * @param ingredient The ingredient to calculate the value of.
 * @returns The total value (currentStock * costPerUsageUnit).
 */
export const calculateInventoryItemValue = (ingredient: Ingredient): number => {
    return ingredient.currentStock * getCostPerUsageUnit(ingredient);
};

/**
 * Calculates the financial loss for a wasted amount of an ingredient.
 * @param ingredient The ingredient that was wasted.
 * @param wasteAmount The amount of waste.
 * @param wasteUnit The unit of the waste amount.
 * @returns The total cost loss.
 */
export const calculateInventoryWasteLoss = (ingredient: Ingredient, wasteAmount: number, wasteUnit: string): number => {
    const costPerUsageUnit = getCostPerUsageUnit(ingredient);
    const conversionFactor = getConversionFactor(wasteUnit, ingredient.usageUnit);
    if (conversionFactor === null) {
        console.warn(`Cannot calculate waste loss for '${ingredient.name}'. Incompatible units: '${wasteUnit}' and '${ingredient.usageUnit}'.`);
        return 0;
    }
    return wasteAmount * costPerUsageUnit * conversionFactor;
};