import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  PieChart,
  Users,
  Sparkles,
  TrendingUp,
  AlertCircle,
  X,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Filter,
  Calendar,
  Receipt,
  Wallet,
  Download,
  Sliders,
  Check,
  Plane,
  Building2,
  Utensils,
  Compass,
  Car,
  ShoppingBag,
  Layers,
} from 'lucide-react';
import {
  getTripBudget,
  addExpense,
  deleteExpense,
  updateBudgetTotal,
  calculateCategoryBreakdown,
  calculateBalances,
  generateAiBudgetAnalysis,
  generateAiBudgetPlan,
  settleDebtTransfer,
  exportExpensesCsv,
  type TripBudget,
  type ExpenseCategory,
  type PaymentMethod,
  type AiBudgetReport,
} from '@/services/budgetService';

interface BudgetPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination?: string;
  onOpenChatWithPrompt?: (prompt: string) => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Flights',
  'Accommodations',
  'Food & Dining',
  'Activities',
  'Transport',
  'Shopping',
  'Miscellaneous',
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'Credit Card',
  'Debit Card / UPI',
  'Cash',
  'Bank Transfer',
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  AED: 'د.إ',
};

const CATEGORY_ICONS: Record<ExpenseCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  Flights: Plane,
  Accommodations: Building2,
  'Food & Dining': Utensils,
  Activities: Compass,
  Transport: Car,
  Shopping: ShoppingBag,
  Miscellaneous: Layers,
};

