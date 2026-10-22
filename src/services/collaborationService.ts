/**
 * Trip Collaboration Service
 * Powers multi-user trip collaboration features: group chat, task boards,
 * voting polls, expense splitting with debt settlement, shared documents,
 * and travel memories/journal entries. Uses localStorage for preview mode.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { apiRequest } from './apiClient';

// --- Types & Interfaces ---
export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface TripChatMessage {
  id: string;
  tripId: string;
  senderId?: string;
  senderName: string;
  senderAvatar?: string;
  message: string;
  messageType: 'text' | 'activity_log' | 'poll_share' | 'image';
  createdAt: string;
}

export interface TripTask {
  id: string;
  tripId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedEmail?: string;
  dueDate?: string;
  status: TaskStatus;
  category: string;
  createdAt: string;
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
  voterNames: string[];
}

export interface TripPoll {
  id: string;
  tripId: string;
  question: string;
  options: PollOption[];
  isClosed: boolean;
  totalVotes: number;
  userVotedOption?: number;
  createdAt: string;
}

export interface TripExpense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string; // Member name
  splitAmong: string[]; // Member names
  category: string;
  date: string;
}

export interface DebtSettlement {
  from: string;
  to: string;
  amount: number;
}

export interface TripDocument {
  id: string;
  tripId: string;
  uploaderName: string;
  documentName: string;
  documentType: 'flight_ticket' | 'hotel_voucher' | 'visa' | 'passport' | 'other';
  fileUrl?: string;
  fileSizeKb: number;
  uploadedAt: string;
}

export interface TripMemory {
  id: string;
  tripId: string;
  uploadedBy: string;
  title: string;
  locationName?: string;
  caption?: string;
  imageUrl: string;
  date: string;
  likes: string[];
  tags: string[];
}

// ---------------------------------------------------------------------------
// Mock Store in LocalStorage
// ---------------------------------------------------------------------------
const CHAT_KEY = 'voyana.trip_chat';
const TASKS_KEY = 'voyana.trip_tasks';
const POLLS_KEY = 'voyana.trip_polls';
const EXPENSES_KEY = 'voyana.trip_expenses';
const DOCS_KEY = 'voyana.trip_docs';
const MEMORIES_KEY = 'voyana.trip_memories';

const INITIAL_CHAT: Record<string, TripChatMessage[]> = {
  'trip-user-01': [
    {
      id: 'msg-01',
      tripId: 'trip-user-01',
      senderName: 'Megha Lalwani',
      message: 'Hey everyone! Welcome to the Paris trip workspace. Let us finalize our museum itinerary and dinner plans here!',
      messageType: 'text',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'msg-02',
      tripId: 'trip-user-01',
      senderName: 'Bhavika Sainani',
      message: 'I have confirmed our high-speed Eurostar transport and hotel reservation at Ritz Paris!',
      messageType: 'text',
      createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    },
    {
      id: 'msg-03',
      tripId: 'trip-user-01',
      senderName: 'Diya Shah',
      message: 'Awesome! I created a poll for our Day 2 dinner restaurant. Please vote!',
      messageType: 'activity_log',
      createdAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    },
  ],
};

const INITIAL_TASKS: Record<string, TripTask[]> = {
  'trip-user-01': [
    {
      id: 'tsk-01',
      tripId: 'trip-user-01',
      title: 'Book Louvre Museum priority access passes',
      assignedTo: 'Diya Shah',
      dueDate: '2026-10-08',
      status: 'completed',
      category: 'Sightseeing',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tsk-02',
      tripId: 'trip-user-01',
      title: 'Confirm airport private chauffeur pickup terminal',
      assignedTo: 'Bhavika Sainani',
      dueDate: '2026-10-10',
      status: 'in_progress',
      category: 'Transport',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tsk-03',
      tripId: 'trip-user-01',
      title: 'Check Schengen visa requirements & digital copies',
      assignedTo: 'Megha Lalwani',
      dueDate: '2026-10-05',
      status: 'completed',
      category: 'Documents',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tsk-04',
      tripId: 'trip-user-01',
      title: 'Reserve Seine river sunset dinner table for 4',
      assignedTo: 'Megha Lalwani',
      dueDate: '2026-10-11',
      status: 'todo',
      category: 'Dining',
      createdAt: new Date().toISOString(),
    },
  ],
};

const INITIAL_POLLS: Record<string, TripPoll[]> = {
  'trip-user-01': [
    {
      id: 'poll-01',
      tripId: 'trip-user-01',
      question: 'Where should we have our welcome group dinner on Day 1?',
      options: [
        { id: 0, text: 'Le Jules Verne (Eiffel Tower Dining)', votes: 3, voterNames: ['Megha Lalwani', 'Diya Shah', 'Jagrat Kumar'] },
        { id: 1, text: 'Le Marais Traditional French Bistro', votes: 1, voterNames: ['Bhavika Sainani'] },
        { id: 2, text: 'Montmartre Rooftop Lounge', votes: 0, voterNames: [] },
      ],
      isClosed: false,
      totalVotes: 4,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'poll-02',
      tripId: 'trip-user-01',
      question: 'Day 3 Morning Excursion: Which sounds better?',
      options: [
        { id: 0, text: 'Palace of Versailles Half-Day Trip', votes: 2, voterNames: ['Megha Lalwani', 'Bhavika Sainani'] },
        { id: 1, text: 'Giverny Monet Garden Art Walk', votes: 2, voterNames: ['Diya Shah', 'Jagrat Kumar'] },
      ],
      isClosed: false,
      totalVotes: 4,
      createdAt: new Date().toISOString(),
    },
  ],
};

const INITIAL_EXPENSES: Record<string, TripExpense[]> = {
  'trip-user-01': [
    {
      id: 'exp-01',
      tripId: 'trip-user-01',
      title: 'Hotel Ritz Paris Accommodation (Shared)',
      amount: 1500,
      currency: 'USD',
      paidBy: 'Megha Lalwani',
      splitAmong: ['Megha Lalwani', 'Bhavika Sainani', 'Diya Shah', 'Jagrat Kumar'],
      category: 'Accommodation',
      date: '2026-10-12',
    },
    {
      id: 'exp-02',
      tripId: 'trip-user-01',
      title: 'Airport Mercedes Chauffeur Transfer',
      amount: 120,
      currency: 'USD',
      paidBy: 'Bhavika Sainani',
      splitAmong: ['Megha Lalwani', 'Bhavika Sainani', 'Diya Shah', 'Jagrat Kumar'],
      category: 'Transport',
      date: '2026-10-12',
    },
    {
      id: 'exp-03',
      tripId: 'trip-user-01',
      title: 'Louvre Group Guided Tour Passes',
      amount: 180,
      currency: 'USD',
      paidBy: 'Diya Shah',
      splitAmong: ['Megha Lalwani', 'Bhavika Sainani', 'Diya Shah', 'Jagrat Kumar'],
      category: 'Activities',
      date: '2026-10-13',
    },
  ],
};

const INITIAL_DOCS: Record<string, TripDocument[]> = {
  'trip-user-01': [
    {
      id: 'doc-01',
      tripId: 'trip-user-01',
      uploaderName: 'Bhavika Sainani',
      documentName: 'AirFrance_Paris_E-Tickets.pdf',
      documentType: 'flight_ticket',
      fileSizeKb: 420,
      uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'doc-02',
      tripId: 'trip-user-01',
      uploaderName: 'Megha Lalwani',
      documentName: 'Hotel_Ritz_Confirmed_Voucher.pdf',
      documentType: 'hotel_voucher',
      fileSizeKb: 680,
      uploadedAt: new Date().toISOString(),
    },
  ],
};

const INITIAL_MEMORIES: Record<string, TripMemory[]> = {
  'trip-user-01': [
    {
      id: 'mem-01',
      tripId: 'trip-user-01',
      uploadedBy: 'Megha Lalwani',
      title: 'Eiffel Tower Sunset at Trocadéro',
      locationName: 'Place du Trocadéro, Paris',
      caption: 'The golden hour light hitting the Eiffel tower was completely surreal! Must-do for everyone.',
      imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1000&auto=format&fit=crop&q=80',
      date: '2026-10-12',
      likes: ['Diya Shah', 'Bhavika Sainani', 'Jagrat Kumar'],
      tags: ['Sunset', 'Sightseeing', 'MustSee'],
    },
    {
      id: 'mem-02',
      tripId: 'trip-user-01',
      uploadedBy: 'Diya Shah',
      title: 'Midnight Croissants in Saint-Germain',
      locationName: 'Café de Flore, Paris',
      caption: 'Best hot chocolate and buttery flaky croissants we ever tasted!',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
      date: '2026-10-13',
      likes: ['Megha Lalwani', 'Bhavika Sainani'],
      tags: ['Food', 'Bakery', 'Nightlife'],
    },
    {
      id: 'mem-03',
      tripId: 'trip-user-01',
      uploadedBy: 'Bhavika Sainani',
      title: 'Louvre Pyramid Glass Reflections',
      locationName: 'Musée du Louvre, Paris',
      caption: 'Finally saw the Mona Lisa and the Winged Victory! Breathtaking architectural reflections.',
      imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1000&auto=format&fit=crop&q=80',
      date: '2026-10-14',
      likes: ['Megha Lalwani', 'Diya Shah', 'Jagrat Kumar'],
      tags: ['Museum', 'Art', 'Architecture'],
    },
  ],
};

// ---------------------------------------------------------------------------
// 1. Group Chat Methods
// ---------------------------------------------------------------------------
// 1. Group Chat Methods
// ---------------------------------------------------------------------------
export async function getTripChatMessages(tripId: string): Promise<TripChatMessage[]> {
  try {
    const res = await apiRequest<{ ok: boolean; messages: TripChatMessage[] }>(`/api/collaboration/${tripId}/chat`);
    if (res.ok && res.data?.messages && res.data.messages.length > 0) {
      const raw = localStorage.getItem(CHAT_KEY);
      const store = raw ? JSON.parse(raw) : INITIAL_CHAT;
      store[tripId] = res.data.messages;
      localStorage.setItem(CHAT_KEY, JSON.stringify(store));
      return res.data.messages;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(CHAT_KEY);
    const store = raw ? JSON.parse(raw) : INITIAL_CHAT;
    return store[tripId] || INITIAL_CHAT['trip-user-01'] || [];
  } catch {
    return INITIAL_CHAT[tripId] || INITIAL_CHAT['trip-user-01'] || [];
  }
}

export async function sendTripChatMessage(
  tripId: string,
  message: string,
  senderName: string = 'Megha Lalwani',
  messageType: 'text' | 'activity_log' | 'poll_share' | 'image' = 'text'
): Promise<TripChatMessage> {
  try {
    const res = await apiRequest<{ ok: boolean; message: TripChatMessage }>(`/api/collaboration/${tripId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, senderName, messageType }),
    });
    if (res.ok && res.data?.message) {
      const raw = localStorage.getItem(CHAT_KEY);
      const store = raw ? JSON.parse(raw) : INITIAL_CHAT;
      if (!store[tripId]) store[tripId] = [];
      store[tripId].push(res.data.message);
      localStorage.setItem(CHAT_KEY, JSON.stringify(store));
      return res.data.message;
    }
  } catch {}

  const raw = localStorage.getItem(CHAT_KEY);
  const store = raw ? JSON.parse(raw) : INITIAL_CHAT;

  if (!store[tripId]) store[tripId] = [];

  const newMsg: TripChatMessage = {
    id: `msg-${Date.now()}`,
    tripId,
    senderName,
    message,
    messageType,
    createdAt: new Date().toISOString(),
  };

  store[tripId].push(newMsg);
  localStorage.setItem(CHAT_KEY, JSON.stringify(store));
  return newMsg;
}

// ---------------------------------------------------------------------------
// 2. Task Board Methods
// ---------------------------------------------------------------------------
export async function getTripTasks(tripId: string): Promise<TripTask[]> {
  try {
    const res = await apiRequest<{ ok: boolean; tasks: TripTask[] }>(`/api/collaboration/${tripId}/tasks`);
    if (res.ok && res.data?.tasks && res.data.tasks.length > 0) {
      const raw = localStorage.getItem(TASKS_KEY);
      const store = raw ? JSON.parse(raw) : INITIAL_TASKS;
      store[tripId] = res.data.tasks;
      localStorage.setItem(TASKS_KEY, JSON.stringify(store));
      return res.data.tasks;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(TASKS_KEY);
    const store = raw ? JSON.parse(raw) : INITIAL_TASKS;
    return store[tripId] || INITIAL_TASKS['trip-user-01'] || [];
  } catch {
    return INITIAL_TASKS[tripId] || INITIAL_TASKS['trip-user-01'] || [];
  }
}

export async function createTripTask(
  tripId: string,
  task: Omit<TripTask, 'id' | 'tripId' | 'createdAt'>
): Promise<TripTask> {
  try {
    const res = await apiRequest<{ ok: boolean; task: TripTask }>(`/api/collaboration/${tripId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
    if (res.ok && res.data?.task) {
      const raw = localStorage.getItem(TASKS_KEY);
      const store = raw ? JSON.parse(raw) : INITIAL_TASKS;
      if (!store[tripId]) store[tripId] = [];
      store[tripId].unshift(res.data.task);
      localStorage.setItem(TASKS_KEY, JSON.stringify(store));
      return res.data.task;
    }
  } catch {}

  const raw = localStorage.getItem(TASKS_KEY);
  const store = raw ? JSON.parse(raw) : INITIAL_TASKS;

  if (!store[tripId]) store[tripId] = [];

  const newTask: TripTask = {
    ...task,
    id: `tsk-${Date.now()}`,
    tripId,
    createdAt: new Date().toISOString(),
  };

  store[tripId].unshift(newTask);
  localStorage.setItem(TASKS_KEY, JSON.stringify(store));
  return newTask;
}

export async function updateTripTaskStatus(
  tripId: string,
  taskId: string,
  newStatus: TaskStatus
): Promise<boolean> {
  try {
    await apiRequest(`/api/collaboration/${tripId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    });
  } catch {}

  const raw = localStorage.getItem(TASKS_KEY);
  const store = raw ? JSON.parse(raw) : INITIAL_TASKS;

  if (!store[tripId]) return false;

  const target = store[tripId].find((t: TripTask) => t.id === taskId);
  if (target) {
    target.status = newStatus;
    localStorage.setItem(TASKS_KEY, JSON.stringify(store));
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 3. Voting & Polls Methods
// ---------------------------------------------------------------------------
export async function getTripPolls(tripId: string): Promise<TripPoll[]> {
  try {
    const res = await apiRequest<{ ok: boolean; polls: TripPoll[] }>(`/api/collaboration/${tripId}/polls`);
    if (res.ok && res.data?.polls && res.data.polls.length > 0) {
      const raw = localStorage.getItem(POLLS_KEY);
      const store = raw ? JSON.parse(raw) : INITIAL_POLLS;
      store[tripId] = res.data.polls;
      localStorage.setItem(POLLS_KEY, JSON.stringify(store));
      return res.data.polls;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(POLLS_KEY);
    const store = raw ? JSON.parse(raw) : INITIAL_POLLS;
    return store[tripId] || INITIAL_POLLS['trip-user-01'] || [];
  } catch {
    return INITIAL_POLLS[tripId] || INITIAL_POLLS['trip-user-01'] || [];
  }
}

export async function createTripPoll(
  tripId: string,
  question: string,
  optionTexts: string[]
): Promise<TripPoll> {
  const raw = localStorage.getItem(POLLS_KEY);
  const store = raw ? JSON.parse(raw) : INITIAL_POLLS;

  if (!store[tripId]) store[tripId] = [];

  const newPoll: TripPoll = {
    id: `poll-${Date.now()}`,
    tripId,
    question,
    options: optionTexts.map((text, idx) => ({
      id: idx,
      text,
      votes: 0,
      voterNames: [],
    })),
    isClosed: false,
    totalVotes: 0,
    createdAt: new Date().toISOString(),
  };

  store[tripId].unshift(newPoll);
  localStorage.setItem(POLLS_KEY, JSON.stringify(store));
  return newPoll;
}

export async function voteTripPoll(
  tripId: string,
  pollId: string,
  optionIndex: number,
  voterName: string = 'Megha Lalwani'
): Promise<TripPoll | null> {
  const raw = localStorage.getItem(POLLS_KEY);
  const store = raw ? JSON.parse(raw) : INITIAL_POLLS;

  if (!store[tripId]) return null;

  const target = store[tripId].find((p: TripPoll) => p.id === pollId);
  if (!target || target.isClosed) return null;

  // Remove previous vote if any
  target.options.forEach((opt: PollOption) => {
    const idx = opt.voterNames.indexOf(voterName);
    if (idx !== -1) {
      opt.voterNames.splice(idx, 1);
      opt.votes = Math.max(0, opt.votes - 1);
    }
  });

  // Add new vote
  if (target.options[optionIndex]) {
    target.options[optionIndex].votes += 1;
    target.options[optionIndex].voterNames.push(voterName);
    target.userVotedOption = optionIndex;
  }

  target.totalVotes = target.options.reduce((acc: number, curr: PollOption) => acc + curr.votes, 0);

  localStorage.setItem(POLLS_KEY, JSON.stringify(store));
  return target;
}

// ---------------------------------------------------------------------------
// 4. Expense Splitting & Debt Settlement Calculator
// ---------------------------------------------------------------------------
export async function getTripExpenses(tripId: string): Promise<TripExpense[]> {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    const store = raw ? JSON.parse(raw) : INITIAL_EXPENSES;
    return store[tripId] || [];
  } catch {
    return INITIAL_EXPENSES[tripId] || [];
  }
}

export async function addTripExpense(
  tripId: string,
  expense: Omit<TripExpense, 'id' | 'tripId'>
): Promise<TripExpense> {
  const raw = localStorage.getItem(EXPENSES_KEY);
  const store = raw ? JSON.parse(raw) : INITIAL_EXPENSES;

  if (!store[tripId]) store[tripId] = [];

  const newExp: TripExpense = {
    ...expense,
    id: `exp-${Date.now()}`,
    tripId,
  };

  store[tripId].unshift(newExp);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(store));
  return newExp;
}

export function calculateDebtSettlement(
  expenses: TripExpense[],
  allMembers: string[]
): {
  balances: Record<string, number>; // positive = is owed money, negative = owes money
  settlements: DebtSettlement[];
  totalSpent: number;
} {
  const balances: Record<string, number> = {};
  allMembers.forEach((m) => (balances[m] = 0));
  let totalSpent = 0;

  expenses.forEach((exp) => {
    totalSpent += exp.amount;
    const splitCount = exp.splitAmong.length || 1;
    const share = exp.amount / splitCount;

    // The person who paid gets credit
    balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;

    // Everyone who split gets debited their share
    exp.splitAmong.forEach((member) => {
      balances[member] = (balances[member] || 0) - share;
    });
  });

  // Calculate simplified settlements
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  Object.entries(balances).forEach(([name, bal]) => {
    const rounded = Math.round(bal * 100) / 100;
    if (rounded < -0.01) debtors.push({ name, amount: -rounded });
    if (rounded > 0.01) creditors.push({ name, amount: rounded });
  });

  const settlements: DebtSettlement[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleAmt = Math.min(debtor.amount, creditor.amount);

    settlements.push({
      from: debtor.name,
      to: creditor.name,
      amount: Math.round(settleAmt * 100) / 100,
    });

    debtor.amount -= settleAmt;
    creditor.amount -= settleAmt;

    if (debtor.amount <= 0.01) dIdx++;
    if (creditor.amount <= 0.01) cIdx++;
  }

  return { balances, settlements, totalSpent };
}

/**
 * Export Trip Expenses and Settlement Ledger to CSV format (VPM-76)
 */
