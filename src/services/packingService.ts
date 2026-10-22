/**
 * Smart Packing Checklist & Member Task Assignment Service
 * Manages category-based packing items, checklist progress tracking,
 * weather-aware recommendations, and member item assignments.
 */

import { apiRequest } from './apiClient';

export type PackingCategory =
  | 'Clothing'
  | 'Electronics'
  | 'Documents & Money'
  | 'Toiletries & Health'
  | 'Destination Essentials'
  | 'Accessories';

export type PackingPriority = 'essential' | 'recommended' | 'optional';

export interface PackingItem {
  id: string;
  name: string;
  category: PackingCategory;
  isPacked: boolean;
  priority: PackingPriority;
  assignedTo: string; // Member name or 'Everyone' / 'Shared'
  quantity: number;
  notes?: string;
  weatherTag?: string;
}

export interface PackingListState {
  destination: string;
  tripDurationDays: number;
  seasonOrWeather: string;
  items: PackingItem[];
}

const PACKING_STORAGE_KEY = 'voyana_packing_checklist_v1';

const INITIAL_PACKING_LIST: PackingListState = {
  destination: 'Paris',
  tripDurationDays: 5,
  seasonOrWeather: 'Mild Autumn (14°C - 20°C, occasional rain showers)',
  items: [
    {
      id: 'pack-1',
      name: 'Passport, EU Schengen Visa & Color Photocopied Backups',
      category: 'Documents & Money',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Diya Shah',
      quantity: 1,
      notes: 'Original passports stored in hotel safety deposit vault',
    },
    {
      id: 'pack-2',
      name: 'Allianz Global Travel Insurance Policy Certificate & Card',
      category: 'Documents & Money',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: 1,
      notes: 'Policy #ALZ-89210-EU coverage up to €100,000 emergency medical',
    },
    {
      id: 'pack-3',
      name: 'Chase Sapphire Preferred / Forex Cards + €250 Emergency Cash',
      category: 'Documents & Money',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Tirth Gandhi',
      quantity: 1,
      notes: 'Zero foreign transaction fee cards + small denominations for bakeries',
    },
    {
      id: 'pack-4',
      name: 'Skross World Adapter MUV Micro (Universal Type C / E / F)',
      category: 'Electronics',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Jagrat Kumar',
      quantity: 2,
      notes: 'Compatible with EU 2-pin grounded sockets',
    },
    {
      id: 'pack-5',
      name: 'Anker Prime 20,000mAh Power Bank (200W Output, USB-C PD 3.0)',
      category: 'Electronics',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Diya Shah',
      quantity: 1,
      notes: 'FAA/EASA compliant 72Wh battery for airline cabin carry-on only',
    },
    {
      id: 'pack-6',
      name: 'Sony WH-1000XM5 Noise-Cancelling Headphones with Airline Audio Pin',
      category: 'Electronics',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Alex Morgan',
      quantity: 1,
      notes: 'In-flight entertainment and long train journey quiet focus',
    },
    {
      id: 'pack-7',
      name: 'Icebreaker Merino 200 Oasis Breathable Thermal Baselayers',
      category: 'Clothing',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: 3,
      weatherTag: 'Mild Autumn',
      notes: '100% Merino wool naturally odor-resistant for multi-day wear',
    },
    {
      id: 'pack-8',
      name: 'Arc’teryx Beta LT Gore-Tex Waterproof Breathable Windbreaker',
      category: 'Clothing',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: 1,
      weatherTag: 'Wind & Chill',
      notes: 'Packable outer shell for breezy Seine riverside evenings',
    },
    {
      id: 'pack-9',
      name: 'Hoka Clifton 9 Gore-Tex All-Weather Walking Shoes (15K+ steps)',
      category: 'Clothing',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: 1,
      notes: 'Essential for Paris cobblestones, Louvre corridors and Montmartre hills',
    },
    {
      id: 'pack-10',
      name: 'Smart Casual Evening Attire (Tailored Blazer / Bistro Dresses)',
      category: 'Clothing',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Everyone',
      quantity: 2,
      notes: 'Required dress code for Bateaux Parisiens and Michelin restaurants',
    },
    {
      id: 'pack-11',
      name: 'Fulton Stormlite Windproof Compact Travel Umbrella',
      category: 'Destination Essentials',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Shared',
      quantity: 2,
      weatherTag: 'Rain Shower Warning',
      notes: 'Engineered for up to 55 km/h gusts along the Seine bridges',
    },
    {
      id: 'pack-12',
      name: 'Personal Prescription Medication & Mini First-Aid Antihistamines',
      category: 'Toiletries & Health',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Diya Shah',
      quantity: 1,
      notes: 'Includes blister relief pads, ibuprofen, and hydration electrolyte tablets',
    },
    {
      id: 'pack-13',
      name: 'Matador FlatPak TSA-Compliant 100ml Waterproof Toiletry Bottles',
      category: 'Toiletries & Health',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Everyone',
      quantity: 3,
      notes: 'Leakproof welded Cordura fabric bottles for carry-on liquids',
    },
    {
      id: 'pack-14',
      name: 'Pacsafe Metrosafe X Anti-Theft RFID Crossbody Day Bag',
      category: 'Accessories',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Jagrat Kumar',
      quantity: 1,
      notes: 'Slash-proof wire mesh with lockable zippers for crowded Metro lines',
    },
  ],
};

