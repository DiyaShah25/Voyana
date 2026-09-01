export type ExpenseCategory =
  | 'Flights'
  | 'Accommodations'
  | 'Food & Dining'
  | 'Activities'
  | 'Transport'
  | 'Shopping'
  | 'Miscellaneous';

export type PaymentMethod = 'Credit Card' | 'Debit Card / UPI' | 'Cash' | 'Bank Transfer';

export interface TripExpense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: string;
  paidBy: string; // e.g. 'Diya', 'Tirth', 'Jagrat'
  splitAmong: string[]; // members splitting this
  paymentMethod?: PaymentMethod;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface BudgetCategoryAllocation {
  category: ExpenseCategory;
  allocated: number;
  color: string;
}

export interface TripBudget {
  id: string;
  destination: string;
  totalBudget: number;
  currency: string;
  members: string[];
  allocations: BudgetCategoryAllocation[];
  expenses: TripExpense[];
}

export interface MemberBalance {
  member: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // positive = owed money, negative = owes money
}

export interface SettlementTransfer {
  from: string;
  to: string;
  amount: number;
}

export interface AiBudgetReport {
  healthScore: number; // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical';
  projectedSpend: number;
  burnRatePerDay: number;
  topSpender: string;
  highlights: string[];
  recommendations: string[];
}

const STORAGE_KEY = 'voyana_trip_budget_v1';

const INITIAL_BUDGET: TripBudget = {
  id: 'trip-paris-01',
  destination: 'Paris',
  totalBudget: 4200,
  currency: 'USD',
  members: ['Diya Shah', 'Tirth Gandhi', 'Jagrat Kumar'],
  allocations: [
    { category: 'Flights', allocated: 1400, color: '#635BFF' },
    { category: 'Accommodations', allocated: 1200, color: '#00D4B2' },
    { category: 'Food & Dining', allocated: 750, color: '#FF9900' },
    { category: 'Activities', allocated: 450, color: '#EC4899' },
    { category: 'Transport', allocated: 250, color: '#3B82F6' },
    { category: 'Shopping', allocated: 100, color: '#8B5CF6' },
    { category: 'Miscellaneous', allocated: 50, color: '#64748B' },
  ],
  expenses: [
    {
      id: 'exp-1',
      title: 'Roundtrip Flights (Air France)',
      amount: 1280,
      currency: 'USD',
      category: 'Flights',
      date: '2026-09-10',
      paidBy: 'Diya Shah',
      splitAmong: ['Diya Shah', 'Tirth Gandhi', 'Jagrat Kumar'],
      notes: 'Direct flights from JFK to CDG',
      createdAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 'exp-2',
      title: 'Boutique Hotel Le Marais (4 Nights)',
      amount: 890,
      currency: 'USD',
      category: 'Accommodations',
      date: '2026-09-12',
      paidBy: 'Tirth Gandhi',
      splitAmong: ['Diya Shah', 'Tirth Gandhi', 'Jagrat Kumar'],
      notes: 'Deluxe Triple Suite',
      createdAt: '2026-09-12T14:30:00Z',
    },
    {
      id: 'exp-3',
      title: 'Louvre Guided VIP Tickets',
      amount: 195,
      currency: 'USD',
      category: 'Activities',
      date: '2026-09-13',
      paidBy: 'Jagrat Kumar',
      splitAmong: ['Diya Shah', 'Tirth Gandhi', 'Jagrat Kumar'],
      notes: 'Fast track access + audio guide',
      createdAt: '2026-09-13T09:15:00Z',
    },
    {
      id: 'exp-4',
      title: 'Dinner at Le Comptoir du Relais',
      amount: 165,
      currency: 'USD',
      category: 'Food & Dining',
      date: '2026-09-14',
      paidBy: 'Diya Shah',
      splitAmong: ['Diya Shah', 'Tirth Gandhi', 'Jagrat Kumar'],
      notes: 'Wine & authentic bistro menu',
      createdAt: '2026-09-14T20:45:00Z',
    },
    {
      id: 'exp-5',
      title: 'Metro Navigo Travel Passes',
      amount: 90,
      currency: 'USD',
      category: 'Transport',
      date: '2026-09-15',
      paidBy: 'Tirth Gandhi',
      splitAmong: ['Diya Shah', 'Tirth Gandhi', 'Jagrat Kumar'],
      notes: 'All zones 1-5 pass',
      createdAt: '2026-09-15T08:00:00Z',
    },
  ],
};

