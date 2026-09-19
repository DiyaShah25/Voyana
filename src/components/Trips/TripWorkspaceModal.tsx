import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, MessageSquare, CheckSquare, BarChart3,
  DollarSign, FileText, Users, Plus, X, ArrowRight,
  MapPin, Clock, Send, Check, Sparkles, Share2,
  Trash2, Copy, AlertCircle, ShieldCheck, ChevronRight,
  CheckCircle2, Circle, ArrowUpRight, Tag, SlidersHorizontal
} from 'lucide-react';
import type { Trip, TripActivity, TripMember } from '@/services/tripService';
import {
  addTripMember,
  addTripActivity,
  deleteTripActivity,
  toggleActivityCompleted,
  calculateTripBudget,
} from '@/services/tripService';
import TripShareModal from './TripShareModal';
import {
  getTripChatMessages,
  sendTripChatMessage,
  getTripTasks,
  createTripTask,
  updateTripTaskStatus,
  getTripPolls,
  createTripPoll,
  voteTripPoll,
  getTripExpenses,
  addTripExpense,
  calculateDebtSettlement,
  getTripDocuments,
  uploadTripDocument,
  type TripChatMessage,
  type TripTask,
  type TripPoll,
  type TripExpense,
  type TripDocument,
  type TaskStatus,
} from '@/services/collaborationService';

export interface TripWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  currentUser?: { name: string; email: string };
}

type WorkspaceTab = 'itinerary' | 'chat' | 'tasks' | 'polls' | 'expenses' | 'documents';

