
import { describe, it, expect } from 'vitest';
import { runDataHealthChecks } from './dataHealth';
import { MenuItem, Ingredient, PrepTask } from '../types';

describe('runDataHealthChecks', () => {
  it('should return no issues for healthy data', () => {
    const healthyState = {
      // FIX: Use 'as const' to ensure TypeScript infers 'inventory' as a literal type, not a generic string.
      menu: [{ id: 'm1', name: 'Healthy Burger', price: 10, category: 'Food', isDeleted: false, recipe: [{ ingredientId: 'i1', amount: 1, unit: 'gram', source: 'inventory' as const }] }],
      inventory: [{ id: 'i1', name: 'Beef', usageUnit: 'gram', currentStock: 100, costPerUnit: 1, minThreshold: 0, purchaseHistory: [], isDeleted: false }],
      prepTasks: [],
    };
    const { issues } = runDataHealthChecks(healthyState);
    expect(issues).toHaveLength(0);
  });

  it('should detect a menu item with no recipe', () => {
    const state = {
      menu: [{ id: 'm1', name: 'Burger without Recipe', price: 10, category: 'Food', isDeleted: false, recipe: [] }],
      inventory: [], prepTasks: [],
    };
    const { issues } = runDataHealthChecks(state);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('menu-no-recipe-m1');
    expect(issues[0].title).toContain('بدون فرمولاسیون');
  });

  it('should detect a recipe with a non-existent ingredient ID', () => {
    const state = {
      menu: [{ id: 'm1', name: 'Burger with Ghost Ingredient', price: 10, category: 'Food', isDeleted: false, recipe: [{ ingredientId: 'i-ghost', amount: 1, unit: 'gram' }] }],
      inventory: [], prepTasks: [],
    };
    const { issues } = runDataHealthChecks(state);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('recipe-invalid-ing-m1-i-ghost');
    expect(issues[0].title).toContain('ماده اولیه نامعتبر');
  });

  it('should detect negative inventory stock', () => {
    const state = {
      menu: [],
      inventory: [{ id: 'i1', name: 'Beef', usageUnit: 'gram', currentStock: -50, costPerUnit: 1, minThreshold: 0, purchaseHistory: [], isDeleted: false }],
      prepTasks: [],
    };
    const { issues } = runDataHealthChecks(state);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('inv-neg-stock-i1');
    expect(issues[0].title).toContain('موجودی انبار منفی');
  });
  
  it('should detect incompatible units in a recipe', () => {
    const state = {
        menu: [{ id: 'm1', name: 'Burger with bad units', price: 10, category: 'Food', isDeleted: false, recipe: [{ ingredientId: 'i1', amount: 1, unit: 'liter' }] }], // Using liter for beef
        inventory: [{ id: 'i1', name: 'Beef', usageUnit: 'gram', currentStock: 100, costPerUnit: 1, minThreshold: 0, purchaseHistory: [], isDeleted: false }],
        prepTasks: [],
    };
    const { issues } = runDataHealthChecks(state);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('recipe-incompatible-unit-m1-i1');
    expect(issues[0].title).toContain('ناسازگاری واحد');
  });

  it('should detect duplicate names in inventory', () => {
    const state = {
        menu: [],
        inventory: [
            { id: 'i1', name: 'Beef', usageUnit: 'gram', currentStock: 100, costPerUnit: 1, minThreshold: 0, purchaseHistory: [], isDeleted: false },
            { id: 'i2', name: 'Beef', usageUnit: 'gram', currentStock: 200, costPerUnit: 1, minThreshold: 0, purchaseHistory: [], isDeleted: false }
        ],
        prepTasks: [],
    };
    const { issues } = runDataHealthChecks(state);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('inv-duplicate-name-beef');
    expect(issues[0].title).toContain('نام کالای تکراری');
  });
});