export function getPackingList(): PackingListState {
  try {
    const saved = localStorage.getItem(PACKING_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error reading packing list from storage', e);
  }
  return INITIAL_PACKING_LIST;
}

export async function fetchPackingList(tripIdOrDestination: string = 'trip-paris-01'): Promise<PackingListState> {
  try {
    const res = await apiRequest<{ ok: boolean; list: any }>(`/api/packing/${tripIdOrDestination}`);
    if (res.ok && res.data?.list) {
      const packingState: PackingListState = {
        destination: res.data.list.destination || 'Paris',
        tripDurationDays: res.data.list.tripDurationDays || 5,
        seasonOrWeather: res.data.list.seasonOrWeather || 'Mild Autumn',
        items: (res.data.list.items && res.data.list.items.length > 0)
          ? res.data.list.items
          : INITIAL_PACKING_LIST.items,
      };
      savePackingList(packingState);
      return packingState;
    }
  } catch (err) {
    console.warn('[PackingService] Backend fetch fallback to local cache:', err);
  }
  return getPackingList();
}

export function savePackingList(state: PackingListState): void {
  try {
    localStorage.setItem(PACKING_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving packing list to storage', e);
  }
}

export function toggleItemPacked(itemId: string): PackingListState {
  const current = getPackingList();
  const updated: PackingListState = {
    ...current,
    items: current.items.map((item) =>
      item.id === itemId ? { ...item, isPacked: !item.isPacked } : item
    ),
  };
  savePackingList(updated);
  return updated;
}

export function addPackingItem(item: Omit<PackingItem, 'id'>): PackingListState {
  const current = getPackingList();
  const newItem: PackingItem = {
    ...item,
    id: `pack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  const updated: PackingListState = {
    ...current,
    items: [newItem, ...current.items],
  };
  savePackingList(updated);
  return updated;
}

export function deletePackingItem(itemId: string): PackingListState {
  const current = getPackingList();
  const updated: PackingListState = {
    ...current,
    items: current.items.filter((item) => item.id !== itemId),
  };
  savePackingList(updated);
  return updated;
}

export function markAllItems(packed: boolean): PackingListState {
  const current = getPackingList();
  const updated: PackingListState = {
    ...current,
    items: current.items.map((item) => ({ ...item, isPacked: packed })),
  };
  savePackingList(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Member Task Assignment & Workload Management
// ---------------------------------------------------------------------------

/**
 * Assign or reassign a specific packing task/item to a member
 */
export function assignPackingItem(itemId: string, assignedTo: string): PackingListState {
  const current = getPackingList();
  const updated: PackingListState = {
    ...current,
    items: current.items.map((item) =>
      item.id === itemId ? { ...item, assignedTo: assignedTo.trim() || 'Everyone' } : item
    ),
  };
  savePackingList(updated);
  return updated;
}

/**
 * Batch assign multiple items to a member
 */
export function batchAssignPackingItems(itemIds: string[], assignedTo: string): PackingListState {
  const current = getPackingList();
  const updated: PackingListState = {
    ...current,
    items: current.items.map((item) =>
      itemIds.includes(item.id) ? { ...item, assignedTo: assignedTo.trim() || 'Everyone' } : item
    ),
  };
  savePackingList(updated);
  return updated;
}

/**
 * Automatically distribute shared/unassigned packing items equally among travelers
 */
export function distributeTasksEqually(members: string[]): PackingListState {
  if (!members || members.length === 0) return getPackingList();
  const current = getPackingList();
  let memberIdx = 0;

  const updated: PackingListState = {
    ...current,
    items: current.items.map((item) => {
      // Re-distribute items marked 'Shared' or 'Everyone'
      if (item.assignedTo === 'Shared' || item.assignedTo === 'Everyone') {
        const assignedMember = members[memberIdx % members.length];
        memberIdx++;
        return { ...item, assignedTo: assignedMember };
      }
      return item;
    }),
  };

  savePackingList(updated);
  return updated;
}

/**
 * Calculate member task assignment statistics
 */
export function getMemberTaskStats(state: PackingListState): Array<{ member: string; total: number; packed: number; percentage: number }> {
  const memberMap: Record<string, { total: number; packed: number }> = {};

  state.items.forEach((item) => {
    const mem = item.assignedTo || 'Everyone';
    if (!memberMap[mem]) {
      memberMap[mem] = { total: 0, packed: 0 };
    }
    memberMap[mem].total += 1;
    if (item.isPacked) {
      memberMap[mem].packed += 1;
    }
  });

  return Object.entries(memberMap).map(([member, stats]) => ({
    member,
    total: stats.total,
    packed: stats.packed,
    percentage: stats.total > 0 ? Math.round((stats.packed / stats.total) * 100) : 0,
  }));
}

export function generateAiChecklist(destination: string, days: number = 5): PackingListState {
  const current = getPackingList();

  const isTropical = ['Bali', 'Goa', 'Phuket', 'Maldives', 'Cancun', 'Dubai', 'Hawaii'].some((d) =>
    destination.toLowerCase().includes(d.toLowerCase())
  );
  const isCold = ['Zurich', 'Reykjavik', 'Oslo', 'Tokyo', 'Banff', 'Innsbruck'].some((d) =>
    destination.toLowerCase().includes(d.toLowerCase())
  );

  const newItems: PackingItem[] = [
    {
      id: `ai-${Date.now()}-1`,
      name: 'Passport, ID & Boarding Passes',
      category: 'Documents & Money',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: 1,
    },
    {
      id: `ai-${Date.now()}-2`,
      name: 'Local Currency & Zero-FX Cards',
      category: 'Documents & Money',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Diya Shah',
      quantity: 1,
      notes: `Target currency for ${destination}`,
    },
    {
      id: `ai-${Date.now()}-3`,
      name: 'Universal Travel Adapter + Extension Hub',
      category: 'Electronics',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Tirth Gandhi',
      quantity: 1,
    },
    {
      id: `ai-${Date.now()}-4`,
      name: 'Power Bank 20,000mAh (Carry-on)',
      category: 'Electronics',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Jagrat Kumar',
      quantity: 1,
    },
    {
      id: `ai-${Date.now()}-5`,
      name: `${days}x Daily Outfits & Moisture Wicking Undergarments`,
      category: 'Clothing',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: days,
    },
    {
      id: `ai-${Date.now()}-6`,
      name: isCold
        ? 'Thermal Base Layers & Insulated Down Parka'
        : isTropical
          ? 'UV-Proof Swimwear & Quick-Dry Linen Shirts'
          : 'Layered Outfits & Trench Windbreaker',
      category: 'Clothing',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: isCold ? 2 : 3,
      weatherTag: isCold ? 'Sub-Zero Protection' : isTropical ? 'Tropical Sun' : 'Variable Autumn Climate',
    },
    {
      id: `ai-${Date.now()}-7`,
      name: 'Ergonomic Walking Shoes / Sneakers',
      category: 'Clothing',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: 1,
    },
    {
      id: `ai-${Date.now()}-8`,
      name: isTropical
        ? 'Reef-Safe SPF 50+ Sunscreen & Aloe Gel'
        : 'Hydrating Moisturizer & SPF 30 Lip Balm',
      category: 'Toiletries & Health',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Shared',
      quantity: 1,
    },
    {
      id: `ai-${Date.now()}-9`,
      name: 'Compact Travel First Aid & Pain Relief',
      category: 'Toiletries & Health',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Diya Shah',
      quantity: 1,
    },
    {
      id: `ai-${Date.now()}-10`,
      name: `City Guidebook & Offline Map Pinning for ${destination}`,
      category: 'Destination Essentials',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Shared',
      quantity: 1,
    },
    {
      id: `ai-${Date.now()}-11`,
      name: isTropical ? 'Quick-Dry Microfiber Beach Towel' : 'Compact Wind-Resistant Umbrella',
      category: 'Destination Essentials',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Jagrat Kumar',
      quantity: 2,
    },
    {
      id: `ai-${Date.now()}-12`,
      name: 'Anti-Theft Crossbody Sling / RFID Blocker',
      category: 'Accessories',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Tirth Gandhi',
      quantity: 1,
    },
  ];

  const generatedState: PackingListState = {
    destination,
    tripDurationDays: days,
    seasonOrWeather: isCold ? 'Crisp Winter / Snow' : isTropical ? 'Warm & Sunny (28°C - 33°C)' : 'Moderate Season (15°C - 22°C)',
    items: newItems,
  };

  savePackingList(generatedState);
  return generatedState;
}
