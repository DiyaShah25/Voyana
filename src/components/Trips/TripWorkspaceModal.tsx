/**
 * Trip Workspace & Interactive Itinerary Creation Modal
 * Supports multi-day schedule creation, activity builder, drag/drop reordering,
 * group chat, expense splitting, photo journal, and printable travel vouchers.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, MessageSquare, CheckSquare, BarChart3,
  DollarSign, FileText, Users, Plus, X, ArrowRight,
  MapPin, Clock, Send, Check, Sparkles, Share2,
  Trash2, Copy, AlertCircle, ShieldCheck, ChevronRight,
  CheckCircle2, Circle, ArrowUpRight, Tag, SlidersHorizontal,
  Heart, Camera, Image as ImageIcon, ZoomIn, Download, Printer
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
import TripExportModal from './TripExportModal';
import {
  generateAiTripSchedule,
  type GeneratedItineraryResult,
} from '@/services/itineraryService';
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
  getTripMemories,
  uploadTripMemory,
  likeTripMemory,
  deleteTripMemory,
  downloadTripTransactionsCSV,
  generateAiJournalStory,
  type TripChatMessage,
  type TripTask,
  type TripPoll,
  type TripExpense,
  type TripDocument,
  type TripMemory,
  type TaskStatus,
} from '@/services/collaborationService';

export interface TripWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  currentUser?: { name: string; email: string };
}

type WorkspaceTab = 'itinerary' | 'chat' | 'tasks' | 'polls' | 'expenses' | 'documents' | 'memories';

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
  const [memories, setMemories] = useState<TripMemory[]>([]);

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

  // Invite Member / Share / Export Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');

  // New Memory / Photo Form
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [memTitle, setMemTitle] = useState('');
  const [memCaption, setMemCaption] = useState('');
  const [memLocation, setMemLocation] = useState('');
  const [memImageUrl, setMemImageUrl] = useState('');
  const [memTagInput, setMemTagInput] = useState('Sightseeing, Sunset');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');
  const [activePhotoViewer, setActivePhotoViewer] = useState<TripMemory | null>(null);

  // AI Itinerary Generator State
  const [showAiItineraryModal, setShowAiItineraryModal] = useState(false);
  const [aiDays, setAiDays] = useState(3);
  const [aiPace, setAiPace] = useState<'relaxed' | 'balanced' | 'packed'>('balanced');
  const [aiInterests, setAiInterests] = useState<string[]>(['Culture', 'Sightseeing', 'Gastronomy']);
  const [aiItineraryResult, setAiItineraryResult] = useState<GeneratedItineraryResult | null>(null);
  const [isApplyingItinerary, setIsApplyingItinerary] = useState(false);

  const tripId = trip?.id || 'trip-user-01';

  const loadWorkspaceData = useCallback(async () => {
    if (!trip) return;
    const [c, t, p, e, d, m] = await Promise.all([
      getTripChatMessages(trip.id),
      getTripTasks(trip.id),
      getTripPolls(trip.id),
      getTripExpenses(trip.id),
      getTripDocuments(trip.id),
      getTripMemories(trip.id),
    ]);
    setChatMessages(c);
    setTasks(t);
    setPolls(p);
    setExpenses(e);
    setDocuments(d);
    setMemories(m);
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
        currency: trip.currency || 'USD',
        paidBy: currentUser.name,
        category: actCategory === 'Dining' ? 'Dining' : actCategory === 'Transport' ? 'Transport' : 'Activities',
        splitAmong: membersList,
        date: new Date().toISOString().split('T')[0],
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
      currency: trip.currency || 'USD',
      paidBy: currentUser.name,
      category: act.category === 'Dining' ? 'Dining' : act.category === 'Transport' ? 'Transport' : 'Activities',
      splitAmong: membersList,
      date: new Date().toISOString().split('T')[0],
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

  // 9. Memory & Photo Journal Actions
  const handleUploadMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memTitle.trim() || !memImageUrl.trim()) return;

    const parsedTags = memTagInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    await uploadTripMemory(trip.id, {
      uploadedBy: currentUser.name,
      title: memTitle,
      caption: memCaption || undefined,
      locationName: memLocation || trip.destination,
      imageUrl: memImageUrl,
      date: new Date().toISOString().split('T')[0],
      tags: parsedTags.length > 0 ? parsedTags : ['Moments', 'Travel'],
    });

    setShowAddMemory(false);
    setMemTitle('');
    setMemCaption('');
    setMemLocation('');
    setMemImageUrl('');
    setMemTagInput('Sightseeing, Sunset');

    sendTripChatMessage(
      trip.id,
      `posted a new trip photo memory: "${memTitle}"`,
      currentUser.name,
      'activity_log'
    );
    loadWorkspaceData();
  };

  const handleLikeMemory = async (memoryId: string) => {
    await likeTripMemory(trip.id, memoryId, currentUser.name);
    loadWorkspaceData();
  };

  const handleDeleteMemory = async (memoryId: string) => {
    await deleteTripMemory(trip.id, memoryId);
    loadWorkspaceData();
  };

  // Calculate Debt Settlement & Budget Tracking
  const membersList = trip.members?.map((m) => m.name) || [currentUser.name, 'Bhavika Sainani', 'Diya Shah', 'Jagrat Kumar'];
  const debtSummary = calculateDebtSettlement(expenses, membersList);
  const budgetSummary = calculateTripBudget(trip.budgetTarget, trip.activities || [], debtSummary.totalSpent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[95vh]">
        {/* Workspace Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm flex-shrink-0">
              <MapPin size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{trip.title}</h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {trip.destination}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <Calendar size={12} className="text-amber-500" />
                <span>{trip.startDate} to {trip.endDate}</span>
                <span>·</span>
                <Users size={12} className="text-emerald-700" />
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
                  className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm"
                  title={`${m.name} (${m.role})`}
                >
                  {m.name.substring(0, 2).toUpperCase()}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <Plus size={13} />
              <span>Invite / Share</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm"
              title="Print itinerary & export travel pass voucher"
            >
              <Printer size={13} className="text-slate-600" />
              <span>Export Pass</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              title="Share trip & manage permissions"
            >
              <Share2 size={16} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Feature Tabs Navigation */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-2 overflow-x-auto">
          {[
            { id: 'itinerary', label: 'Itinerary & Calendar', icon: Calendar },
            { id: 'chat', label: `Group Chat (${chatMessages.length})`, icon: MessageSquare },
            { id: 'tasks', label: `Task Board (${tasks.filter((t) => t.status !== 'completed').length} active)`, icon: CheckSquare },
            { id: 'polls', label: `Voting & Polls (${polls.length})`, icon: BarChart3 },
            { id: 'expenses', label: `Expense Splitter ($${debtSummary.totalSpent})`, icon: DollarSign },
            { id: 'documents', label: `Documents Vault (${documents.length})`, icon: FileText },
            { id: 'memories', label: `Memories & Journal (${memories.length})`, icon: Camera },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
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
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Trip Budget & Activity Cost Tracker</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          budgetSummary.isOverBudget
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {budgetSummary.isOverBudget ? 'Budget Exceeded' : 'On Track'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Target: <strong className="text-slate-900">${budgetSummary.budgetTarget.toLocaleString()}</strong> ·
                        Activities Planned: <strong className="text-emerald-700">${budgetSummary.totalActivitiesCost.toLocaleString()}</strong> ·
                        Split Bills Logged: <strong className="text-purple-700">${debtSummary.totalSpent.toLocaleString()}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Remaining Balance</span>
                    <span className={`text-lg font-black ${budgetSummary.remainingBudget >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      ${budgetSummary.remainingBudget.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress Meter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Budget Consumption</span>
                    <span className="font-bold text-slate-900">{budgetSummary.percentUsed}% used</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        budgetSummary.percentUsed > 100
                          ? 'bg-rose-500'
                          : budgetSummary.percentUsed > 75
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
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
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
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
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                        }`}
                      >
                        Day {d} {count > 0 && <span className="opacity-75">({count})</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => {
                      const res = generateAiTripSchedule({
                        destination: trip.destination,
                        days: aiDays,
                        pace: aiPace,
                        interests: aiInterests,
                      });
                      setAiItineraryResult(res);
                      setShowAiItineraryModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
                    title="Generate custom day schedules using Voyana AI"
                  >
                    <Sparkles size={14} className="text-emerald-700" />
                    <span>AI Generate Itinerary</span>
                  </button>

                  <button
                    onClick={() => {
                      if (selectedDayFilter > 0) setActDay(selectedDayFilter);
                      setShowAddActivity(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Add Activity</span>
                  </button>
                </div>
              </div>

              {/* Day-by-Day Timeline List */}
              <div className="space-y-6">
                {[1, 2, 3, 4, 5, 6, 7]
                  .filter((d) => selectedDayFilter === 0 || selectedDayFilter === d)
                  .map((dayNum) => {
                    const dayActivities = (trip.activities || []).filter((a) => a.dayNumber === dayNum);
                    if (selectedDayFilter !== 0 && dayActivities.length === 0 && dayNum > 5) return null;

                    return (
                      <div key={dayNum} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center text-xs font-bold shadow-sm">
                              D{dayNum}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">Day {dayNum} Schedule</h4>
                            <span className="text-xs text-slate-500">· {dayActivities.length} activities planned</span>
                          </div>

                          <button
                            onClick={() => {
                              setActDay(dayNum);
                              setShowAddActivity(true);
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                          >
                            <Plus size={12} />
                            <span>Add to Day {dayNum}</span>
                          </button>
                        </div>

                        {dayActivities.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <p className="text-xs text-slate-500 italic mb-2">No activities scheduled for Day {dayNum}.</p>
                            <button
                              onClick={() => {
                                setActDay(dayNum);
                                setShowAddActivity(true);
                              }}
                              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
                            >
                              + Plan first activity
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {dayActivities.map((act) => {
                              const isCompleted = act.isCompleted || false;
                              const catColors: Record<string, string> = {
                                Sightseeing: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                                Dining: 'bg-amber-50 text-amber-800 border-amber-200',
                                Transport: 'bg-sky-50 text-sky-800 border-sky-200',
                                Adventure: 'bg-teal-50 text-teal-800 border-teal-200',
                                Culture: 'bg-purple-50 text-purple-800 border-purple-200',
                                Relax: 'bg-rose-50 text-rose-800 border-rose-200',
                              };
                              const badgeStyle = catColors[act.category || 'Sightseeing'] || catColors.Sightseeing;

                              return (
                                <div
                                  key={act.id}
                                  className={`border rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all ${
                                    isCompleted
                                      ? 'bg-slate-50/60 border-slate-200 opacity-60'
                                      : 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-sm hover:shadow-md'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleToggleActivity(act.id)}
                                          className="text-slate-400 hover:text-emerald-700 transition-colors"
                                          title={isCompleted ? 'Mark as pending' : 'Mark as done'}
                                        >
                                          {isCompleted ? (
                                            <CheckCircle2 size={18} className="text-emerald-600" />
                                          ) : (
                                            <Circle size={18} />
                                          )}
                                        </button>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeStyle}`}>
                                          {act.category || 'Sightseeing'}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-mono text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                                          <Clock size={10} className="text-slate-500" />
                                          <span>{act.timeSlot || 'Anytime'}</span>
                                        </span>
                                        {act.cost ? (
                                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                            ${act.cost}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>

                                    <h5 className={`text-xs font-bold text-slate-900 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                                      {act.title}
                                    </h5>

                                    {act.locationName && (
                                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                                        <MapPin size={11} className="text-rose-500 flex-shrink-0" />
                                        <span className="truncate">{act.locationName}</span>
                                      </p>
                                    )}

                                    {act.description && (
                                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                        {act.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Activity Card Actions */}
                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                    {act.cost && act.cost > 0 ? (
                                      <button
                                        onClick={() => handleConvertActivityToExpense(act)}
                                        className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 transition-colors font-medium"
                                        title="Split this activity cost with group members"
                                      >
                                        <DollarSign size={11} />
                                        <span>Split as Bill</span>
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 text-[10px]">Free activity</span>
                                    )}

                                    <button
                                      onClick={() => handleDeleteActivity(act.id, act.title)}
                                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors ml-auto"
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
            <div className="flex flex-col h-[520px] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Messages stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {chatMessages.map((msg) => {
                  const isMe = msg.senderName === currentUser.name;
                  if (msg.messageType === 'activity_log') {
                    return (
                      <div key={msg.id} className="text-center py-1">
                        <span className="inline-block text-[11px] text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-xs">
                          ⚡ <strong className="text-emerald-700">{msg.senderName}</strong> {msg.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm">
                        {msg.senderName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className={`max-w-md rounded-2xl p-3.5 text-xs ${
                        isMe
                          ? 'bg-emerald-700 text-white rounded-tr-none shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                      }`}>
                        <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-80">
                          <span className="font-semibold">{msg.senderName}</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="leading-relaxed">{msg.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Composer */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                <input
                  type="text"
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder={`Message your trip group as ${currentUser.name}...`}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm shadow-emerald-700/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
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
                  <h3 className="text-base font-bold text-slate-900">Trip Task Board</h3>
                  <p className="text-xs text-slate-500">Assign preparation tasks and track completion</p>
                </div>
                <button
                  onClick={() => setShowAddTask(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
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
                    todo: { label: 'To-Do', color: 'border-slate-300 bg-slate-100 text-slate-700' },
                    in_progress: { label: 'In Progress', color: 'border-amber-200 bg-amber-50 text-amber-800' },
                    completed: { label: 'Completed', color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
                  };

                  return (
                    <div key={colStatus} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col min-h-[300px]">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${titles[colStatus].color}`}>
                          {titles[colStatus].label} ({colTasks.length})
                        </span>
                      </div>

                      <div className="space-y-3 flex-1">
                        {colTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleToggleTask(t)}
                            className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-emerald-500/50 rounded-xl p-3 cursor-pointer transition-all space-y-2 group shadow-sm"
                            title="Click to cycle status"
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={t.status === 'completed'}
                                readOnly
                                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <h5 className={`text-xs font-medium text-slate-900 flex-1 ${t.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                                {t.title}
                              </h5>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                              <span className="font-semibold text-emerald-700">👤 {t.assignedTo || 'Unassigned'}</span>
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
                  <h3 className="text-base font-bold text-slate-900">Group Decision Polls</h3>
                  <p className="text-xs text-slate-500">Vote on restaurants, activities, and group decisions</p>
                </div>
                <button
                  onClick={() => setShowAddPoll(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus size={14} />
                  <span>Create Poll</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {polls.map((poll) => (
                  <div key={poll.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{poll.question}</h4>
                      <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium">
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
                                ? 'bg-emerald-50 border-emerald-500/50 shadow-sm'
                                : 'bg-white hover:bg-slate-50 border-slate-200'
                            }`}
                          >
                            {/* Vote bar fill */}
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-emerald-500/20 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />

                            <div className="relative flex items-center justify-between z-10 text-xs">
                              <span className="font-medium text-slate-900 flex items-center gap-1.5">
                                {hasVotedThis && <Check size={13} className="text-emerald-600 font-bold" />}
                                {opt.text}
                              </span>
                              <span className="text-slate-600 font-bold">{pct}% ({opt.votes})</span>
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
                  <h3 className="text-base font-bold text-slate-900">Group Expense Splitter</h3>
                  <p className="text-xs text-slate-500">Total Group Spend: ${debtSummary.totalSpent} USD</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadTripTransactionsCSV(expenses, debtSummary.settlements, trip?.title || 'Trip')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-xs"
                    title="Export all expenses & debt settlement to CSV (VPM-76)"
                  >
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Log Expense</span>
                  </button>
                </div>
              </div>

              {/* Debt Settlement Banner ("Who Owes Who") */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 shadow-xs">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-700" />
                  <span>Smart Settlement Summary (Who Owes Whom)</span>
                </h4>

                {debtSummary.settlements.length === 0 ? (
                  <p className="text-xs text-slate-500">All trip balances are completely settled!</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {debtSummary.settlements.map((s, idx) => (
                      <div key={idx} className="bg-white border border-emerald-200/80 rounded-xl p-3 text-xs flex items-center justify-between shadow-xs">
                        <div>
                          <span className="text-rose-600 font-semibold">{s.from}</span>
                          <span className="text-slate-400 mx-1">owes</span>
                          <span className="text-emerald-700 font-semibold">{s.to}</span>
                        </div>
                        <span className="font-bold text-slate-900">${s.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expenses List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500">Itemized Bill History</h4>
                {expenses.map((exp) => (
                  <div key={exp.id} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{exp.title}</h5>
                      <p className="text-[11px] text-slate-500">
                        Paid by <span className="text-emerald-700 font-semibold">{exp.paidBy}</span> · Split equally ({exp.splitAmong.length} pax)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">${exp.amount}</span>
                      <span className="text-[10px] text-slate-500 block">${(exp.amount / exp.splitAmong.length).toFixed(1)} / pax</span>
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
                  <h3 className="text-base font-bold text-slate-900">Travel Documents Vault</h3>
                  <p className="text-xs text-slate-500">Shared boarding passes, vouchers & passport copies</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">{doc.documentName}</h5>
                        <p className="text-[11px] text-slate-500">
                          Uploaded by {doc.uploaderName} · {doc.fileSizeKb} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => alert(`Downloading verified document: ${doc.documentName}`)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 shadow-xs transition-colors"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. MEMORIES & JOURNAL TAB */}
          {activeTab === 'memories' && (
            <div className="space-y-6">
              {/* Header & Upload Button */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Camera size={20} className="text-emerald-700" />
                    <span>Trip Memories & Shared Photo Journal</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Crowdsourced travel photo albums, polaroids & shared journal entries
                  </p>
                </div>

                <button
                  onClick={() => setShowAddMemory(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Camera size={14} />
                  <span>Post Photo Memory</span>
                </button>
              </div>

              {/* Tag Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedTagFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    selectedTagFilter === 'all'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  All Memories ({memories.length})
                </button>
                {Array.from(new Set(memories.flatMap((m) => m.tags || []))).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(tag)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedTagFilter === tag
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              {/* Photos Grid */}
              {memories.length === 0 ? (
                <div className="text-center py-16 bg-slate-50/70 border border-dashed border-slate-200 rounded-3xl">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
                    <Camera size={28} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">No Travel Memories Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    Capture and share unforgettable trip highlights, selfies, food shots and sunset polaroids with your group!
                  </p>
                  <button
                    onClick={() => setShowAddMemory(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm shadow-emerald-700/20"
                  >
                    Upload First Photo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {memories
                    .filter((m) => selectedTagFilter === 'all' || m.tags.includes(selectedTagFilter))
                    .map((mem) => {
                      const isLikedByMe = mem.likes.includes(currentUser.name);
                      return (
                        <div
                          key={mem.id}
                          className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/5 transition-all flex flex-col justify-between shadow-sm"
                        >
                          {/* Image Container with Hover zoom */}
                          <div
                            onClick={() => setActivePhotoViewer(mem)}
                            className="relative aspect-4/3 w-full bg-slate-900 overflow-hidden cursor-pointer"
                          >
                            <img
                              src={mem.imageUrl}
                              alt={mem.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 opacity-70 group-hover:opacity-90 transition-opacity" />

                            {/* Location Pill */}
                            {mem.locationName && (
                              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 shadow-sm">
                                <MapPin size={11} className="text-rose-500" />
                                <span className="truncate max-w-[160px]">{mem.locationName}</span>
                              </div>
                            )}

                            {/* Zoom Icon Hint */}
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/60 text-white">
                              <ZoomIn size={14} />
                            </div>

                            {/* Title overlay at bottom of image */}
                            <div className="absolute bottom-3 left-3 right-3">
                              <h4 className="text-sm font-bold text-white drop-shadow-md truncate">
                                {mem.title}
                              </h4>
                              <p className="text-[10px] text-slate-300 flex items-center gap-2 mt-0.5">
                                <span>by {mem.uploadedBy}</span>
                                <span>·</span>
                                <span>{mem.date}</span>
                              </p>
                            </div>
                          </div>

                          {/* Body & Caption */}
                          <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                            {mem.caption && (
                              <p className="text-xs text-slate-600 italic leading-relaxed">
                                "{mem.caption}"
                              </p>
                            )}

                            {/* Tags list */}
                            {mem.tags && mem.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {mem.tags.map((t) => (
                                  <span
                                    key={t}
                                    onClick={() => setSelectedTagFilter(t)}
                                    className="cursor-pointer text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md hover:border-emerald-400 transition-colors"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Action Row: Likes & Delete */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <button
                                onClick={() => handleLikeMemory(mem.id)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  isLikedByMe
                                    ? 'bg-pink-50 text-pink-600 border border-pink-200 scale-105'
                                    : 'bg-slate-50 text-slate-600 hover:text-pink-600 hover:bg-pink-50 border border-slate-200'
                                }`}
                              >
                                <Heart
                                  size={13}
                                  className={isLikedByMe ? 'fill-pink-600 text-pink-600' : ''}
                                />
                                <span>{mem.likes.length}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteMemory(mem.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                                title="Delete memory"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── ADD ACTIVITY MODAL ───────────────────────────────────────────── */}
      {showAddActivity && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-700" />
              <span>Add Scheduled Activity</span>
            </h3>
            <form onSubmit={handleAddActivity} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  placeholder="e.g. Louvre Guided Tour & Mona Lisa"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Day Schedule</label>
                  <select
                    value={actDay}
                    onChange={(e) => setActDay(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                  <input
                    type="text"
                    value={actTime}
                    onChange={(e) => setActTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={actCategory}
                    onChange={(e) => setActCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={actCost}
                    onChange={(e) => setActCost(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location Name & Address</label>
                <input
                  type="text"
                  value={actLocation}
                  onChange={(e) => setActLocation(e.target.value)}
                  placeholder="e.g. Musée du Louvre, Rue de Rivoli, Paris"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={actDescription}
                  onChange={(e) => setActDescription(e.target.value)}
                  placeholder="e.g. Meet at the glass pyramid entrance. Bring student ID."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 resize-none shadow-sm"
                />
              </div>

              {actCost > 0 && (
                <label className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 cursor-pointer shadow-xs">
                  <input
                    type="checkbox"
                    checked={actAlsoAddExpense}
                    onChange={(e) => setActAlsoAddExpense(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Automatically log as shared bill in Expense Splitter</span>
                </label>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddActivity(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95">
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD TASK MODAL ──────────────────────────────────────────────── */}
      {showAddTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Group Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Confirm hotel late check-in"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                >
                  {membersList.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddTask(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD POLL MODAL ──────────────────────────────────────────────── */}
      {showAddPoll && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-4">Create Decision Poll</h3>
            <form onSubmit={handleCreatePoll} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Poll Question *</label>
                <input
                  type="text"
                  required
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. Which museum should we visit on Day 2?"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Options</label>
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
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPollOptions([...pollOptions, ''])}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
              >
                + Add Option
              </button>
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddPoll(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95">Publish Poll</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD EXPENSE MODAL ───────────────────────────────────────────── */}
      {showAddExpense && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-4">Log Trip Bill & Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Group Dinner at Le Marais"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ($ USD) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Paid By</label>
                  <select
                    value={expPaidBy}
                    onChange={(e) => setExpPaidBy(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                  >
                    {membersList.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddExpense(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95">Log & Split</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── INVITE MEMBER MODAL ─────────────────────────────────────────── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-4">Invite Collaborator to Trip</h3>
            <form onSubmit={handleInviteMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Collaborator Email *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role Permission</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                >
                  <option value="editor">Editor (Can add/edit itinerary, polls & tasks)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                </select>
              </div>
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TRIP MEMORY / PHOTO MODAL */}
      {showAddMemory && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Camera size={18} className="text-emerald-700" />
              <span>Post Trip Photo Memory</span>
            </h3>

            <form onSubmit={handleUploadMemory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Memory Title *</label>
                <input
                  type="text"
                  required
                  value={memTitle}
                  onChange={(e) => setMemTitle(e.target.value)}
                  placeholder="e.g. Sunset over the Seine river"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Photo Image URL *</label>
                <input
                  type="url"
                  required
                  value={memImageUrl}
                  onChange={(e) => setMemImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-mono text-[11px] shadow-sm"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                  <span className="text-[10px] text-slate-500 font-medium mr-1">Presets:</span>
                  {[
                    { label: 'Sunset', url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1000&auto=format&fit=crop&q=80' },
                    { label: 'Food', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80' },
                    { label: 'Architecture', url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1000&auto=format&fit=crop&q=80' },
                    { label: 'Tokyo Street', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop&q=80' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setMemImageUrl(p.url);
                        if (!memTitle) setMemTitle(`${p.label} Highlight`);
                      }}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 whitespace-nowrap transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location Name</label>
                  <input
                    type="text"
                    value={memLocation}
                    onChange={(e) => setMemLocation(e.target.value)}
                    placeholder="e.g. Pont Neuf, Paris"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={memTagInput}
                    onChange={(e) => setMemTagInput(e.target.value)}
                    placeholder="Sunset, Sightseeing"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Caption / Story Note</label>
                  <button
                    type="button"
                    onClick={() => {
                      const story = generateAiJournalStory({
                        title: memTitle,
                        location: memLocation,
                        destination: trip.destination,
                      });
                      setMemCaption(story.caption);
                      if (memTagInput === 'Sightseeing, Sunset' || !memTagInput.trim()) {
                        setMemTagInput(story.tags.join(', '));
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100 transition-all shadow-xs"
                    title="Generate AI Travel Journal reflection (VPM-63)"
                  >
                    <Sparkles size={11} className="text-emerald-700" />
                    <span>AI Generate Story</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={memCaption}
                  onChange={(e) => setMemCaption(e.target.value)}
                  placeholder="Share a story or memory about this moment..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 resize-none shadow-sm"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddMemory(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95">
                  Publish Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PHOTO LIGHTBOX MODAL ────────────────────────────────────────── */}
      {activePhotoViewer && (
        <div
          onClick={() => setActivePhotoViewer(null)}
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="relative aspect-16/10 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={activePhotoViewer.imageUrl}
                alt={activePhotoViewer.title}
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setActivePhotoViewer(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 bg-white space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{activePhotoViewer.title}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <MapPin size={12} className="text-rose-500" />
                    <span>{activePhotoViewer.locationName || trip.destination}</span>
                    <span>·</span>
                    <span>Captured by {activePhotoViewer.uploadedBy} on {activePhotoViewer.date}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLikeMemory(activePhotoViewer.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activePhotoViewer.likes.includes(currentUser.name)
                        ? 'bg-pink-50 text-pink-600 border border-pink-200 shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Heart size={15} className={activePhotoViewer.likes.includes(currentUser.name) ? 'fill-pink-600 text-pink-600' : ''} />
                    <span>{activePhotoViewer.likes.length} Likes</span>
                  </button>

                  <a
                    href={activePhotoViewer.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                    title="Open full resolution"
                  >
                    <Download size={15} />
                  </a>
                </div>
              </div>

              {activePhotoViewer.caption && (
                <p className="text-sm text-slate-700 italic bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                  "{activePhotoViewer.caption}"
                </p>
              )}

              {activePhotoViewer.tags && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {activePhotoViewer.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* PRINTABLE ITINERARY & TRAVEL VOUCHER MODAL */}
      {showExportModal && (
        <TripExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          trip={trip}
          expenses={expenses}
          debtSummary={debtSummary}
        />
      )}

      {/* AI ITINERARY GENERATOR MODAL */}
      {showAiItineraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    AI Itinerary Generator
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Smart Co-Pilot
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Curating schedules for {trip.destination}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiItineraryModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
              {/* Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trip Days</label>
                  <select
                    value={aiDays}
                    onChange={(e) => {
                      const d = parseInt(e.target.value);
                      setAiDays(d);
                      const res = generateAiTripSchedule({
                        destination: trip.destination,
                        days: d,
                        pace: aiPace,
                        interests: aiInterests,
                      });
                      setAiItineraryResult(res);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <option key={num} value={num}>{num} {num === 1 ? 'Day' : 'Days'}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Travel Pace</label>
                  <select
                    value={aiPace}
                    onChange={(e) => {
                      const p = e.target.value as any;
                      setAiPace(p);
                      const res = generateAiTripSchedule({
                        destination: trip.destination,
                        days: aiDays,
                        pace: p,
                        interests: aiInterests,
                      });
                      setAiItineraryResult(res);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                  >
                    <option value="relaxed">Relaxed (2 activities/day)</option>
                    <option value="balanced">Balanced (3 activities/day)</option>
                    <option value="packed">Packed & Energetic (4 activities/day)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Travel Interests</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Culture', 'Sightseeing', 'Gastronomy', 'Shopping', 'Adventure', 'Nightlife'].map((interest) => {
                    const isSelected = aiInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? aiInterests.filter((x) => x !== interest)
                            : [...aiInterests, interest];
                          setAiInterests(next.length > 0 ? next : ['Culture']);
                          const res = generateAiTripSchedule({
                            destination: trip.destination,
                            days: aiDays,
                            pace: aiPace,
                            interests: next.length > 0 ? next : ['Culture'],
                          });
                          setAiItineraryResult(res);
                        }}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Itinerary Preview */}
              {aiItineraryResult && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Generated Schedule Preview ({aiItineraryResult.allActivities.length} Activities)
                    </h4>
                    <span className="text-xs text-slate-500">
                      Est. Activities Cost: <strong className="text-emerald-700">${aiItineraryResult.estimatedTotalCost}</strong>
                    </span>
                  </div>

                  <div className="space-y-3">
                    {aiItineraryResult.days.map((d) => (
                      <div key={d.dayNumber} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-1.5 text-emerald-800">
                            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] grid place-items-center font-bold">
                              D{d.dayNumber}
                            </span>
                            Day {d.dayNumber}: {d.theme}
                          </span>
                        </div>

                        <div className="space-y-1.5 pl-6">
                          {d.activities.map((a, i) => (
                            <div key={i} className="flex items-start justify-between text-xs py-1 border-b border-slate-200/60 last:border-0">
                              <div>
                                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                  <span className="text-[10px] text-emerald-700 font-mono font-semibold">{a.timeSlot}</span>
                                  <span>{a.title}</span>
                                </div>
                                <div className="text-[11px] text-slate-500">{a.locationName} · <span className="text-slate-400">{a.description}</span></div>
                              </div>
                              <span className="font-bold text-slate-700 shrink-0 ml-2">
                                {a.cost && a.cost > 0 ? `$${a.cost}` : 'Free'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <button
                onClick={() => setShowAiItineraryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (!aiItineraryResult || !trip) return;
                  setIsApplyingItinerary(true);
                  try {
                    for (const act of aiItineraryResult.allActivities) {
                      await addTripActivity(trip.id, act);
                    }
                    sendTripChatMessage(
                      trip.id,
                      `applied an AI-generated ${aiItineraryResult.totalDays}-day itinerary schedule (${aiItineraryResult.allActivities.length} activities)!`,
                      currentUser.name,
                      'activity_log'
                    );
                    await loadWorkspaceData();
                    setShowAiItineraryModal(false);
                  } catch (err) {
                    console.error('Error applying itinerary', err);
                  } finally {
                    setIsApplyingItinerary(false);
                  }
                }}
                disabled={isApplyingItinerary || !aiItineraryResult}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Sparkles size={14} />
                <span>{isApplyingItinerary ? 'Applying to Workspace…' : 'Apply Itinerary to Trip'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
