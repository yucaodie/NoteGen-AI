import { describe, expect, it } from 'vitest';
import { loadAllSyncMetadata, loadConflictRecords, loadSyncMetadata, saveConflictRecord, saveSyncMetadata } from './sync-storage';

describe('sync-storage', () => {
  it('stores sync metadata by resource id', () => {
    const storage = createMemoryStorage();

    saveSyncMetadata(
      {
        resourceId: 'note-1',
        resourceType: 'note',
        localVersion: 2,
        cloudVersion: 1,
        syncStatus: 'pending',
        contentHash: 'hash',
        lastSyncedAt: null,
        tombstone: false,
      },
      storage,
    );

    expect(loadSyncMetadata('note-1', storage)?.syncStatus).toBe('pending');
    expect(Object.keys(loadAllSyncMetadata(storage))).toContain('note-1');
  });

  it('stores conflict records newest-first', () => {
    const storage = createMemoryStorage();

    saveConflictRecord(
      {
        resourceId: 'note-1',
        resourceType: 'note',
        localVersion: 2,
        cloudVersion: 3,
        localContentHash: 'local',
        cloudContentHash: 'cloud',
        createdAt: '2026-07-06T16:30:00.000Z',
      },
      storage,
    );

    expect(loadConflictRecords(storage)[0]?.resourceId).toBe('note-1');
  });
});

function createMemoryStorage() {
  const state = new Map<string, string>();

  return {
    getItem(key: string) {
      return state.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      state.set(key, value);
    },
    removeItem(key: string) {
      state.delete(key);
    },
  };
}
