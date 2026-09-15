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
} from 'lucide-react';
import {
  getTripBudget,
  addExpense,
  deleteExpense,
  updateBudgetTotal,
  calculateCategoryBreakdown,
  calculateBalances,
  generateAiBudgetAnalysis,
  type TripBudget,
  type ExpenseCategory,
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  AED: 'د.إ',
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

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount || isNaN(Number(expenseAmount))) return;

    const updated = addExpense({
      title: expenseTitle.trim(),
      amount: parseFloat(expenseAmount),
      currency: budget.currency,
      category: expenseCategory,
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

  const filteredExpenses = budget.expenses.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.paidBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedFilterCategory === 'all' || e.category === selectedFilterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="budget-modal-title">
      <div className="modal-container budget-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="modal-icon-badge" style={{ background: 'rgba(99,91,255,0.2)', color: '#a5a0ff' }}>
              <Wallet size={20} />
            </div>
            <div>
              <h2 id="budget-modal-title" className="modal-title">Trip Budget Planner</h2>
              <p className="modal-subtitle">{destination} • {budget.members.length} Travelers Collaborative Budget</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="budget-nav-tabs">
          <button
            className={`budget-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <PieChart size={15} /> Overview & Categories
          </button>
          <button
            className={`budget-tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            <Receipt size={15} /> Expense History ({budget.expenses.length})
          </button>
          <button
            className={`budget-tab-btn ${activeTab === 'split' ? 'active' : ''}`}
            onClick={() => setActiveTab('split')}
          >
            <Users size={15} /> Group Settlement
          </button>
          <button
            className={`budget-tab-btn ${activeTab === 'ai-report' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('ai-report');
              if (!aiReport) handleRunAiAnalysis();
            }}
          >
            <Sparkles size={15} /> AI Analysis
          </button>
        </div>

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
              <span className="stat-card-label">Daily Burn Rate</span>
              <div className="stat-card-value text-amber-300">
                {currencySymbol}{Math.round(totalSpent / 5).toLocaleString()}
                <span className="stat-card-sub">/day</span>
              </div>
            </div>
          </div>

          {/* Overall Progress Meter */}
          <div className="overall-budget-progress-wrap">
            <div className="progress-info-row">
              <span>Overall Utilization</span>
              <span className="font-semibold">{percentSpent}% spent</span>
            </div>
            <div className="overall-progress-track">
              <div
                className={`overall-progress-fill ${percentSpent > 90 ? 'bg-rose-500' : percentSpent > 75 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                style={{ width: `${percentSpent}%` }}
              />
            </div>
          </div>

          {/* TAB 1: OVERVIEW & CATEGORIES */}
          {activeTab === 'overview' && (
            <div className="tab-content-fade">
              <div className="section-title-row">
                <h3>Category Allocations</h3>
                <button
                  className="add-expense-trigger-btn"
                  onClick={() => setIsAddExpenseOpen(true)}
                >
                  <Plus size={15} /> Record Expense
                </button>
              </div>

              <div className="category-breakdown-grid">
                {breakdowns.map((cat) => (
                  <div key={cat.category} className="category-card">
                    <div className="category-card-header">
                      <div className="flex items-center gap-2">
                        <span className="cat-color-dot" style={{ backgroundColor: cat.color }} />
                        <span className="cat-name">{cat.category}</span>
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
                          backgroundColor: cat.spent > cat.allocated ? '#f43f5e' : cat.color,
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
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: EXPENSES HISTORY */}
          {activeTab === 'expenses' && (
            <div className="tab-content-fade">
              <div className="expense-toolbar">
                <div className="expense-search-wrap">
                  <Filter size={15} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search expenses or payer..."
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
                    <option value="all">All Categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="add-expense-trigger-btn"
                  onClick={() => setIsAddExpenseOpen(true)}
                >
                  <Plus size={15} /> Add Expense
                </button>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="empty-state-box">
                  <Receipt size={36} className="text-slate-500 mb-2" />
                  <p className="text-slate-300 font-medium">No expenses found</p>
                  <p className="text-slate-500 text-sm">Add an expense to track your group spending</p>
                </div>
              ) : (
                <div className="expenses-table-wrap">
                  <table className="expenses-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Paid By</th>
                        <th>Split</th>
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
                            {exp.notes && <div className="text-xs text-slate-400">{exp.notes}</div>}
                          </td>
                          <td>
                            <span className="expense-category-pill">{exp.category}</span>
                          </td>
                          <td>
                            <span className="font-medium text-indigo-300">{exp.paidBy}</span>
                          </td>
                          <td className="text-slate-400 text-sm">
                            {exp.splitAmong.length === budget.members.length ? 'Split equally (all)' : `${exp.splitAmong.length} people`}
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

          {/* TAB 3: GROUP SPLIT SETTLEMENT */}
          {activeTab === 'split' && (
            <div className="tab-content-fade">
              <div className="split-grid">
                {/* Member Net Balances */}
                <div className="split-card">
                  <h4 className="split-card-title flex items-center gap-2">
                    <Users size={16} className="text-indigo-400" /> Member Balances
                  </h4>
                  <div className="space-y-3 mt-3">
                    {balances.map((b) => (
                      <div key={b.member} className="member-balance-row">
                        <div>
                          <div className="font-semibold text-slate-200">{b.member}</div>
                          <div className="text-xs text-slate-400">
                            Paid: {currencySymbol}{b.totalPaid.toLocaleString()} • Share: {currencySymbol}{b.totalShare.toLocaleString()}
                          </div>
                        </div>
                        <div className={`font-bold ${b.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {b.netBalance >= 0 ? `+${currencySymbol}${b.netBalance.toLocaleString()}` : `-${currencySymbol}${Math.abs(b.netBalance).toLocaleString()}`}
                          <div className="text-xs font-normal opacity-80 text-right">
                            {b.netBalance >= 0 ? 'gets back' : 'owes'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settle Up Transfers */}
                <div className="split-card">
                  <h4 className="split-card-title flex items-center gap-2">
                    <CreditCard size={16} className="text-teal-400" /> Suggested Transfers
                  </h4>
                  <div className="mt-3">
                    {settlements.length === 0 ? (
                      <div className="settled-clean-box">
                        <CheckCircle2 size={24} className="text-emerald-400 mb-1" />
                        <span className="text-slate-200 font-medium">All settled up!</span>
                        <span className="text-slate-400 text-xs">No pending group debts between members</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {settlements.map((s, idx) => (
                          <div key={idx} className="settlement-transfer-card">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-rose-300">{s.from}</span>
                              <ArrowRight size={14} className="text-slate-400" />
                              <span className="font-semibold text-emerald-300">{s.to}</span>
                            </div>
                            <div className="font-bold text-slate-100">
                              {currencySymbol}{s.amount.toLocaleString()}
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

          {/* TAB 4: AI BUDGET ANALYSIS (VPM-56) */}
          {activeTab === 'ai-report' && (
            <div className="tab-content-fade">
              {isGeneratingReport ? (
                <div className="ai-loading-box">
                  <Sparkles size={28} className="animate-spin text-indigo-400 mb-2" />
                  <p className="text-slate-200 font-semibold">Voyana AI is analyzing group spending patterns…</p>
                  <p className="text-slate-400 text-xs">Evaluating burn rate, category variances, and exchange optimizations</p>
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
                          Projected final spend: <strong>{currencySymbol}{aiReport.projectedSpend.toLocaleString()}</strong> ({aiReport.projectedSpend <= budget.totalBudget ? 'Within budget' : 'Projected overspend risk'})
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
                        <Sparkles size={16} /> Actionable AI Recommendations
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
                      <span>Have specific budget questions?</span>
                      <button
                        className="budget-to-chat-btn"
                        onClick={() => {
                          onOpenChatWithPrompt(`Can you help optimize our ${destination} dining and activities budget?`);
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

        {/* Add Expense Slide-over / Modal */}
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
                    placeholder="e.g. Louvre guided tickets, dinner at bistrot"
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
                  <label className="sub-label">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Booking ref #1042, split 50/50"
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
      </div>
    </div>
  );
};

export default BudgetPlannerModal;
