import { z } from 'zod';
import { notifyTrip } from '../services/trip-notifications.service.js';
import { requireBookedTrip } from '../middleware/booked-trip.middleware.js';
import { toError } from '../utils/errors.js';
import { TripModel } from '../db/models/trip.model.js';
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
budgetRouter.use('/:tripId', requireBookedTrip);

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
      const trip = await TripModel.findOne({ id: tripId });
      // Create initial budget record
      budget = new BudgetModel({
        id: tripId,
        tripId,
        destination: trip?.destination || String(req.query.destination || 'Travel Destination'),
        totalBudget: trip?.budgetTarget || 4200,
        currency: trip?.currency || 'USD',
        members: trip?.members.map(member => member.name) || ['Me'],
        allocations: DEFAULT_ALLOCATIONS,
        expenses: [],
      });
      await budget.save();
    }

    res.status(200).json({ ok: true, budget });
  } catch (caught) {
      const err = toError(caught);
    res.status(500).json({ ok: false, message: 'Failed to retrieve budget.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/budget/:tripId - Update budget totals or allocations
// ---------------------------------------------------------------------------
budgetRouter.put('/:tripId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const updates = {...req.body};
    const existing = await BudgetModel.findOne({id:tripId});
    if(updates.expenses){
      z.array(z.object({id:z.string(),title:z.string().min(1),amount:z.number().finite().nonnegative(),currency:z.string().length(3)})).parse(updates.expenses);
      for(const charge of existing?.expenses.filter(item=>item.id.startsWith('booking-'))||[]){
        const replacement=updates.expenses.find((item:{id:string})=>item.id===charge.id);
        if(!replacement||replacement.amount!==charge.amount||replacement.currency!==charge.currency){res.status(409).json({message:'Confirmed booking expenses must stay linked to their reservations.'});return;}
      }
    }
    delete updates.currency;
    delete updates._id;
    delete updates.id;
    delete updates.tripId;

    const budget = await BudgetModel.findOneAndUpdate(
      { $or: [{ id: tripId }, { tripId }] },
      { $set: updates },
      { new: true, upsert: true }
    );

    await notifyTrip(String(tripId),'Expense tracker updated',`${req.user!.name} updated the trip budget or expenses.`);
    res.status(200).json({ ok: true, message: 'Budget updated.', budget });
  } catch (caught) {
      const err = toError(caught);
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

    const valid = z.object({title:z.string().trim().min(1).max(160),amount:z.number().finite().positive().max(100000000)}).parse(body);
    const trip = await TripModel.findOne({id:tripId});
    const newExpense: IBudgetExpense = {
      id: body.id || `exp-${randomUUID().slice(0, 6)}`,
      title: valid.title,
      amount: valid.amount,
      currency: trip?.currency || 'INR',
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

    await notifyTrip(String(tripId), 'Expense added', `${req.user!.name} added ${newExpense.title}: ₹${newExpense.amount}.`);
    res.status(201).json({
      ok: true,
      message: 'Expense added to shared budget.',
      expense: newExpense,
      budget,
    });
  } catch (caught) {
      const err = toError(caught);
    res.status(500).json({ ok: false, message: 'Failed to add expense.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/budget/:tripId/expenses/:expenseId - Delete an expense
// ---------------------------------------------------------------------------
budgetRouter.delete('/:tripId/expenses/:expenseId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId, expenseId } = req.params;
    if(String(expenseId).startsWith('booking-')){res.status(409).json({message:'Cancel the reservation to update its recorded booking expense.'});return;}

    const budget = await BudgetModel.findOneAndUpdate(
      { $or: [{ id: tripId }, { tripId }] },
      { $pull: { expenses: { id: expenseId } } },
      { new: true }
    );

    if (!budget) {
      res.status(404).json({ ok: false, message: 'Budget not found.' });
      return;
    }

    await notifyTrip(String(tripId), 'Expense deleted', `${req.user!.name} deleted expense ${expenseId}.`);
    res.status(200).json({ ok: true, message: 'Expense removed.', budget });
  } catch (caught) {
      const err = toError(caught);
    res.status(500).json({ ok: false, message: 'Failed to remove expense.', error: err?.message });
  }
});

budgetRouter.patch('/:tripId/expenses/:expenseId', optionalAuth, async(req:AuthenticatedRequest,res,next)=>{try{
 const input=z.object({title:z.string().trim().min(1).max(160),amount:z.number().finite().positive().max(100000000)}).parse(req.body);
 if(String(req.params.expenseId).startsWith('booking-')){res.status(409).json({message:'Booking expenses follow the confirmed reservation and cannot be edited manually.'});return;}
 const budget=await BudgetModel.findOneAndUpdate({id:req.params.tripId,'expenses.id':req.params.expenseId},{$set:{'expenses.$.title':input.title,'expenses.$.amount':input.amount}},{new:true});
 if(!budget){res.status(404).json({message:'Expense not found.'});return;}
 await notifyTrip(String(req.params.tripId),'Expense updated',`${req.user!.name} updated ${input.title}: ₹${input.amount}.`);res.json({budget});
}catch(error){next(error);}});
