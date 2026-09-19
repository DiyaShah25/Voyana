import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
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
export async function getTripChatMessages(tripId: string): Promise<TripChatMessage[]> {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    const store = raw ? JSON.parse(raw) : INITIAL_CHAT;
    return store[tripId] || [];
  } catch {
    return INITIAL_CHAT[tripId] || [];
  }
}

export async function sendTripChatMessage(
  tripId: string,
  message: string,
  senderName: string = 'Megha Lalwani',
  messageType: 'text' | 'activity_log' | 'poll_share' | 'image' = 'text'
): Promise<TripChatMessage> {
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
    const raw = localStorage.getItem(TASKS_KEY);
    const store = raw ? JSON.parse(raw) : INITIAL_TASKS;
    return store[tripId] || [];
  } catch {
    return INITIAL_TASKS[tripId] || [];
  }
}

export async function createTripTask(
  tripId: string,
  task: Omit<TripTask, 'id' | 'tripId' | 'createdAt'>
): Promise<TripTask> {
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
    const raw = localStorage.getItem(POLLS_KEY);
    const store = raw ? JSON.parse(raw) : INITIAL_POLLS;
    return store[tripId] || [];
  } catch {
    return INITIAL_POLLS[tripId] || [];
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
// 4. Expense Splitting & Debt Settlement Calculator (Epic VPM-7 / VPM-8)
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
// 6. Trip Memories & Travel Journal (VPM-9)
// ---------------------------------------------------------------------------
export async function getTripMemories(tripId: string): Promise<TripMemory[]> {
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
  const raw = localStorage.getItem(MEMORIES_KEY);
  const store = raw ? JSON.parse(raw) : INITIAL_MEMORIES;

  if (store[tripId]) {
    store[tripId] = store[tripId].filter((m: TripMemory) => m.id !== memoryId);
    localStorage.setItem(MEMORIES_KEY, JSON.stringify(store));
  }

  return { success: true };
}

