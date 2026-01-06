
import { describe, it, expect, vi } from 'vitest';
import { calculateRecipeCost } from './pricing';
import { Ingredient, PrepTask, MenuItem } from '../types';

// Mock Data
const mockInventory: Ingredient[] = [
  { id: 'ing1', name: 'Flour', usageUnit: 'gram', currentStock: 1000, costPerUnit: 10000, purchaseUnit: 'kg', conversionRate: 1000, minThreshold: 0, purchaseHistory: [], isDeleted: false }, // 10 per gram
  { id: 'ing2', name: 'Sugar', usageUnit: 'gram', currentStock: 1000, costPerUnit: 20000, purchaseUnit: 'kg', conversionRate: 1000, minThreshold: 0, purchaseHistory: [], isDeleted: false }, // 20 per gram
  { id: 'ing3', name: 'Water', usageUnit: 'ml', currentStock: 5000, costPerUnit: 1000, purchaseUnit: 'liter', conversionRate: 1000, minThreshold: 0, purchaseHistory: [], isDeleted: false }, // 1 per ml
];

const mockPrepTasks: PrepTask[] = [
  { id: 'prep1', item: 'Sweet Dough', unit: 'kg', onHand: 2, parLevel: 5, station: 'Bakery', costPerUnit: 50000 }, // 50 per gram
];

describe('calculateRecipeCost', () => {
  it('should calculate cost for a simple recipe from inventory', () => {
    const simpleRecipe: MenuItem['recipe'] = [
      { ingredientId: 'ing1', amount: 200, unit: 'gram', source: 'inventory' }, // 200 * 10 = 2000
      { ingredientId: 'ing2', amount: 100, unit: 'gram', source: 'inventory' }, // 100 * 20 = 2000
    ];
    const cost = calculateRecipeCost(simpleRecipe, mockInventory, mockPrepTasks);
    expect(cost).toBe(4000);
  });

  it('should calculate cost for a recipe including a prep task item', () => {
    const complexRecipe: MenuItem['recipe'] = [
      { ingredientId: 'ing1', amount: 100, unit: 'gram', source: 'inventory' }, // 100 * 10 = 1000
      { ingredientId: 'prep1', amount: 50, unit: 'gram', source: 'prep' },      // 50 * 50 = 2500
    ];
    const cost = calculateRecipeCost(complexRecipe, mockInventory, mockPrepTasks);
    expect(cost).toBe(3500);
  });
  
  it('should handle unit conversions correctly', () => {
    const recipeWithKg: MenuItem['recipe'] = [
        { ingredientId: 'ing1', amount: 0.5, unit: 'kg', source: 'inventory' }, // 0.5kg = 500g => 500 * 10 = 5000
    ];
    const cost = calculateRecipeCost(recipeWithKg, mockInventory, mockPrepTasks);
    expect(cost).toBe(5000);
  });

  it('should return 0 for an empty recipe', () => {
    const cost = calculateRecipeCost([], mockInventory, mockPrepTasks);
    expect(cost).toBe(0);
  });

  it('should return 0 if an ingredient is not found', () => {
    const recipeWithMissingItem: MenuItem['recipe'] = [
      { ingredientId: 'ing_missing', amount: 100, unit: 'gram', source: 'inventory' },
    ];
    const cost = calculateRecipeCost(recipeWithMissingItem, mockInventory, mockPrepTasks);
    expect(cost).toBe(0);
  });
  
  it('should return 0 and warn for incompatible units', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const recipeWithBadUnit: MenuItem['recipe'] = [
      { ingredientId: 'ing1', amount: 1, unit: 'liter', source: 'inventory' }, // liter is not convertible to gram
    ];
    const cost = calculateRecipeCost(recipeWithBadUnit, mockInventory, mockPrepTasks);
    expect(cost).toBe(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Incompatible units in recipe for ingredient 'Flour'"));
    consoleWarnSpy.mockRestore();
  });
});
