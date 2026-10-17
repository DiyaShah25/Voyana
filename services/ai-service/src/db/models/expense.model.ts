/**
 * Expense & Budget Transaction Mongoose Model for MongoDB
 * Schema definition for trip expense recording, category tracking,
 * and multi-member debt minimization splits.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  expenseId: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  category: 'Flights' | 'Accommodations' | 'Food & Dining' | 'Activities' | 'Transport' | 'Shopping' | 'Misc';
  paidBy: string;
  splitAmong: string[];
  date: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema = new Schema(
  {
    expenseId: { type: String, required: true, unique: true, index: true },
    tripId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    category: {
      type: String,
      enum: ['Flights', 'Accommodations', 'Food & Dining', 'Activities', 'Transport', 'Shopping', 'Misc'],
      required: true,
      index: true,
    },
    paidBy: { type: String, required: true },
    splitAmong: { type: [String], default: [] },
    date: { type: String, required: true },
    paymentMethod: { type: String, default: 'Credit Card' },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const ExpenseModel =
  mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema, 'expenses');
