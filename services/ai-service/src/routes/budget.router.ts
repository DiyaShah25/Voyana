/**
 * Trip Budget & Expense Management Router
 * Provides REST endpoints for budget tracking, expense ledgers,
 * allocations, and cost distributions in MongoDB Atlas.
 */

import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { BudgetModel, IBudgetExpense } from '../db/models/budget.model.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const budgetRouter = Router();

const DEFAULT_ALLOCATIONS = [
  { category: 'Flights', allocated: 1400, color: '#635BFF' },
  { category: 'Accommodations', allocated: 1200, color: '#00D4B2' },
  { category: 'Food & Dining', allocated: 750, color: '#FF9900' },
  { category: 'Activities', allocated: 450, color: '#EC4899' },
  { category: 'Transport', allocated: 250, color: '#3B82F6' },
  { category: 'Shopping', allocated: 100, color: '#8B5CF6' },
  { category: 'Miscellaneous', allocated: 50, color: '#64748B' },
];

// ---------------------------------------------------------------------------
// GET /api/budget/:tripId - Get or initialize budget
// ---------------------------------------------------------------------------
budgetRouter.get('/:tripId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    let budget = await BudgetModel.findOne({
      $or: [{ id: tripId }, { tripId }],
    });

    if (!budget) {
      // Create initial budget record
      budget = new BudgetModel({
        id: tripId,
        tripId,
        destination: 'Travel Destination',
        totalBudget: 4200,
        currency: 'USD',
        members: ['Diya Shah', 'Tirth Gandhi', 'Jagrat Kumar'],
        allocations: DEFAULT_ALLOCATIONS,
        expenses: [],
      });
      await budget.save();
    }

    res.status(200).json({ ok: true, budget });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to retrieve budget.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/budget/:tripId - Update budget totals or allocations
// ---------------------------------------------------------------------------
budgetRouter.put('/:tripId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const updates = req.body;
    delete updates._id;

    const budget = await BudgetModel.findOneAndUpdate(
      { $or: [{ id: tripId }, { tripId }] },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.status(200).json({ ok: true, message: 'Budget updated.', budget });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to update budget.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/budget/:tripId/expenses - Add an expense
// ---------------------------------------------------------------------------
budgetRouter.post('/:tripId/expenses', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const body = req.body;

    if (!body.title || body.amount === undefined || !body.paidBy) {
      res.status(400).json({ ok: false, message: 'title, amount, and paidBy are required.' });
      return;
    }

    const newExpense: IBudgetExpense = {
      id: body.id || `exp-${randomUUID().slice(0, 6)}`,
      title: body.title.trim(),
      amount: Number(body.amount) || 0,
      currency: body.currency || 'USD',
      category: body.category || 'Miscellaneous',
      date: body.date || new Date().toISOString().split('T')[0],
      paidBy: body.paidBy,
      splitAmong: Array.isArray(body.splitAmong) ? body.splitAmong : [body.paidBy],
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      receiptUrl: body.receiptUrl,
      createdAt: new Date().toISOString(),
    };

    const budget = await BudgetModel.findOneAndUpdate(
      { $or: [{ id: tripId }, { tripId }] },
      { $push: { expenses: newExpense } },
      { new: true, upsert: true }
    );

    res.status(201).json({
      ok: true,
      message: 'Expense added to shared budget.',
      expense: newExpense,
      budget,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to add expense.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/budget/:tripId/expenses/:expenseId - Delete an expense
// ---------------------------------------------------------------------------
budgetRouter.delete('/:tripId/expenses/:expenseId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId, expenseId } = req.params;

    const budget = await BudgetModel.findOneAndUpdate(
      { $or: [{ id: tripId }, { tripId }] },
      { $pull: { expenses: { id: expenseId } } },
      { new: true }
    );

    if (!budget) {
      res.status(404).json({ ok: false, message: 'Budget not found.' });
      return;
    }

    res.status(200).json({ ok: true, message: 'Expense removed.', budget });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to remove expense.', error: err?.message });
  }
});