export function exportTripExpensesCSV(
  expenses: TripExpense[],
  settlements: DebtSettlement[] = [],
  tripTitle: string = 'Trip'
): string {
  const safeTitle = tripTitle.replace(/"/g, '""');
  const now = new Date().toISOString();

  const lines: string[] = [
    `"Voyana Travel Platform - Trip Transaction Ledger"`,
    `"Trip:","${safeTitle}"`,
    `"Exported At:","${now}"`,
    `"Total Expenses Count:",${expenses.length}`,
    `"Total Spend:",${expenses.reduce((s, e) => s + e.amount, 0)}`,
    ``,
    `"--- ITEMIZED EXPENSES ---"`,
    `"Expense ID","Date","Title","Category","Paid By","Split Among","Amount","Currency","Share Per Person"`,
  ];

  expenses.forEach((e) => {
    const splitCount = e.splitAmong.length || 1;
    const perPerson = (e.amount / splitCount).toFixed(2);
    lines.push(
      [
        `"${e.id}"`,
        `"${e.date}"`,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${e.category}"`,
        `"${e.paidBy.replace(/"/g, '""')}"`,
        `"${e.splitAmong.join(', ').replace(/"/g, '""')}"`,
        e.amount,
        `"${e.currency}"`,
        perPerson,
      ].join(',')
    );
  });

  if (settlements.length > 0) {
    lines.push(``);
    lines.push(`"--- DEBT SETTLEMENT LEDGER (WHO OWES WHOM) ---"`);
    lines.push(`"Debtor (Owes)","Creditor (Owed)","Settlement Amount"`);
    settlements.forEach((s) => {
      lines.push([`"${s.from.replace(/"/g, '""')}"`, `"${s.to.replace(/"/g, '""')}"`, s.amount].join(','));
    });
  }

  return lines.join('\n');
}

/**
 * Triggers browser download of the trip transaction CSV file (VPM-76)
 */
export function downloadTripTransactionsCSV(
  expenses: TripExpense[],
  settlements: DebtSettlement[] = [],
  tripTitle: string = 'Trip'
): void {
  const csvContent = exportTripExpensesCSV(expenses, settlements, tripTitle);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const sanitizedTitle = tripTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Voyana_${sanitizedTitle}_Transactions.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ---------------------------------------------------------------------------
// 5. Travel Documents Repository
// ---------------------------------------------------------------------------
export async function getTripDocuments(tripId: string): Promise<TripDocument[]> {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    const store = raw ? JSON.parse(raw) : INITIAL_DOCS;
    return store[tripId] || [];
  } catch {
    return INITIAL_DOCS[tripId] || [];
  }
}

export async function uploadTripDocument(
  tripId: string,
  doc: Omit<TripDocument, 'id' | 'tripId' | 'uploadedAt'>
): Promise<TripDocument> {
  const raw = localStorage.getItem(DOCS_KEY);
  const store = raw ? JSON.parse(raw) : INITIAL_DOCS;

  if (!store[tripId]) store[tripId] = [];

  const newDoc: TripDocument = {
    ...doc,
    id: `doc-${Date.now()}`,
    tripId,
    uploadedAt: new Date().toISOString(),
  };

  store[tripId].unshift(newDoc);
  localStorage.setItem(DOCS_KEY, JSON.stringify(store));
  return newDoc;
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 6. Trip Memories & Travel Journal (Connected to MongoDB Atlas)
// ---------------------------------------------------------------------------

/**
 * Fetch all travel memories across all trips from MongoDB Atlas,
 * with optional filtering by tripId, tag, search query, or sorting.
 */
export async function getAllMemories(params?: {
  tripId?: string;
  tag?: string;
  search?: string;
  sortBy?: string;
}): Promise<TripMemory[]> {
  try {
    const query = new URLSearchParams();
    if (params?.tripId && params.tripId !== 'all') query.set('tripId', params.tripId);
    if (params?.tag && params.tag !== 'all') query.set('tag', params.tag);
    if (params?.search && params.search.trim()) query.set('search', params.search.trim());
    if (params?.sortBy) query.set('sortBy', params.sortBy);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiRequest<{ ok: boolean; memories: TripMemory[] }>(`/api/memories${queryString}`);
    if (res.ok && Array.isArray(res.data?.memories) && res.data.memories.length > 0) {
      const raw = localStorage.getItem(MEMORIES_KEY);
      const store = raw ? JSON.parse(raw) : INITIAL_MEMORIES;
      res.data.memories.forEach((mem) => {
        if (!store[mem.tripId]) store[mem.tripId] = [];
        const existingIdx = store[mem.tripId].findIndex((m: TripMemory) => m.id === mem.id);
        if (existingIdx > -1) {
          store[mem.tripId][existingIdx] = mem;
        } else {
          store[mem.tripId].push(mem);
        }
      });
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(store));
      return res.data.memories;
    }
  } catch (err) {
    console.warn('[collaborationService] getAllMemories API failed, falling back to local store:', err);
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(MEMORIES_KEY);
    const store: Record<string, TripMemory[]> = raw ? JSON.parse(raw) : INITIAL_MEMORIES;
    const all = Object.values(store).flat();
    return all;
  } catch {
    return Object.values(INITIAL_MEMORIES).flat();
  }
}

export async function getTripMemories(tripId: string): Promise<TripMemory[]> {
  try {
    const res = await apiRequest<{ ok: boolean; memories: TripMemory[] }>(`/api/collaboration/${tripId}/memories`);
    if (res.ok && res.data?.memories && res.data.memories.length > 0) {
      const raw = localStorage.getItem(MEMORIES_KEY);
      const store = raw ? JSON.parse(raw) : INITIAL_MEMORIES;
      store[tripId] = res.data.memories;
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(store));
      return res.data.memories;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(MEMORIES_KEY);
    const store = raw ? JSON.parse(raw) : INITIAL_MEMORIES;
    return store[tripId] || INITIAL_MEMORIES['trip-user-01'] || [];
  } catch {
    return INITIAL_MEMORIES['trip-user-01'] || [];
  }
}

export async function uploadTripMemory(
  tripId: string,
  memory: Omit<TripMemory, 'id' | 'tripId' | 'likes'>
): Promise<TripMemory> {
  // 1. Persist directly to MongoDB Atlas backend
  try {
    const res = await apiRequest<{ ok: boolean; memory: TripMemory }>(`/api/collaboration/${tripId}/memories`, {
      method: 'POST',
      body: JSON.stringify({
        ...memory,
        tripId,
      }),
    });

    if (res.ok && res.data?.memory) {
      const saved = res.data.memory;
      const raw = localStorage.getItem(MEMORIES_KEY);
      const store = raw ? JSON.parse(raw) : INITIAL_MEMORIES;
      if (!store[tripId]) store[tripId] = [];
      store[tripId].unshift(saved);
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(store));
      return saved;
    }
  } catch (err) {
    console.warn('[collaborationService] uploadTripMemory API failed, falling back to local save:', err);
  }

  // 2. Fallback to localStorage if API is temporarily unavailable
  const raw = localStorage.getItem(MEMORIES_KEY);
  const store = raw ? JSON.parse(raw) : INITIAL_MEMORIES;

  if (!store[tripId]) store[tripId] = [];

  const newMem: TripMemory = {
    ...memory,
    id: `mem-${Date.now()}`,
    tripId,
    likes: [],
  };

  store[tripId].unshift(newMem);
  localStorage.setItem(MEMORIES_KEY, JSON.stringify(store));
  return newMem;
}

