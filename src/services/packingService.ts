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
  seasonOrWeather: 'Mild Autumn (14°C - 20°C, occasional rain)',
  items: [
    {
      id: 'pack-1',
      name: 'Passport & Visa Documents',
      category: 'Documents & Money',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Diya Shah',
      quantity: 1,
      notes: 'Digital backup in encrypted cloud',
    },
    {
      id: 'pack-2',
      name: 'Travel Insurance Certificate',
      category: 'Documents & Money',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: 1,
    },
    {
      id: 'pack-3',
      name: 'Credit / Forex Cards + €200 Cash',
      category: 'Documents & Money',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Tirth Gandhi',
      quantity: 1,
    },
    {
      id: 'pack-4',
      name: 'Universal Power Plug (Type C / E)',
      category: 'Electronics',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Nigam Sanghvi',
      quantity: 2,
      notes: 'EU 2-pin compatible',
    },
    {
      id: 'pack-5',
      name: 'High-Capacity Power Bank (20,000 mAh)',
      category: 'Electronics',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Diya Shah',
      quantity: 1,
      notes: 'Carry-on only (airline compliant)',
    },
    {
      id: 'pack-6',
      name: 'Noise Cancelling Headphones',
      category: 'Electronics',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Tirth Gandhi',
      quantity: 1,
    },
    {
      id: 'pack-7',
      name: 'Breathable Cotton T-Shirts',
      category: 'Clothing',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: 5,
      weatherTag: 'Mild Autumn',
    },
    {
      id: 'pack-8',
      name: 'Light Trench Coat / Windbreaker',
      category: 'Clothing',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: 1,
      weatherTag: 'Wind & Chill',
    },
    {
      id: 'pack-9',
      name: 'Comfortable Walking Sneakers (15K+ steps)',
      category: 'Clothing',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Everyone',
      quantity: 1,
    },
    {
      id: 'pack-10',
      name: 'Smart Casual Evening Attire',
      category: 'Clothing',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Everyone',
      quantity: 2,
      notes: 'For French bistros & rooftops',
    },
    {
      id: 'pack-11',
      name: 'Compact Travel Umbrella',
      category: 'Destination Essentials',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Shared',
      quantity: 2,
      weatherTag: 'Rain Shower Warning',
    },
    {
      id: 'pack-12',
      name: 'Prescription Meds & Travel First-Aid',
      category: 'Toiletries & Health',
      isPacked: true,
      priority: 'essential',
      assignedTo: 'Diya Shah',
      quantity: 1,
    },
    {
      id: 'pack-13',
      name: 'TSA-Compliant Toiletry Kit',
      category: 'Toiletries & Health',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Everyone',
      quantity: 1,
    },
    {
      id: 'pack-14',
      name: 'Crossbody Anti-Theft Day Bag',
      category: 'Accessories',
      isPacked: false,
      priority: 'recommended',
      assignedTo: 'Jagrat Kumar',
      quantity: 1,
      notes: 'Recommended for Metro & Louvre areas',
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
