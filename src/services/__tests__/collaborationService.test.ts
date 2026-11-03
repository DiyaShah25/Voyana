import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDebtSettlement,
  TripExpense,
} from '../collaborationService';

describe('collaborationService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('calculateDebtSettlement', () => {
    it('computes exact balances and settlements when one person pays for an equal split', () => {
      const expenses: TripExpense[] = [
        {
          id: 'exp-1',
          tripId: 'trip-1',
          title: 'Dinner at Le Comptoir',
          amount: 300,
          currency: 'USD',
          category: 'Food',
          paidBy: 'Alex Morgan',
          splitAmong: ['Alex Morgan', 'Diya Shah', 'Bhavika Sainani'],
          date: '2026-10-15',
        },
      ];

      const members = ['Alex Morgan', 'Diya Shah', 'Bhavika Sainani'];
      const result = calculateDebtSettlement(expenses, members);

      expect(result.totalSpent).toBe(300);
      // Alex paid 300, owes 100 -> net +200
      expect(result.balances['Alex Morgan']).toBe(200);
      // Diya owes 100 -> net -100
      expect(result.balances['Diya Shah']).toBe(-100);
      // Bhavika owes 100 -> net -100
      expect(result.balances['Bhavika Sainani']).toBe(-100);

      expect(result.settlements).toHaveLength(2);
      expect(result.settlements).toContainEqual({
        from: 'Diya Shah',
        to: 'Alex Morgan',
        amount: 100,
      });
      expect(result.settlements).toContainEqual({
        from: 'Bhavika Sainani',
        to: 'Alex Morgan',
        amount: 100,
      });
    });

    it('handles multiple reciprocal expenses and minimizes transactions', () => {
      const expenses: TripExpense[] = [
        // Alex pays $100 for Alex & Diya ($50 each)
        {
          id: 'exp-1',
          tripId: 'trip-1',
          title: 'Taxi',
          amount: 100,
          currency: 'USD',
          category: 'Transport',
          paidBy: 'Alex Morgan',
          splitAmong: ['Alex Morgan', 'Diya Shah'],
          date: '2026-10-15',
        },
        // Diya pays $60 for Alex & Diya ($30 each)
        {
          id: 'exp-2',
          tripId: 'trip-1',
          title: 'Lunch',
          amount: 60,
          currency: 'USD',
          category: 'Food',
          paidBy: 'Diya Shah',
          splitAmong: ['Alex Morgan', 'Diya Shah'],
          date: '2026-10-15',
        },
      ];

      const members = ['Alex Morgan', 'Diya Shah'];
      const result = calculateDebtSettlement(expenses, members);

      expect(result.totalSpent).toBe(160);
      // Alex: +100 - 50 - 30 = +20
      expect(result.balances['Alex Morgan']).toBe(20);
      // Diya: +60 - 50 - 30 = -20
      expect(result.balances['Diya Shah']).toBe(-20);

      expect(result.settlements).toHaveLength(1);
      expect(result.settlements[0]).toEqual({
        from: 'Diya Shah',
        to: 'Alex Morgan',
        amount: 20,
      });
    });

    it('handles empty expenses cleanly with zero balances', () => {
      const members = ['Alex Morgan', 'Diya Shah'];
      const result = calculateDebtSettlement([], members);

      expect(result.totalSpent).toBe(0);
      expect(result.balances['Alex Morgan']).toBe(0);
      expect(result.balances['Diya Shah']).toBe(0);
      expect(result.settlements).toHaveLength(0);
    });

    it('handles zero amount expenses and single-person splits without error', () => {
      const expenses: TripExpense[] = [
        {
          id: 'exp-zero',
          tripId: 'trip-1',
          title: 'Free Museum Entry',
          amount: 0,
          currency: 'USD',
          category: 'Activities',
          paidBy: 'Alex Morgan',
          splitAmong: ['Alex Morgan'],
          date: '2026-10-15',
        },
      ];

      const result = calculateDebtSettlement(expenses, ['Alex Morgan']);
      expect(result.totalSpent).toBe(0);
      expect(result.settlements).toHaveLength(0);
    });
  });
});