export const BudgetPlannerModal: React.FC<BudgetPlannerModalProps> = ({
  isOpen,
  onClose,
  destination = 'Paris',
  onOpenChatWithPrompt,
}) => {
  const [budget, setBudget] = useState<TripBudget>(getTripBudget);
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'split' | 'ai-report'>('overview');

  // Expense Form State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Food & Dining');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expensePaidBy, setExpensePaidBy] = useState(budget.members[0] || 'Diya Shah');
  const [expenseSplitAmong, setExpenseSplitAmong] = useState<string[]>(budget.members);
  const [expenseNotes, setExpenseNotes] = useState('');

  // Category & Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');

  // Budget Edit State
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [newTotalInput, setNewTotalInput] = useState(String(budget.totalBudget));

  // AI Report State
  const [aiReport, setAiReport] = useState<AiBudgetReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // VPM-57: AI Generate Budget Plan Wizard State
  const [isAiWizardOpen, setIsAiWizardOpen] = useState(false);
  const [wizardTravelers, setWizardTravelers] = useState(3);
  const [wizardDays, setWizardDays] = useState(5);
  const [wizardStyle, setWizardStyle] = useState<'budget' | 'moderate' | 'luxury'>('moderate');
  const [wizardCustomBudget, setWizardCustomBudget] = useState('');
  const [wizardPreview, setWizardPreview] = useState<ReturnType<typeof generateAiBudgetPlan> | null>(null);
  const [settledSuccessNotice, setSettledSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getTripBudget();
      setBudget(current);
      setNewTotalInput(String(current.totalBudget));
      setExpensePaidBy(current.members[0] || 'Diya Shah');
      setExpenseSplitAmong(current.members);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalSpent = budget.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget.totalBudget - totalSpent;
  const percentSpent = Math.min(Math.round((totalSpent / budget.totalBudget) * 100), 100);
  const breakdowns = calculateCategoryBreakdown(budget);
  const { balances, settlements } = calculateBalances(budget);
  const currencySymbol = CURRENCY_SYMBOLS[budget.currency] || '$';

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount || isNaN(Number(expenseAmount))) return;

    const updated = addExpense({
      title: expenseTitle.trim(),
      amount: parseFloat(expenseAmount),
      currency: budget.currency,
      category: expenseCategory,
      paymentMethod: expensePaymentMethod,
      date: expenseDate,
      paidBy: expensePaidBy,
      splitAmong: expenseSplitAmong.length > 0 ? expenseSplitAmong : budget.members,
      notes: expenseNotes.trim() || undefined,
    });

    setBudget(updated);
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseNotes('');
    setIsAddExpenseOpen(false);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = deleteExpense(id);
    setBudget(updated);
  };

  const handleUpdateTotal = () => {
    const val = parseFloat(newTotalInput);
    if (!isNaN(val) && val > 0) {
      const updated = updateBudgetTotal(val);
      setBudget(updated);
      setIsEditingTotal(false);
    }
  };

  const handleRunAiAnalysis = () => {
    setIsGeneratingReport(true);
    setTimeout(() => {
      const report = generateAiBudgetAnalysis(budget);
      setAiReport(report);
      setIsGeneratingReport(false);
    }, 600);
  };

  // VPM-57: Run AI Budget Plan Generator Preview
  const handleGeneratePlanPreview = () => {
    const customVal = parseFloat(wizardCustomBudget);
    const plan = generateAiBudgetPlan({
      destination,
      totalBudget: !isNaN(customVal) && customVal > 0 ? customVal : undefined,
      travelersCount: wizardTravelers,
      durationDays: wizardDays,
      style: wizardStyle,
      currency: budget.currency,
    });
    setWizardPreview(plan);
  };

  const handleApplyAiBudgetPlan = () => {
    if (!wizardPreview) return;
    setBudget(wizardPreview.budget);
    setNewTotalInput(String(wizardPreview.budget.totalBudget));
    setIsAiWizardOpen(false);
    setWizardPreview(null);
  };

  // VPM-85: Settle a peer transfer
  const handleSettleUp = (from: string, to: string, amount: number) => {
    const updated = settleDebtTransfer(from, to, amount);
    setBudget(updated);
    setSettledSuccessNotice(`Recorded settlement: ${from} paid ${currencySymbol}${amount.toLocaleString()} to ${to}!`);
    setTimeout(() => setSettledSuccessNotice(null), 4000);
  };

  // VPM-70: Export CSV
  const handleExportCsv = () => {
    const csvContent = exportExpensesCsv(budget);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Voyana_${destination}_Expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredExpenses = budget.expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.paidBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedFilterCategory === 'all' || e.category === selectedFilterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="budget-modal-title">
      <div className="modal-container budget-modal" style={{ maxWidth: '1000px' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="modal-icon-badge" style={{ background: 'rgba(99,91,255,0.2)', color: '#a5a0ff' }}>
              <Wallet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="budget-modal-title" className="modal-title">Trip Budget Planner</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  VPM-57 • VPM-70 • VPM-85
                </span>
              </div>
              <p className="modal-subtitle">{destination} • {budget.members.length} Travelers Collaborative Budget</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsAiWizardOpen(true);
                handleGeneratePlanPreview();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(99,91,255,0.3), rgba(236,72,153,0.3))',
                border: '1px solid rgba(99,91,255,0.4)',
                color: '#e2e8f0',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Sparkles size={14} className="text-pink-400" />
              <span>AI Auto-Plan Budget</span>
            </button>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="budget-nav-tabs">
          <button
            className={`budget-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <PieChart size={15} /> Categories & Breakdown
          </button>
          <button
            className={`budget-tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            <Receipt size={15} /> Expense Tracking ({budget.expenses.length})
          </button>
          <button
            className={`budget-tab-btn ${activeTab === 'split' ? 'active' : ''}`}
            onClick={() => setActiveTab('split')}
          >
            <Users size={15} /> Calculate Shares & Settlements
          </button>
          <button
            className={`budget-tab-btn ${activeTab === 'ai-report' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('ai-report');
              if (!aiReport) handleRunAiAnalysis();
            }}
          >
            <Sparkles size={15} /> AI Audit & Insights
          </button>
        </div>

        {/* Notice Banner */}
        {settledSuccessNotice && (
          <div
            style={{
              background: 'rgba(16,185,129,0.15)',
              borderBottom: '1px solid rgba(16,185,129,0.3)',
              color: '#6ee7b7',
              padding: '8px 24px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={15} />
            <span>{settledSuccessNotice}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="modal-body-scroll">
          {/* Top Summary Cards */}
          <div className="budget-summary-grid">
            <div className="budget-stat-card">
              <span className="stat-card-label">Total Allocated</span>
              {isEditingTotal ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={newTotalInput}
                    onChange={(e) => setNewTotalInput(e.target.value)}
                    className="budget-inline-input"
                  />
                  <button onClick={handleUpdateTotal} className="budget-mini-save-btn">Save</button>
                </div>
              ) : (
                <div className="stat-card-value flex items-center justify-between">
                  <span>{currencySymbol}{budget.totalBudget.toLocaleString()}</span>
                  <button
                    onClick={() => setIsEditingTotal(true)}
                    className="stat-edit-link"
                    title="Edit total budget"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div className="budget-stat-card">
              <span className="stat-card-label">Total Spent</span>
              <div className="stat-card-value text-indigo-300">
                {currencySymbol}{totalSpent.toLocaleString()}
                <span className="stat-card-sub">({percentSpent}%)</span>
              </div>
            </div>

            <div className="budget-stat-card">
              <span className="stat-card-label">Remaining Buffer</span>
              <div className={`stat-card-value ${remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currencySymbol}{remaining.toLocaleString()}
              </div>
            </div>

            <div className="budget-stat-card">
              <span className="stat-card-label">Avg Daily Spend</span>
              <div className="stat-card-value text-amber-300">
                {currencySymbol}{Math.round(totalSpent / 5).toLocaleString()}
                <span className="stat-card-sub">/day</span>
              </div>
            </div>
          </div>

          {/* Overall Progress Meter */}
          <div className="overall-budget-progress-wrap">
            <div className="progress-info-row">
              <span className="text-xs text-slate-400">Total Group Spending Pace</span>
              <span className={`text-xs font-semibold ${percentSpent > 90 ? 'text-rose-400' : 'text-slate-300'}`}>
                {percentSpent}% of total cap utilized ({remaining >= 0 ? `${currencySymbol}${remaining.toLocaleString()} safe` : `${currencySymbol}${Math.abs(remaining).toLocaleString()} over budget`})
              </span>
            </div>
            <div className="overall-progress-track">
              <div
                className={`overall-progress-fill ${percentSpent > 90 ? 'bg-rose-500' : percentSpent > 75 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                style={{ width: `${percentSpent}%` }}
              />
            </div>
          </div>

          {/* TAB 1: OVERVIEW & CATEGORIES (VPM-88) */}
          {activeTab === 'overview' && (
            <div className="tab-content-fade">
              <div className="section-title-row">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Category Allocations & Variance</h3>
                  <p className="text-xs text-slate-400">Categorized caps vs actual recorded expenses</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="add-expense-trigger-btn"
                    onClick={() => setIsAddExpenseOpen(true)}
                  >
                    <Plus size={15} /> Record Expense
                  </button>
                </div>
              </div>

              <div className="category-breakdown-grid">
                {breakdowns.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.category] || Layers;
                  const isOver = cat.spent > cat.allocated;
                  return (
                    <div
                      key={cat.category}
                      className="category-card"
                      style={{
                        borderColor: isOver ? 'rgba(244,63,94,0.4)' : undefined,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedFilterCategory(cat.category);
                        setActiveTab('expenses');
                      }}
                      title="Click to view expenses in this category"
                    >
                      <div className="category-card-header">
                        <div className="flex items-center gap-2">
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              background: `${cat.color}20`,
                              display: 'grid',
                              placeItems: 'center',
                              color: cat.color,
                            }}
                          >
                            <Icon size={14} />
                          </div>
                          <div>
                            <span className="cat-name">{cat.category}</span>
                            {isOver && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  color: '#fb7185',
                                  background: 'rgba(244,63,94,0.15)',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  marginLeft: '6px',
                                }}
                              >
                                OVER CAP
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="cat-spent">
                          {currencySymbol}{cat.spent.toLocaleString()} / <small>{currencySymbol}{cat.allocated.toLocaleString()}</small>
                        </span>
                      </div>

                      <div className="category-progress-track">
                        <div
                          className="category-progress-fill"
                          style={{
                            width: `${cat.percentSpent}%`,
                            backgroundColor: isOver ? '#f43f5e' : cat.color,
                          }}
                        />
                      </div>

                      <div className="category-card-footer">
                        <span>{cat.percentSpent}% utilized</span>
                        <span className={cat.remaining < 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                          {cat.remaining >= 0 ? `${currencySymbol}${cat.remaining.toLocaleString()} left` : `${currencySymbol}${Math.abs(cat.remaining).toLocaleString()} over`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: EXPENSES HISTORY & TRACKING (VPM-70) */}
          {activeTab === 'expenses' && (
            <div className="tab-content-fade">
              <div className="expense-toolbar">
                <div className="expense-search-wrap">
                  <Filter size={15} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search expenses, payer, notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="expense-search-input"
                  />
                </div>

                <div className="expense-filter-select-wrap">
                  <select
                    value={selectedFilterCategory}
                    onChange={(e) => setSelectedFilterCategory(e.target.value)}
                    aria-label="Filter by expense category"
                    className="expense-select"
                  >
                    <option value="all">All Categories ({budget.expenses.length})</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCsv}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Export expense log to CSV file"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>
                  <button
                    className="add-expense-trigger-btn"
                    onClick={() => setIsAddExpenseOpen(true)}
                  >
                    <Plus size={15} /> Add Expense
                  </button>
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="empty-state-box">
                  <Receipt size={36} className="text-slate-500 mb-2" />
                  <p className="text-slate-300 font-medium">No expenses match criteria</p>
                  <p className="text-slate-500 text-sm">Clear filters or record a new group payment</p>
                </div>
              ) : (
                <div className="expenses-table-wrap">
                  <table className="expenses-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description & Method</th>
                        <th>Category</th>
                        <th>Paid By</th>
                        <th>Split Share</th>
                        <th className="text-right">Amount</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((exp) => (
                        <tr key={exp.id}>
                          <td className="text-slate-400 text-sm whitespace-nowrap">
                            <Calendar size={13} className="inline mr-1 opacity-70" />
                            {exp.date}
                          </td>
                          <td>
                            <div className="font-semibold text-slate-200">{exp.title}</div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              {exp.paymentMethod && (
                                <span className="text-indigo-400 font-medium">
                                  💳 {exp.paymentMethod}
                                </span>
                              )}
                              {exp.notes && <span>• {exp.notes}</span>}
                            </div>
                          </td>
                          <td>
                            <span className="expense-category-pill">{exp.category}</span>
                          </td>
                          <td>
                            <span className="font-medium text-indigo-300">{exp.paidBy}</span>
                          </td>
                          <td className="text-slate-400 text-sm">
                            {exp.splitAmong.length === budget.members.length ? (
                              <span className="text-slate-300">Split (All {budget.members.length})</span>
                            ) : (
                              <span className="text-amber-300">{exp.splitAmong.join(', ')}</span>
                            )}
                          </td>
                          <td className="text-right font-bold text-slate-100">
                            {currencySymbol}{exp.amount.toLocaleString()}
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="delete-expense-btn"
                              title="Delete expense"
                              aria-label={`Delete expense ${exp.title}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GROUP SPLIT & CALCULATE SHARES (VPM-85) */}
          {activeTab === 'split' && (
            <div className="tab-content-fade">
              <div className="split-grid">
                {/* Member Net Balances */}
                <div className="split-card">
                  <h4 className="split-card-title flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users size={16} className="text-indigo-400" /> Member Shares & Balance Matrix
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {budget.members.length} Members
                    </span>
                  </h4>
                  <div className="space-y-3 mt-3">
                    {balances.map((b) => (
                      <div key={b.member} className="member-balance-row">
                        <div>
                          <div className="font-semibold text-slate-200">{b.member}</div>
                          <div className="text-xs text-slate-400">
                            Fronted: <strong className="text-slate-200">{currencySymbol}{b.totalPaid.toLocaleString()}</strong> • Fair Share: <strong className="text-slate-200">{currencySymbol}{b.totalShare.toLocaleString()}</strong>
                          </div>
                        </div>
                        <div className={`font-bold ${b.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {b.netBalance >= 0 ? `+${currencySymbol}${b.netBalance.toLocaleString()}` : `-${currencySymbol}${Math.abs(b.netBalance).toLocaleString()}`}
                          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-90 text-right">
                            {b.netBalance >= 0 ? 'gets refunded' : 'owes group'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settle Up Transfers */}
                <div className="split-card">
                  <h4 className="split-card-title flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CreditCard size={16} className="text-teal-400" /> Simplified Debt Settlements
                    </span>
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-bold">
                      Greedy Min-Transfer
                    </span>
                  </h4>
                  <div className="mt-3">
                    {settlements.length === 0 ? (
                      <div className="settled-clean-box">
                        <CheckCircle2 size={28} className="text-emerald-400 mb-1" />
                        <span className="text-slate-200 font-bold text-sm">Everyone is Settled Up!</span>
                        <span className="text-slate-400 text-xs">No pending debts or reimbursement transfers required.</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-xs text-slate-400 mb-2">
                          Optimized peer transfers to balance all group accounts with fewest payments:
                        </p>
                        {settlements.map((s, idx) => (
                          <div key={idx} className="settlement-transfer-card flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-rose-300">{s.from}</span>
                              <ArrowRight size={14} className="text-slate-400" />
                              <span className="font-bold text-emerald-300">{s.to}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-100 text-sm">
                                {currencySymbol}{s.amount.toLocaleString()}
                              </span>
                              <button
                                onClick={() => handleSettleUp(s.from, s.to, s.amount)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: '#fff',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="Record this transfer as settled"
                              >
                                <Check size={12} /> Settle
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI BUDGET ANALYSIS & AUDIT */}
          {activeTab === 'ai-report' && (
            <div className="tab-content-fade">
              {isGeneratingReport ? (
                <div className="ai-loading-box">
                  <Sparkles size={28} className="animate-spin text-indigo-400 mb-2" />
                  <p className="text-slate-200 font-semibold">Voyana AI is evaluating your group budget…</p>
                  <p className="text-slate-400 text-xs">Analyzing category variance, currency exchange buffers, and burn rate</p>
                </div>
              ) : aiReport ? (
                <div className="ai-report-wrap space-y-4">
                  <div className="ai-health-banner">
                    <div className="flex items-center gap-3">
                      <div className="health-score-dial">
                        <span className="score-num">{aiReport.healthScore}</span>
                        <span className="score-denom">/100</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-slate-100">Budget Health: {aiReport.status.toUpperCase()}</span>
                          <span className={`status-pill ${aiReport.status}`}>{aiReport.status}</span>
                        </div>
                        <p className="text-slate-300 text-sm">
                          Projected final spend: <strong>{currencySymbol}{aiReport.projectedSpend.toLocaleString()}</strong> ({aiReport.projectedSpend <= budget.totalBudget ? 'Within safe budget' : 'Risk of overspend'})
                        </p>
                      </div>
                    </div>
                    <button
                      className="ai-reanalyze-btn"
                      onClick={handleRunAiAnalysis}
                    >
                      <Sparkles size={14} /> Refresh AI Audit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="ai-insights-card">
                      <h4 className="flex items-center gap-2 text-indigo-300 font-semibold mb-2">
                        <TrendingUp size={16} /> Key Insights & Highlights
                      </h4>
                      <ul className="space-y-2 text-sm text-slate-300">
                        {aiReport.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-indigo-400 mt-1">•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="ai-insights-card">
                      <h4 className="flex items-center gap-2 text-emerald-300 font-semibold mb-2">
                        <Sparkles size={16} /> Actionable Recommendations
                      </h4>
                      <ul className="space-y-2 text-sm text-slate-300">
                        {aiReport.recommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {onOpenChatWithPrompt && (
                    <div className="ai-chat-prompt-banner">
                      <span>Want more custom budget advice for {destination}?</span>
                      <button
                        className="budget-to-chat-btn"
                        onClick={() => {
                          onOpenChatWithPrompt(`Can you help optimize our ${destination} dining, activities and transport budget?`);
                          onClose();
                        }}
                      >
                        Ask Voyana AI Assistant <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ─── MODAL: RECORD NEW EXPENSE ─────────────────────────────────── */}
        {isAddExpenseOpen && (
          <div className="sub-modal-overlay">
            <div className="sub-modal-card">
              <div className="sub-modal-header">
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <Plus size={16} className="text-indigo-400" /> Record New Expense
                </h3>
                <button onClick={() => setIsAddExpenseOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="sub-modal-form">
                <div>
                  <label className="sub-label">Expense Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Louvre tickets, Le Marais bistro dinner, Airport taxi"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    className="sub-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="sub-label">Amount ({currencySymbol}) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="sub-input"
                    />
                  </div>
                  <div>
                    <label className="sub-label">Category *</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                      className="sub-select"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="sub-label">Date *</label>
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="sub-input"
                    />
                  </div>
                  <div>
                    <label className="sub-label">Payment Method</label>
                    <select
                      value={expensePaymentMethod}
                      onChange={(e) => setExpensePaymentMethod(e.target.value as PaymentMethod)}
                      className="sub-select"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="sub-label">Paid By *</label>
                  <select
                    value={expensePaidBy}
                    onChange={(e) => setExpensePaidBy(e.target.value)}
                    className="sub-select"
                  >
                    {budget.members.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="sub-label">Split Among Members</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {budget.members.map((m) => {
                      const isChecked = expenseSplitAmong.includes(m);
                      return (
                        <button
                          type="button"
                          key={m}
                          className={`member-chip-toggle ${isChecked ? 'selected' : ''}`}
                          onClick={() => {
                            if (isChecked) {
                              if (expenseSplitAmong.length > 1) {
                                setExpenseSplitAmong(expenseSplitAmong.filter((x) => x !== m));
                              }
                            } else {
                              setExpenseSplitAmong([...expenseSplitAmong, m]);
                            }
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="sub-label">Notes or Booking Ref (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Booking ref #1042, split with Diya & Tirth"
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    className="sub-input"
                  />
                </div>

                <div className="sub-modal-footer">
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseOpen(false)}
                    className="sub-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="sub-submit-btn">
                    Save Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: AI GENERATE BUDGET PLAN WIZARD (VPM-57) ─────────────── */}
        {isAiWizardOpen && (
          <div className="sub-modal-overlay">
            <div className="sub-modal-card" style={{ maxWidth: '560px' }}>
              <div className="sub-modal-header">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 grid place-items-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">AI Budget Plan Generator</h3>
                    <p className="text-[11px] text-slate-400">Intelligent category allocation for {destination}</p>
                  </div>
                </div>
                <button onClick={() => setIsAiWizardOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Input Parameters */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="sub-label">Travelers</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={wizardTravelers}
                      onChange={(e) => {
                        setWizardTravelers(parseInt(e.target.value) || 1);
                      }}
                      className="sub-input"
                    />
                  </div>
                  <div>
                    <label className="sub-label">Duration (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={wizardDays}
                      onChange={(e) => {
                        setWizardDays(parseInt(e.target.value) || 1);
                      }}
                      className="sub-input"
                    />
                  </div>
                  <div>
                    <label className="sub-label">Travel Style</label>
                    <select
                      value={wizardStyle}
                      onChange={(e) => {
                        setWizardStyle(e.target.value as any);
                      }}
                      className="sub-select"
                    >
                      <option value="budget">Backpacker ($)</option>
                      <option value="moderate">Moderate ($$)</option>
                      <option value="luxury">Luxury ($$$)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="sub-label">Custom Target Budget ({currencySymbol}) — Optional</label>
                  <input
                    type="number"
                    placeholder="Leave empty for AI recommended estimate"
                    value={wizardCustomBudget}
                    onChange={(e) => setWizardCustomBudget(e.target.value)}
                    className="sub-input"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePlanPreview}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '10px',
                    background: 'rgba(99,91,255,0.2)',
                    border: '1px solid rgba(99,91,255,0.4)',
                    color: '#c4b5fd',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Recalculate Allocations
                </button>

                {/* Preview */}
                {wizardPreview && (
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-bold">Suggested Total:</span>
                      <span className="text-base font-extrabold text-indigo-300">
                        {currencySymbol}{wizardPreview.budget.totalBudget.toLocaleString()}
                        <small className="text-xs text-slate-400 font-normal ml-1">
                          (~{currencySymbol}{wizardPreview.dailyPerPerson}/person/day)
                        </small>
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {wizardPreview.allocations.map((a) => (
                        <div key={a.category} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/5">
                          <span className="text-slate-300 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                            {a.category}
                          </span>
                          <span className="font-bold text-slate-100">
                            {currencySymbol}{a.allocated.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-slate-300 space-y-1">
                      {wizardPreview.insights.map((ins, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-indigo-400">•</span>
                          <span>{ins}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="sub-modal-footer">
                  <button
                    type="button"
                    onClick={() => setIsAiWizardOpen(false)}
                    className="sub-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAiBudgetPlan}
                    className="sub-submit-btn"
                    disabled={!wizardPreview}
                  >
                    Apply Budget Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetPlannerModal;