export async function likeTripMemory(
  tripId: string,
  memoryId: string,
  userName: string
): Promise<{ success: boolean; likes: string[] }> {
  // 1. Sync with MongoDB Atlas backend
  try {
    const res = await apiRequest<{ ok: boolean; likes: string[]; isLiked: boolean }>(
      `/api/collaboration/${tripId}/memories/${memoryId}/like`,
      {
        method: 'POST',
        body: JSON.stringify({ userName }),
      }
    );

    if (res.ok && Array.isArray(res.data?.likes)) {
      const likes = res.data.likes;
      const raw = localStorage.getItem(MEMORIES_KEY);
      const store = raw ? JSON.parse(raw) : INITIAL_MEMORIES;
      const list: TripMemory[] = store[tripId] || [];
      const target = list.find((m) => m.id === memoryId);
      if (target) {
        target.likes = likes;
        localStorage.setItem(MEMORIES_KEY, JSON.stringify(store));
      }
      return { success: true, likes };
    }
  } catch (err) {
    console.warn('[collaborationService] likeTripMemory API failed, falling back to local toggle:', err);
  }

  // 2. Fallback to localStorage
  const raw = localStorage.getItem(MEMORIES_KEY);
  const store = raw ? JSON.parse(raw) : INITIAL_MEMORIES;

  const list: TripMemory[] = store[tripId] || [];
  const target = list.find((m) => m.id === memoryId);
  if (!target) return { success: false, likes: [] };

  if (target.likes.includes(userName)) {
    target.likes = target.likes.filter((u) => u !== userName);
  } else {
    target.likes.push(userName);
  }

  localStorage.setItem(MEMORIES_KEY, JSON.stringify(store));
  return { success: true, likes: target.likes };
}

