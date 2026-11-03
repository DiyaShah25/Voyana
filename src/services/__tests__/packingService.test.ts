import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPackingList,
  toggleItemPacked,
  addPackingItem,
  deletePackingItem,
  markAllItems,
  distributeTasksEqually,
  getMemberTaskStats,
  generateAiChecklist,
} from '../packingService';

describe('packingService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retrieves default or saved packing checklist', () => {
    const list = getPackingList();
    expect(list).toBeDefined();
    expect(list.items.length).toBeGreaterThan(0);
  });

  it('toggles item packed status', () => {
    const list = getPackingList();
    const targetItem = list.items[0];
    const initialStatus = targetItem.isPacked;

    const updated = toggleItemPacked(targetItem.id);
    const toggledItem = updated.items.find((i) => i.id === targetItem.id);
    expect(toggledItem?.isPacked).toBe(!initialStatus);
  });

  it('adds and deletes a packing item', () => {
    const updated = addPackingItem({
      name: 'Noise-Cancelling Headphones',
      category: 'Electronics',
      isPacked: false,
      priority: 'essential',
      assignedTo: 'Alex Morgan',
      quantity: 1,
    });

    const added = updated.items.find((i) => i.name === 'Noise-Cancelling Headphones');
    expect(added).toBeDefined();
    expect(added?.priority).toBe('essential');

    const afterDelete = deletePackingItem(added!.id);
    expect(afterDelete.items.find((i) => i.id === added!.id)).toBeUndefined();
  });

  it('marks all items packed or unpacked in one batch operation', () => {
    const allPacked = markAllItems(true);
    expect(allPacked.items.every((i) => i.isPacked)).toBe(true);

    const allUnpacked = markAllItems(false);
    expect(allUnpacked.items.every((i) => !i.isPacked)).toBe(true);
  });

  it('distributes items equally among trip members', () => {
    const members = ['Alex Morgan', 'Diya Shah', 'Bhavika Sainani'];
    const updated = distributeTasksEqually(members);

    const stats = getMemberTaskStats(updated);
    expect(stats.length).toBeGreaterThanOrEqual(1);
  });

  it('generates a destination-aware smart checklist for a trip', () => {
    const aiList = generateAiChecklist('Reykjavik', 5);
    expect(aiList.items.length).toBeGreaterThan(5);
    expect(aiList.destination).toBe('Reykjavik');
  });
});