export default function TripWorkspaceModal({
  isOpen,
  onClose,
  trip,
  currentUser = { name: 'Megha Lalwani', email: 'megha@voyana.com' },
}: TripWorkspaceModalProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('itinerary');

  // Collaboration State
  const [chatMessages, setChatMessages] = useState<TripChatMessage[]>([]);
  const [tasks, setTasks] = useState<TripTask[]>([]);
  const [polls, setPolls] = useState<TripPoll[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [documents, setDocuments] = useState<TripDocument[]>([]);

  // Input states
  const [newChatMessage, setNewChatMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // New Activity Form & Filters
  const [selectedDayFilter, setSelectedDayFilter] = useState<number>(0); // 0 = All Days
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [actTitle, setActTitle] = useState('');
  const [actTime, setActTime] = useState('10:00 AM');
  const [actDay, setActDay] = useState(1);
  const [actLocation, setActLocation] = useState('');
  const [actCategory, setActCategory] = useState('Sightseeing');
  const [actCost, setActCost] = useState(0);
  const [actDescription, setActDescription] = useState('');
  const [actAlsoAddExpense, setActAlsoAddExpense] = useState(false);

  // New Task Form
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState(currentUser.name);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskCategory, setTaskCategory] = useState('General');

  // New Poll Form
  const [showAddPoll, setShowAddPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // New Expense Form
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState(50);
  const [expPaidBy, setExpPaidBy] = useState(currentUser.name);
  const [expCategory, setExpCategory] = useState('Dining');

  // Invite Member / Share Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');

  const tripId = trip?.id || 'trip-user-01';

  const loadWorkspaceData = useCallback(async () => {
    if (!trip) return;
    const [c, t, p, e, d] = await Promise.all([
      getTripChatMessages(trip.id),
      getTripTasks(trip.id),
      getTripPolls(trip.id),
      getTripExpenses(trip.id),
      getTripDocuments(trip.id),
    ]);
    setChatMessages(c);
    setTasks(t);
    setPolls(p);
    setExpenses(e);
    setDocuments(d);
  }, [trip]);

  useEffect(() => {
    if (isOpen && trip) {
      loadWorkspaceData();
    }
  }, [isOpen, trip, loadWorkspaceData]);

  if (!isOpen || !trip) return null;

  // 1. Send Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;
    const sent = await sendTripChatMessage(trip.id, newChatMessage, currentUser.name);
    setChatMessages((prev) => [...prev, sent]);
    setNewChatMessage('');
  };

  // 2. Add Activity
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) return;
    
    await addTripActivity(trip.id, {
      dayNumber: actDay,
      timeSlot: actTime,
      title: actTitle,
      locationName: actLocation,
      category: actCategory,
      cost: actCost > 0 ? actCost : undefined,
      description: actDescription || undefined,
    });

    if (actAlsoAddExpense && actCost > 0) {
      const membersList = trip.members?.map((m) => m.name) || [currentUser.name, 'Bhavika Sainani', 'Diya Shah', 'Jagrat Kumar'];
      await addTripExpense(trip.id, {
        title: `Activity: ${actTitle}`,
        amount: actCost,
        paidBy: currentUser.name,
        category: actCategory === 'Dining' ? 'Dining' : actCategory === 'Transport' ? 'Transport' : 'Activities',
        splitBetween: membersList,
      });
    }

    setShowAddActivity(false);
    setActTitle('');
    setActLocation('');
    setActCost(0);
    setActDescription('');
    setActAlsoAddExpense(false);

    // Broadcast message in chat
    sendTripChatMessage(
      trip.id,
      `added a new activity for Day ${actDay}: "${actTitle}"${actCost > 0 ? ` ($${actCost})` : ''}`,
      currentUser.name,
      'activity_log'
    );
    loadWorkspaceData();
  };

  const handleToggleActivity = async (actId: string) => {
    await toggleActivityCompleted(trip.id, actId);
    loadWorkspaceData();
  };

  const handleDeleteActivity = async (actId: string, actTitleStr: string) => {
    await deleteTripActivity(trip.id, actId);
    sendTripChatMessage(trip.id, `removed activity "${actTitleStr}"`, currentUser.name, 'activity_log');
    loadWorkspaceData();
  };

  const handleConvertActivityToExpense = async (act: TripActivity) => {
    if (!act.cost || act.cost <= 0) return;
    const membersList = trip.members?.map((m) => m.name) || [currentUser.name, 'Bhavika Sainani', 'Diya Shah', 'Jagrat Kumar'];
    await addTripExpense(trip.id, {
      title: `Activity: ${act.title}`,
      amount: act.cost,
      paidBy: currentUser.name,
      category: act.category === 'Dining' ? 'Dining' : act.category === 'Transport' ? 'Transport' : 'Activities',
      splitBetween: membersList,
    });
    sendTripChatMessage(
      trip.id,
      `converted activity "${act.title}" ($${act.cost}) into a shared group expense!`,
      currentUser.name,
      'activity_log'
    );
    loadWorkspaceData();
  };

  // 3. Add Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createTripTask(trip.id, {
      title: taskTitle,
      assignedTo: taskAssignee,
      dueDate: taskDueDate || undefined,
      category: taskCategory,
      status: 'todo',
    });
    setShowAddTask(false);
    setTaskTitle('');
    loadWorkspaceData();
  };

  // 4. Toggle Task Status
  const handleToggleTask = async (task: TripTask) => {
    const nextStatus: TaskStatus =
      task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'todo';
    await updateTripTaskStatus(trip.id, task.id, nextStatus);
    loadWorkspaceData();
  };

  // 5. Create Poll
  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOpts = pollOptions.filter((o) => o.trim().length > 0);
    if (!pollQuestion.trim() || validOpts.length < 2) return;
    await createTripPoll(trip.id, pollQuestion, validOpts);
    setShowAddPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    sendTripChatMessage(trip.id, `created a new decision poll: "${pollQuestion}"`, currentUser.name, 'activity_log');
    loadWorkspaceData();
  };

  // 6. Vote Poll
  const handleVote = async (pollId: string, optIdx: number) => {
    await voteTripPoll(trip.id, pollId, optIdx, currentUser.name);
    loadWorkspaceData();
  };

  // 7. Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || expAmount <= 0) return;
    const membersList = trip.members?.map((m) => m.name) || [currentUser.name, 'Bhavika Sainani', 'Diya Shah', 'Jagrat Kumar'];
    await addTripExpense(trip.id, {
      title: expTitle,
      amount: expAmount,
      currency: 'USD',
      paidBy: expPaidBy,
      splitAmong: membersList,
      category: expCategory,
      date: new Date().toISOString().split('T')[0],
    });
    setShowAddExpense(false);
    setExpTitle('');
    loadWorkspaceData();
  };

  // 8. Invite Member
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    await addTripMember(trip.id, inviteEmail, inviteRole);
    setShowInviteModal(false);
    setInviteEmail('');
    sendTripChatMessage(trip.id, `invited ${inviteEmail} to the trip workspace as ${inviteRole}.`, currentUser.name, 'activity_log');
    loadWorkspaceData();
  };

  // Calculate Debt Settlement & Budget Tracking
  const membersList = trip.members?.map((m) => m.name) || [currentUser.name, 'Bhavika Sainani', 'Diya Shah', 'Jagrat Kumar'];
  const debtSummary = calculateDebtSettlement(expenses, membersList);
  const budgetSummary = calculateTripBudget(trip.budgetTarget, trip.activities || [], debtSummary.totalSpent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-slate-900/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[95vh]">
        {/* Workspace Top Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-slate-900/90 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <MapPin size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{trip.title}</h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {trip.destination}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <Calendar size={12} className="text-amber-400" />
                <span>{trip.startDate} to {trip.endDate}</span>
                <span>·</span>
                <Users size={12} className="text-indigo-400" />
                <span>{trip.members?.length || 1} Collaborators</span>
              </p>
            </div>
          </div>

          {/* Members Roster & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2">
              {trip.members?.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white"
                  title={`${m.name} (${m.role})`}
                >
                  {m.name.substring(0, 2).toUpperCase()}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={13} />
              <span>Invite / Share</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="Share trip & manage permissions"
            >
              <Share2 size={16} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Feature Tabs Navigation */}
        <div className="px-6 py-3 border-b border-white/10 bg-slate-950/50 flex flex-wrap items-center gap-2 overflow-x-auto">
          {[
            { id: 'itinerary', label: 'Itinerary & Calendar', icon: Calendar },
            { id: 'chat', label: `Group Chat (${chatMessages.length})`, icon: MessageSquare },
            { id: 'tasks', label: `Task Board (${tasks.filter((t) => t.status !== 'completed').length} active)`, icon: CheckSquare },
            { id: 'polls', label: `Voting & Polls (${polls.length})`, icon: BarChart3 },
            { id: 'expenses', label: `Expense Splitter ($${debtSummary.totalSpent})`, icon: DollarSign },
            { id: 'documents', label: `Documents Vault (${documents.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab View Container */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 1. ITINERARY & CALENDAR TAB */}
          {activeTab === 'itinerary' && (
            <div className="space-y-6">
              {/* Dynamic Budget Sync & Meter */}
              <div className="bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Trip Budget & Activity Cost Tracker</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          budgetSummary.isOverBudget
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {budgetSummary.isOverBudget ? 'Budget Exceeded' : 'On Track'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Target: <strong className="text-white">${budgetSummary.budgetTarget.toLocaleString()}</strong> ·
                        Activities Planned: <strong className="text-indigo-300">${budgetSummary.totalActivitiesCost.toLocaleString()}</strong> ·
                        Split Bills Logged: <strong className="text-purple-300">${debtSummary.totalSpent.toLocaleString()}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Remaining Balance</span>
                    <span className={`text-lg font-black ${budgetSummary.remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${budgetSummary.remainingBudget.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress Meter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Budget Consumption</span>
                    <span className="font-bold text-white">{budgetSummary.percentUsed}% used</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/10 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        budgetSummary.percentUsed > 100
                          ? 'bg-gradient-to-r from-rose-500 to-red-600'
                          : budgetSummary.percentUsed > 75
                          ? 'bg-gradient-to-r from-amber-500 to-indigo-500'
                          : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                      }`}
                      style={{ width: `${Math.min(budgetSummary.percentUsed, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Day Filter & Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedDayFilter(0)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedDayFilter === 0
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    All Days ({(trip.activities || []).length})
                  </button>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                    const count = (trip.activities || []).filter((a) => a.dayNumber === d).length;
                    return (
                      <button
                        key={d}
                        onClick={() => setSelectedDayFilter(d)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                          selectedDayFilter === d
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        Day {d} {count > 0 && <span className="opacity-75">({count})</span>}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    if (selectedDayFilter > 0) setActDay(selectedDayFilter);
                    setShowAddActivity(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all hover:scale-105 active:scale-95 ml-auto"
                >
                  <Plus size={14} />
                  <span>Add Activity</span>
                </button>
              </div>

              {/* Day-by-Day Timeline List */}
              <div className="space-y-6">
                {[1, 2, 3, 4, 5, 6, 7]
                  .filter((d) => selectedDayFilter === 0 || selectedDayFilter === d)
                  .map((dayNum) => {
                    const dayActivities = (trip.activities || []).filter((a) => a.dayNumber === dayNum);
                    if (selectedDayFilter !== 0 && dayActivities.length === 0 && dayNum > 5) return null;

                    return (
                      <div key={dayNum} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">
                              D{dayNum}
                            </span>
                            <h4 className="text-sm font-bold text-white">Day {dayNum} Schedule</h4>
                            <span className="text-xs text-slate-500">· {dayActivities.length} activities planned</span>
                          </div>

                          <button
                            onClick={() => {
                              setActDay(dayNum);
                              setShowAddActivity(true);
                            }}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                          >
                            <Plus size={12} />
                            <span>Add to Day {dayNum}</span>
                          </button>
                        </div>

                        {dayActivities.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-white/5 rounded-xl">
                            <p className="text-xs text-slate-500 italic mb-2">No activities scheduled for Day {dayNum}.</p>
                            <button
                              onClick={() => {
                                setActDay(dayNum);
                                setShowAddActivity(true);
                              }}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                            >
                              + Plan first activity
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {dayActivities.map((act) => {
                              const isCompleted = act.isCompleted || false;
                              const catColors: Record<string, string> = {
                                Sightseeing: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
                                Dining: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                                Transport: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                                Adventure: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                                Culture: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                                Relax: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                              };
                              const badgeStyle = catColors[act.category || 'Sightseeing'] || catColors.Sightseeing;

                              return (
                                <div
                                  key={act.id}
                                  className={`border rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all ${
                                    isCompleted
                                      ? 'bg-white/[0.01] border-white/5 opacity-60'
                                      : 'bg-white/[0.04] border-white/10 hover:border-indigo-400/40'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleToggleActivity(act.id)}
                                          className="text-slate-400 hover:text-indigo-400 transition-colors"
                                          title={isCompleted ? 'Mark as pending' : 'Mark as done'}
                                        >
                                          {isCompleted ? (
                                            <CheckCircle2 size={18} className="text-emerald-400" />
                                          ) : (
                                            <Circle size={18} />
                                          )}
                                        </button>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeStyle}`}>
                                          {act.category || 'Sightseeing'}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-mono text-indigo-300 font-semibold bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/20 flex items-center gap-1">
                                          <Clock size={10} />
                                          <span>{act.timeSlot || 'Anytime'}</span>
                                        </span>
                                        {act.cost ? (
                                          <span className="text-xs font-bold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                            ${act.cost}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>

                                    <h5 className={`text-xs font-bold text-white ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                                      {act.title}
                                    </h5>

                                    {act.locationName && (
                                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                                        <MapPin size={11} className="text-rose-400 flex-shrink-0" />
                                        <span className="truncate">{act.locationName}</span>
                                      </p>
                                    )}

                                    {act.description && (
                                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                        {act.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Activity Card Actions */}
                                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                                    {act.cost && act.cost > 0 ? (
                                      <button
                                        onClick={() => handleConvertActivityToExpense(act)}
                                        className="flex items-center gap-1 text-indigo-300 hover:text-indigo-200 transition-colors font-medium"
                                        title="Split this activity cost with group members"
                                      >
                                        <DollarSign size={11} />
                                        <span>Split as Bill</span>
                                      </button>
                                    ) : (
                                      <span className="text-slate-500 text-[10px]">Free activity</span>
                                    )}

                                    <button
                                      onClick={() => handleDeleteActivity(act.id, act.title)}
                                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors ml-auto"
                                      title="Delete activity"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 2. GROUP CHAT TAB */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[520px] bg-slate-950/60 border border-white/10 rounded-2xl overflow-hidden">
              {/* Messages stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg) => {
                  const isMe = msg.senderName === currentUser.name;
                  if (msg.messageType === 'activity_log') {
                    return (
                      <div key={msg.id} className="text-center py-1">
                        <span className="inline-block text-[11px] text-slate-400 bg-white/[0.04] border border-white/5 px-3 py-1 rounded-full">
                          ⚡ <strong className="text-indigo-300">{msg.senderName}</strong> {msg.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {msg.senderName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className={`max-w-md rounded-2xl p-3.5 text-xs ${
                        isMe
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none'
                          : 'bg-white/[0.06] border border-white/10 text-slate-200 rounded-tl-none'
                      }`}>
                        <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-75">
                          <span className="font-semibold">{msg.senderName}</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p>{msg.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Composer */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-slate-900 flex items-center gap-2">
                <input
                  type="text"
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder={`Message your trip group as ${currentUser.name}...`}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center justify-center"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}

          {/* 3. TASK MANAGEMENT BOARD TAB */}
          {activeTab === 'tasks' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Trip Task Board</h3>
                  <p className="text-xs text-slate-400">Assign preparation tasks and track completion</p>
                </div>
                <button
                  onClick={() => setShowAddTask(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  <Plus size={14} />
                  <span>Add Task</span>
                </button>
              </div>

              {/* Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['todo', 'in_progress', 'completed'] as TaskStatus[]).map((colStatus) => {
                  const colTasks = tasks.filter((t) => t.status === colStatus);
                  const titles: Record<TaskStatus, { label: string; color: string }> = {
                    todo: { label: 'To-Do', color: 'border-slate-500/30 text-slate-300' },
                    in_progress: { label: 'In Progress', color: 'border-amber-500/30 text-amber-300' },
                    completed: { label: 'Completed', color: 'border-emerald-500/30 text-emerald-300' },
                  };

                  return (
                    <div key={colStatus} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col min-h-[300px]">
                      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${titles[colStatus].color}`}>
                          {titles[colStatus].label} ({colTasks.length})
                        </span>
                      </div>

                      <div className="space-y-3 flex-1">
                        {colTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleToggleTask(t)}
                            className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl p-3 cursor-pointer transition-all space-y-2 group"
                            title="Click to cycle status"
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={t.status === 'completed'}
                                readOnly
                                className="mt-0.5 rounded border-white/20 text-indigo-600"
                              />
                              <h5 className={`text-xs font-medium text-white flex-1 ${t.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                                {t.title}
                              </h5>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                              <span className="font-semibold text-indigo-300">👤 {t.assignedTo || 'Unassigned'}</span>
                              {t.dueDate && <span>Due {t.dueDate}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. VOTING & POLLS TAB */}
          {activeTab === 'polls' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Group Decision Polls</h3>
                  <p className="text-xs text-slate-400">Vote on restaurants, activities, and group decisions</p>
                </div>
                <button
                  onClick={() => setShowAddPoll(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  <Plus size={14} />
                  <span>Create Poll</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {polls.map((poll) => (
                  <div key={poll.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white">{poll.question}</h4>
                      <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                        {poll.totalVotes} votes
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {poll.options.map((opt, optIdx) => {
                        const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                        const hasVotedThis = opt.voterNames.includes(currentUser.name);

                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleVote(poll.id, optIdx)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all relative overflow-hidden ${
                              hasVotedThis
                                ? 'bg-indigo-600/20 border-indigo-500/50'
                                : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10'
                            }`}
                          >
                            {/* Vote bar fill */}
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-indigo-600/30 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />

                            <div className="relative flex items-center justify-between z-10 text-xs">
                              <span className="font-medium text-white flex items-center gap-1.5">
                                {hasVotedThis && <Check size={13} className="text-emerald-400" />}
                                {opt.text}
                              </span>
                              <span className="text-slate-300 font-bold">{pct}% ({opt.votes})</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. EXPENSE SPLITTER TAB */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Group Expense Splitter</h3>
                  <p className="text-xs text-slate-400">Total Group Spend: ${debtSummary.totalSpent} USD</p>
                </div>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  <Plus size={14} />
                  <span>Log Expense</span>
                </button>
              </div>

              {/* Debt Settlement Banner ("Who Owes Who") */}
              <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>Smart Settlement Summary (Who Owes Whom)</span>
                </h4>

                {debtSummary.settlements.length === 0 ? (
                  <p className="text-xs text-slate-400">All trip balances are completely settled!</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {debtSummary.settlements.map((s, idx) => (
                      <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs flex items-center justify-between">
                        <div>
                          <span className="text-rose-300 font-semibold">{s.from}</span>
                          <span className="text-slate-500 mx-1">owes</span>
                          <span className="text-emerald-300 font-semibold">{s.to}</span>
                        </div>
                        <span className="font-bold text-white">${s.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expenses List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400">Itemized Bill History</h4>
                {expenses.map((exp) => (
                  <div key={exp.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">{exp.title}</h5>
                      <p className="text-[11px] text-slate-400">
                        Paid by <span className="text-indigo-300 font-semibold">{exp.paidBy}</span> · Split equally ({exp.splitAmong.length} pax)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-white">${exp.amount}</span>
                      <span className="text-[10px] text-slate-400 block">${(exp.amount / exp.splitAmong.length).toFixed(1)} / pax</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. DOCUMENTS VAULT TAB */}
          {activeTab === 'documents' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Travel Documents Vault</h3>
                  <p className="text-xs text-slate-400">Shared boarding passes, vouchers & passport copies</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">{doc.documentName}</h5>
                        <p className="text-[11px] text-slate-400">
                          Uploaded by {doc.uploaderName} · {doc.fileSizeKb} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => alert(`Downloading verified document: ${doc.documentName}`)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-indigo-300 border border-white/10"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── ADD ACTIVITY MODAL ───────────────────────────────────────────── */}
      {showAddActivity && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-400" />
              <span>Add Scheduled Activity</span>
            </h3>
            <form onSubmit={handleAddActivity} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  placeholder="e.g. Louvre Guided Tour & Mona Lisa"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Day Schedule</label>
                  <select
                    value={actDay}
                    onChange={(e) => setActDay(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Time Slot</label>
                  <input
                    type="text"
                    value={actTime}
                    onChange={(e) => setActTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select
                    value={actCategory}
                    onChange={(e) => setActCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Sightseeing">Sightseeing</option>
                    <option value="Dining">Dining / Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Adventure">Adventure / Outdoor</option>
                    <option value="Culture">Culture / Museum</option>
                    <option value="Relax">Relaxation / Beach</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Estimated Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={actCost}
                    onChange={(e) => setActCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Location Name & Address</label>
                <input
                  type="text"
                  value={actLocation}
                  onChange={(e) => setActLocation(e.target.value)}
                  placeholder="e.g. Musée du Louvre, Rue de Rivoli, Paris"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={actDescription}
                  onChange={(e) => setActDescription(e.target.value)}
                  placeholder="e.g. Meet at the glass pyramid entrance. Bring student ID."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              {actCost > 0 && (
                <label className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-500/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={actAlsoAddExpense}
                    onChange={(e) => setActAlsoAddExpense(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                  />
                  <span>Automatically log as shared bill in Expense Splitter</span>
                </label>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button type="button" onClick={() => setShowAddActivity(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md">
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD TASK MODAL ──────────────────────────────────────────────── */}
      {showAddTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add Group Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Confirm hotel late check-in"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Assignee</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {membersList.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button type="button" onClick={() => setShowAddTask(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD POLL MODAL ──────────────────────────────────────────────── */}
      {showAddPoll && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create Decision Poll</h3>
            <form onSubmit={handleCreatePoll} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Poll Question *</label>
                <input
                  type="text"
                  required
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. Which museum should we visit on Day 2?"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-slate-400">Options</label>
                {pollOptions.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    required
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[idx] = e.target.value;
                      setPollOptions(next);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPollOptions([...pollOptions, ''])}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                + Add Option
              </button>
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button type="button" onClick={() => setShowAddPoll(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Publish Poll</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD EXPENSE MODAL ───────────────────────────────────────────── */}
      {showAddExpense && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Log Trip Bill & Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Group Dinner at Le Marais"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount ($ USD) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Paid By</label>
                  <select
                    value={expPaidBy}
                    onChange={(e) => setExpPaidBy(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {membersList.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button type="button" onClick={() => setShowAddExpense(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Log & Split</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── INVITE MEMBER MODAL ─────────────────────────────────────────── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Invite Collaborator to Trip</h3>
            <form onSubmit={handleInviteMember} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Collaborator Email *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Role Permission</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="editor">Editor (Can add/edit itinerary, polls & tasks)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                </select>
              </div>
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      {/* ─── SHARE & PERMISSIONS MODAL ──────────────────────────────────── */}
      {showShareModal && (
        <TripShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          trip={trip}
          onTripUpdated={(updatedTrip) => {
            if (trip.members && updatedTrip.members) {
              trip.members = updatedTrip.members;
            }
            if (updatedTrip.visibility) {
              trip.visibility = updatedTrip.visibility;
            }
          }}
        />
      )}
    </div>
  );
}
