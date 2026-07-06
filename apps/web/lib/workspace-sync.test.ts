import { describe, expect, it } from 'vitest';
import type { ConflictRecord, SyncMetadata } from '@supanotegen/shared';
import { countPendingSyncItems, describeConflict, formatSyncStatus } from './workspace-sync';

describe('workspace-sync', () => {
  it('counts pending sync items only', () => {
    const metadataMap: Record<string, SyncMetadata> = {
      a: {
        resourceId: 'a',
        resourceType: 'note',
        localVersion: 1,
        cloudVersion: 1,
        syncStatus: 'synced',
        contentHash: 'a',
        lastSyncedAt: '2026-07-06T00:00:00.000Z',
        tombstone: false,
      },
      b: {
        resourceId: 'b',
        resourceType: 'note',
        localVersion: 2,
        cloudVersion: 1,
        syncStatus: 'pending',
        contentHash: 'b',
        lastSyncedAt: null,
        tombstone: false,
      },
      c: {
        resourceId: 'c',
        resourceType: 'note',
        localVersion: 3,
        cloudVersion: 2,
        syncStatus: 'pending',
        contentHash: 'c',
        lastSyncedAt: null,
        tombstone: false,
      },
    };

    expect(countPendingSyncItems(metadataMap)).toBe(2);
  });

  it('formats sync statuses for workspace labels', () => {
    expect(formatSyncStatus('synced')).toBe('已同步');
    expect(formatSyncStatus('pending')).toBe('待同步');
    expect(formatSyncStatus('conflict')).toBe('有冲突');
    expect(formatSyncStatus('failed')).toBe('同步失败');
  });

  it('describes whether a conflict belongs to the active note', () => {
    const record: ConflictRecord = {
      resourceId: 'note-1',
      resourceType: 'note',
      localVersion: 4,
      cloudVersion: 5,
      localContentHash: 'local',
      cloudContentHash: 'cloud',
      createdAt: '2026-07-06T00:00:00.000Z',
    };

    expect(describeConflict(record, 'note-1')).toContain('当前正在编辑');
    expect(describeConflict(record, 'note-2')).toContain('等待处理');
  });
});
