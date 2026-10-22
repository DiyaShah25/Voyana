/**
 * Budget & Expense Mongoose Model
 * Manages category allocations, member expenses, transaction ledgers,
 * and cost settlements across trips.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBudgetExpense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  paidBy: string;
  splitAmong: string[];
  paymentMethod?: string;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface IBudgetAllocation {
  category: string;
  allocated: number;
  color: string;
}

export interface IBudget extends Document {
  id: string;
  tripId?: string;
  destination: string;
  totalBudget: number;
  currency: string;
  members: string[];
  allocations: IBudgetAllocation[];
  expenses: IBudgetExpense[];
  createdAt: Date;
  updatedAt: Date;
}

const BudgetExpenseSchema = new Schema<IBudgetExpense>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    category: { type: String, required: true },
    date: { type: String, required: true },
    paidBy: { type: String, required: true },
    splitAmong: [{ type: String }],
    paymentMethod: { type: String },
    notes: { type: String },
    receiptUrl: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const BudgetAllocationSchema = new Schema<IBudgetAllocation>(
  {
    category: { type: String, required: true },
    allocated: { type: Number, required: true, min: 0 },
    color: { type: String, default: '#635BFF' },
  },
  { _id: false }
);

const BudgetSchema = new Schema<IBudget>(
  {
    id: { type: String, required: true, unique: true, index: true },
    tripId: { type: String, index: true },
    destination: { type: String, required: true },
    totalBudget: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    members: [{ type: String }],
    allocations: { type: [BudgetAllocationSchema], default: [] },
    expenses: { type: [BudgetExpenseSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const BudgetModel: Model<IBudget> =
  mongoose.models.Budget || mongoose.model<IBudget>('Budget', BudgetSchema);
