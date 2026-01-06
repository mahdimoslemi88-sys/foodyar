
import { describe, it, expect } from 'vitest';
import { calculateDeductions, checkStockAvailability } from './inventory';
import { Ingredient, PrepTask, MenuItem } from '../types';

// Mock Data
const mockInventory: Ingredient[] = [
  { id: 'ing1', name: 'Beef', usageUnit: 'gram', currentStock: 500, costPerUnit: 1, purchaseUnit: 'gram', minThreshold: 0, purchaseHistory: [], isDeleted: false },
  { id: 'ing2', name: 'Bun', usageUnit: 'number', currentStock: 10, costPerUnit: 1, purchaseUnit: 'number', minThreshold: 0, purchaseHistory: [], isDeleted: false },
];

const mockPrepTasks: PrepTask[] = [
  { id: 'prep1', item: 'Special Sauce', unit: 'ml', onHand: 200, parLevel: 500, station: 'Sauce', costPerUnit: 1 },
];

const mockMenu: MenuItem[] = [
  {
    id: 'menu1', name: 'Burger', category: 'Main', price: 100, isDeleted: false,
    recipe: [
      { ingredientId: 'ing1', amount: 150, unit: 'gram', source: 'inventory' },
      { ingredientId: 'ing2', amount: 1, unit: 'number', source: 'inventory' },
      { ingredientId: 'prep1', amount: 20, unit: 'ml', source: 'prep' },
    ]
  }
];

describe('calculateDeductions', () => {
  it('should calculate correct deductions for a single item sale', () => {
    const cart = [{ item: mockMenu[0], quantity: 2 }];
    const { inventoryDeductions, prepDeductions } = calculateDeductions(cart, mockInventory, mockPrepTasks);

    expect(inventoryDeductions.get('ing1')).toBe(300); // 150g * 2
    expect(inventoryDeductions.get('ing2')).toBe(2);   // 1pc * 2
    expect(prepDeductions.get('prep1')).toBe(40);     // 20ml * 2
  });
});

describe('checkStockAvailability', () => {
  it('should report no insufficient items when stock is available', () => {
    const inventoryDeductions = new Map([['ing1', 300], ['ing2', 2]]);
    const prepDeductions = new Map([['prep1', 40]]);

    const { insufficientItems } = checkStockAvailability(mockInventory, mockPrepTasks, inventoryDeductions, prepDeductions);
    expect(insufficientItems).toHaveLength(0);
  });

  it('should report insufficient items when stock is low', () => {
    const inventoryDeductions = new Map([['ing1', 600], ['ing2', 12]]); // Need 600g beef, 12 buns
    const prepDeductions = new Map([['prep1', 250]]); // Need 250ml sauce

    const { insufficientItems } = checkStockAvailability(mockInventory, mockPrepTasks, inventoryDeductions, prepDeductions);
    
    expect(insufficientItems).toHaveLength(3);
    expect(insufficientItems).toContainEqual(expect.objectContaining({ name: 'Beef', required: 600, available: 500 }));
    expect(insufficientItems).toContainEqual(expect.objectContaining({ name: 'Bun', required: 12, available: 10 }));
    expect(insufficientItems).toContainEqual(expect.objectContaining({ name: 'Special Sauce', required: 250, available: 200 }));
  });
});