export function getTripBudget(): TripBudget {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading budget from localStorage', e);
  }
  return INITIAL_BUDGET;
}

export function saveTripBudget(budget: TripBudget): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
  } catch (e) {
    console.error('Error saving budget to localStorage', e);
  }
}

export function addExpense(expense: Omit<TripExpense, 'id' | 'createdAt'>): TripBudget {
  const current = getTripBudget();
  const newExpense: TripExpense = {
    ...expense,
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  const updated: TripBudget = {
    ...current,
    expenses: [newExpense, ...current.expenses],
  };

  saveTripBudget(updated);
  return updated;
}

export function deleteExpense(expenseId: string): TripBudget {
  const current = getTripBudget();
  const updated: TripBudget = {
    ...current,
    expenses: current.expenses.filter((e) => e.id !== expenseId),
  };
  saveTripBudget(updated);
  return updated;
}

export function updateBudgetTotal(newTotal: number, currency?: string): TripBudget {
  const current = getTripBudget();
  const updated: TripBudget = {
    ...current,
    totalBudget: newTotal,
    currency: currency || current.currency,
  };
  saveTripBudget(updated);
  return updated;
}

export function calculateCategoryBreakdown(budget: TripBudget): Array<{
  category: ExpenseCategory;
  allocated: number;
  spent: number;
  remaining: number;
  percentSpent: number;
  color: string;
}> {
  return budget.allocations.map((alloc) => {
    const spent = budget.expenses
      .filter((e) => e.category === alloc.category)
      .reduce((sum, e) => sum + e.amount, 0);

    const remaining = alloc.allocated - spent;
    const percentSpent = alloc.allocated > 0 ? Math.min(Math.round((spent / alloc.allocated) * 100), 100) : 0;

    return {
      category: alloc.category,
      allocated: alloc.allocated,
      spent,
      remaining,
      percentSpent,
      color: alloc.color,
    };
  });
}

export function calculateBalances(budget: TripBudget): {
  balances: MemberBalance[];
  settlements: SettlementTransfer[];
} {
  const members = budget.members;
  const balancesMap: Record<string, { paid: number; share: number }> = {};

  members.forEach((m) => {
    balancesMap[m] = { paid: 0, share: 0 };
  });

  budget.expenses.forEach((expense) => {
    // Payer credited
    if (!balancesMap[expense.paidBy]) {
      balancesMap[expense.paidBy] = { paid: 0, share: 0 };
    }
    balancesMap[expense.paidBy].paid += expense.amount;

    // Split debited
    const splitCount = expense.splitAmong.length || 1;
    const perPerson = expense.amount / splitCount;

    expense.splitAmong.forEach((member) => {
      if (!balancesMap[member]) {
        balancesMap[member] = { paid: 0, share: 0 };
      }
      balancesMap[member].share += perPerson;
    });
  });

  const balances: MemberBalance[] = Object.keys(balancesMap).map((m) => {
    const { paid, share } = balancesMap[m];
    return {
      member: m,
      totalPaid: Math.round(paid * 100) / 100,
      totalShare: Math.round(share * 100) / 100,
      netBalance: Math.round((paid - share) * 100) / 100,
    };
  });

  // Calculate minimum settlement transactions (Greedy debt resolution)
  const debtors = balances.filter((b) => b.netBalance < -0.01).map((b) => ({ member: b.member, owed: -b.netBalance }));
  const creditors = balances.filter((b) => b.netBalance > 0.01).map((b) => ({ member: b.member, credit: b.netBalance }));

  const settlements: SettlementTransfer[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const amount = Math.min(debtor.owed, creditor.credit);

    if (amount > 0.01) {
      settlements.push({
        from: debtor.member,
        to: creditor.member,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.owed -= amount;
    creditor.credit -= amount;

    if (debtor.owed <= 0.01) dIdx++;
    if (creditor.credit <= 0.01) cIdx++;
  }

  return { balances, settlements };
}

export function generateAiBudgetAnalysis(budget: TripBudget): AiBudgetReport {
  const totalSpent = budget.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAllocated = budget.totalBudget;
  const remaining = totalAllocated - totalSpent;
  const percentUtilized = Math.round((totalSpent / totalAllocated) * 100);

  // Group by category
  const breakdown = calculateCategoryBreakdown(budget);
  const overSpentCategories = breakdown.filter((b) => b.spent > b.allocated);

  // Top spender
  const { balances } = calculateBalances(budget);
  const topSpender = balances.reduce((prev, curr) => (curr.totalPaid > prev.totalPaid ? curr : prev), balances[0])?.member || 'N/A';

  const daysEstimated = 5;
  const burnRate = Math.round((totalSpent / daysEstimated) * 100) / 100;

  let healthScore = 92;
  let status: AiBudgetReport['status'] = 'excellent';

  if (percentUtilized > 90) {
    healthScore = 55;
    status = 'warning';
  } else if (percentUtilized > 75) {
    healthScore = 78;
    status = 'good';
  }

  if (overSpentCategories.length > 0) {
    healthScore -= overSpentCategories.length * 10;
    if (healthScore < 50) status = 'critical';
  }

  const highlights = [
    `Total spend is currently at $${totalSpent.toLocaleString()} (${percentUtilized}% of $${totalAllocated.toLocaleString()} cap).`,
    `Remaining buffer across all categories: $${remaining.toLocaleString()}.`,
    `Average group burn rate is ~$${burnRate}/day across ${daysEstimated} days.`,
    `Primary contributor: ${topSpender} has fronted the largest share of initial bookings.`,
  ];

  const recommendations = [
    `Lock in pre-paid restaurant vouchers for upcoming group dinners to reduce on-the-spot surcharges by up to 15%.`,
    `Transport spend is well optimized ($90 out of $250 allocated) thanks to Navigo transit passes.`,
    `Ensure ${balances.find((b) => b.netBalance < 0)?.member || 'group members who owe balances'} settle pending flight shares before mid-trip.`,
  ];

  if (overSpentCategories.length > 0) {
    recommendations.unshift(
      `Warning: You have exceeded allocation in ${overSpentCategories.map((c) => c.category).join(', ')}. Rebalance from Miscellaneous or Shopping buffer.`
    );
  }

  return {
    healthScore: Math.max(healthScore, 30),
    status,
    projectedSpend: Math.round(totalSpent + burnRate * 2),
    burnRatePerDay: burnRate,
    topSpender,
    highlights,
    recommendations,
  };
}

/**
 * VPM-57: Generate AI Budget Plan
 * Intelligently generates category allocations based on destination, travel style, duration, and traveler count.
 */
export interface GenerateBudgetPlanOptions {
  destination: string;
  totalBudget?: number;
  travelersCount?: number;
  durationDays?: number;
  style?: 'budget' | 'moderate' | 'luxury';
  currency?: string;
}

export function generateAiBudgetPlan(options: GenerateBudgetPlanOptions): {
  budget: TripBudget;
  dailyPerPerson: number;
  allocations: BudgetCategoryAllocation[];
  insights: string[];
} {
  const {
    destination = 'Paris',
    travelersCount = 3,
    durationDays = 5,
    style = 'moderate',
    currency = 'USD',
  } = options;

  // Base daily per-person rates by style & destination tier
  const isTier1 = ['paris', 'tokyo', 'new york', 'london', 'zurich', 'dubai'].some((d) =>
    destination.toLowerCase().includes(d)
  );

  let dailyBase = style === 'budget' ? 80 : style === 'luxury' ? 380 : 170;
  if (isTier1) dailyBase = Math.round(dailyBase * 1.25);

  const calculatedTotal = options.totalBudget && options.totalBudget > 0
    ? options.totalBudget
    : dailyBase * durationDays * travelersCount;

  // Category percentage distribution based on travel style
  let ratios: Record<ExpenseCategory, number>;
  if (style === 'budget') {
    ratios = {
      Flights: 0.35,
      Accommodations: 0.28,
      'Food & Dining': 0.18,
      Activities: 0.08,
      Transport: 0.06,
      Shopping: 0.03,
      Miscellaneous: 0.02,
    };
  } else if (style === 'luxury') {
    ratios = {
      Flights: 0.30,
      Accommodations: 0.35,
      'Food & Dining': 0.18,
      Activities: 0.10,
      Transport: 0.04,
      Shopping: 0.02,
      Miscellaneous: 0.01,
    };
  } else {
    // Moderate
    ratios = {
      Flights: 0.33,
      Accommodations: 0.29,
      'Food & Dining': 0.18,
      Activities: 0.10,
      Transport: 0.05,
      Shopping: 0.03,
      Miscellaneous: 0.02,
    };
  }

  const categoryColors: Record<ExpenseCategory, string> = {
    Flights: '#635BFF',
    Accommodations: '#00D4B2',
    'Food & Dining': '#FF9900',
    Activities: '#EC4899',
    Transport: '#3B82F6',
    Shopping: '#8B5CF6',
    Miscellaneous: '#64748B',
  };

  const allocations: BudgetCategoryAllocation[] = (Object.keys(ratios) as ExpenseCategory[]).map((cat) => ({
    category: cat,
    allocated: Math.round(calculatedTotal * ratios[cat]),
    color: categoryColors[cat],
  }));

  // Ensure sum equals calculatedTotal
  const currentSum = allocations.reduce((s, a) => s + a.allocated, 0);
  const diff = calculatedTotal - currentSum;
  if (diff !== 0 && allocations.length > 0) {
    allocations[0].allocated += diff;
  }

  const current = getTripBudget();
  const updatedBudget: TripBudget = {
    ...current,
    destination,
    totalBudget: calculatedTotal,
    currency,
    allocations,
  };

  saveTripBudget(updatedBudget);

  const dailyPerPerson = Math.round(calculatedTotal / (durationDays * travelersCount));

  const insights = [
    `Recommended target: $${calculatedTotal.toLocaleString()} for ${travelersCount} travelers over ${durationDays} days (~$${dailyPerPerson}/person/day).`,
    `Largest allocation: Accommodations & Flights account for ${Math.round((ratios.Flights + ratios.Accommodations) * 100)}% of the total budget.`,
    `Dining & Activities buffer: $${(allocations.find((a) => a.category === 'Food & Dining')?.allocated || 0) + (allocations.find((a) => a.category === 'Activities')?.allocated || 0)} reserved for local experiences.`,
  ];

  return {
    budget: updatedBudget,
    dailyPerPerson,
    allocations,
    insights,
  };
}

/**
 * VPM-85: Settle a peer-to-peer balance
 */
export function settleDebtTransfer(from: string, to: string, amount: number): TripBudget {
  const current = getTripBudget();
  const settlementExpense: TripExpense = {
    id: `settle-${Date.now()}`,
    title: `Debt Settlement: ${from} → ${to}`,
    amount,
    currency: current.currency,
    category: 'Miscellaneous',
    date: new Date().toISOString().split('T')[0],
    paidBy: from,
    splitAmong: [to],
    notes: `Settlement payment to clear balance`,
    paymentMethod: 'Bank Transfer',
    createdAt: new Date().toISOString(),
  };

  const updated: TripBudget = {
    ...current,
    expenses: [settlementExpense, ...current.expenses],
  };

  saveTripBudget(updated);
  return updated;
}

/**
 * VPM-70 / VPM-88: Export expenses to CSV
 */
export function exportExpensesCsv(budget: TripBudget): string {
  const headers = ['ID', 'Date', 'Description', 'Category', 'Paid By', 'Split Among', 'Amount', 'Currency', 'Payment Method', 'Notes'];
  const rows = budget.expenses.map((e) => [
    `"${e.id}"`,
    `"${e.date}"`,
    `"${e.title.replace(/"/g, '""')}"`,
    `"${e.category}"`,
    `"${e.paidBy}"`,
    `"${e.splitAmong.join(', ')}"`,
    e.amount,
    `"${e.currency}"`,
    `"${e.paymentMethod || 'Credit Card'}"`,
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