export async function deleteTripMemory(
  tripId: string,
  memoryId: string
): Promise<{ success: boolean }> {
  // 1. Delete from MongoDB Atlas backend
  try {
    const res = await apiRequest<{ ok: boolean }>(`/api/collaboration/${tripId}/memories/${memoryId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const raw = localStorage.getItem(MEMORIES_KEY);
      const store = raw ? JSON.parse(raw) : INITIAL_MEMORIES;
      if (store[tripId]) {
        store[tripId] = store[tripId].filter((m: TripMemory) => m.id !== memoryId);
        localStorage.setItem(MEMORIES_KEY, JSON.stringify(store));
      }
      return { success: true };
    }
  } catch (err) {
    console.warn('[collaborationService] deleteTripMemory API failed, falling back to local delete:', err);
  }

  // 2. Fallback to localStorage
  const raw = localStorage.getItem(MEMORIES_KEY);
  const store = raw ? JSON.parse(raw) : INITIAL_MEMORIES;

  if (store[tripId]) {
    store[tripId] = store[tripId].filter((m: TripMemory) => m.id !== memoryId);
    localStorage.setItem(MEMORIES_KEY, JSON.stringify(store));
  }

  return { success: true };
}

export async function updateTripMemory(
  memoryId: string,
  updates: Partial<TripMemory>
): Promise<{ success: boolean; memory?: TripMemory }> {
  try {
    const res = await apiRequest<{ ok: boolean; memory: TripMemory }>(`/api/memories/${memoryId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (res.ok && res.data?.memory) {
      const updated = res.data.memory;
      const raw = localStorage.getItem(MEMORIES_KEY);
      const store = raw ? JSON.parse(raw) : INITIAL_MEMORIES;
      if (updated.tripId && store[updated.tripId]) {
        const idx = store[updated.tripId].findIndex((m: TripMemory) => m.id === memoryId);
        if (idx > -1) store[updated.tripId][idx] = updated;
        localStorage.setItem(MEMORIES_KEY, JSON.stringify(store));
      }
      return { success: true, memory: updated };
    }
  } catch (err) {
    console.warn('[collaborationService] updateTripMemory API failed:', err);
  }
  return { success: false };
}

/**
 * AI Travel Journal Content Generator (VPM-63)
 * Automatically synthesizes an evocative travel journal reflection and tags
 * based on photo title, location, and destination context.
 */
export function generateAiJournalStory(params: {
  title?: string;
  location?: string;
  destination?: string;
}): { caption: string; tags: string[] } {
  const { title = '', location = '', destination = 'the journey' } = params;
  const place = location || destination || 'this unforgettable spot';
  const subject = title || 'travel moment';

  const reflections = [
    {
      caption: `Paused in the quiet glow of ${place} to take in "${subject}". There's a singular magic to traveling when the bustling world fades into soft light, leaving behind only the timeless pulse of discovery and genuine gratitude.`,
      tags: ['TravelMoments', 'Wanderlust', 'GoldenHour', 'ExploreMore'],
    },
    {
      caption: `Unscripted memories are always the ones that linger longest. Finding ourselves surrounded by the sights, sounds, and vibrant rhythms of ${place} felt like stepping into an intimate postcard from "${subject}".`,
      tags: ['TravelDiary', 'HiddenGems', 'AdventureAwaits', 'LocalVibes'],
    },
    {
      caption: `Every street corner in ${place} carries its own quiet poetry. Standing here capturing "${subject}", you are reminded that the truest luxury of travel is time well shared with companions and open horizons.`,
      tags: ['MemoriesInTheMaking', 'CultureTrip', 'TravelInspiration', 'JourneyOn'],
    },
    {
      caption: `A snapshot that captures far more than just a photo—the laughter, the crisp morning breeze in ${place}, and the thrill of exploring "${subject}" together. Definitely one for the permanent travel journal.`,
      tags: ['TravelJournal', 'FriendshipTrip', 'PostcardsFromEverywhere', 'Wanderer'],
    },
  ];

  const hash = (subject + place).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return reflections[hash % reflections.length];
}

