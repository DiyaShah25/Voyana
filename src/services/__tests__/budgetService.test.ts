import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTripBudget,
  addExpense,
  deleteExpense,
  calculateCategoryBreakdown,
  exportExpensesCsv,
  TripBudget,
} from '../budgetService';

describe('budgetService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Budget state and calculations', () => {
    it('retrieves initial or saved trip budget', () => {
      const budget = getTripBudget();
      expect(budget).toBeDefined();
      expect(budget.totalBudget).toBeGreaterThan(0);
      expect(Array.isArray(budget.expenses)).toBe(true);
    });

    it('adds a new expense and updates spent total', () => {
      const initial = getTripBudget();
      const updated = addExpense({
        title: 'Ski Rental',
        amount: 150,
        currency: 'CHF',
        category: 'Activities',
        paidBy: 'Alex Morgan',
        splitAmong: ['Alex Morgan', 'Elena Rostova'],
        date: '2026-11-10',
      });

      expect(updated.expenses.length).toBe(initial.expenses.length + 1);
      const added = updated.expenses.find((e) => e.title === 'Ski Rental');
      expect(added).toBeDefined();
      expect(added?.amount).toBe(150);
    });

    it('deletes an expense by ID', () => {
      const updated = addExpense({
        title: 'Temporary Coffee',
        amount: 15,
        currency: 'USD',
        category: 'Food & Dining',
        paidBy: 'Alex Morgan',
        splitAmong: ['Alex Morgan'],
        date: '2026-11-10',
      });

      const added = updated.expenses.find((e) => e.title === 'Temporary Coffee')!;
      const afterDelete = deleteExpense(added.id);

      expect(afterDelete.expenses.find((e) => e.id === added.id)).toBeUndefined();
    });

    it('calculates category breakdown percentages accurately', () => {
      const budget: TripBudget = {
        id: 'test-budget',
        destination: 'Paris',
        totalBudget: 1000,
        currency: 'USD',
        allocations: [
          { category: 'Accommodations', allocated: 500, color: '#3b82f6' },
          { category: 'Food & Dining', allocated: 500, color: '#10b981' },
        ],
        members: ['Alex Morgan'],
        expenses: [
          { id: '1', title: 'Hotel', amount: 250, currency: 'USD', category: 'Accommodations', paidBy: 'Alex Morgan', splitAmong: ['Alex Morgan'], date: '2026-10-15', createdAt: '' },
          { id: '2', title: 'Food', amount: 500, currency: 'USD', category: 'Food & Dining', paidBy: 'Alex Morgan', splitAmong: ['Alex Morgan'], date: '2026-10-15', createdAt: '' },
        ],
      };

      const breakdown = calculateCategoryBreakdown(budget);
      expect(breakdown).toHaveLength(2);
      expect(breakdown[0].spent).toBe(250);
      expect(breakdown[0].percentSpent).toBe(50);
      expect(breakdown[1].spent).toBe(500);
      expect(breakdown[1].percentSpent).toBe(100);
    });

    it('exports expense ledger into CSV string with header and records', () => {
      const budget = getTripBudget();
      const csv = exportExpensesCsv(budget);

      expect(csv).toContain('ID,Date,Description,Category,Paid By,Split Among,Amount,Currency');
      expect(typeof csv).toBe('string');
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });
  });
});
