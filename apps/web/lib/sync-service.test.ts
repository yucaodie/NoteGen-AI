import { describe, expect, it, vi } from 'vitest';
import { buildSyncContentHash, createSyncService, resolveSyncConflict } from './sync-service';

describe('sync-service', () => {
  it('moves a mutation from pending to synced after a successful flush', async () => {
    const persistMetadata = vi.fn();
    const persistSyncEvent = vi.fn(async () => undefined);
    const persistConflict = vi.fn();

    const service = createSyncService({
      persistMetadata,
      persistSyncEvent,
      persistConflict,
    });

    const metadata = await service.enqueue({
      resourceId: 'note-1',
      resourceType: 'note',
      localVersion: 2,
      cloudVersion: 1,
      contentHash: 'local-hash',
      payload: { title: 'Saved Note' },
      execute: async () => ({ cloudVersion: 2, contentHash: 'cloud-hash' }),
    });

    expect(metadata.syncStatus).toBe('synced');
    expect(persistMetadata).toHaveBeenCalledTimes(2);
    expect(service.getPendingResourceIds()).toHaveLength(0);
  });

  it('keeps network failures in pending state for retry', async () => {
    const service = createSyncService({
      persistMetadata: vi.fn(),
      persistSyncEvent: vi.fn(async () => undefined),
      persistConflict: vi.fn(),
    });

    const metadata = await service.enqueue({
      resourceId: 'note-1',
      resourceType: 'note',
      localVersion: 2,
      cloudVersion: 1,
      contentHash: 'local-hash',
      payload: { title: 'Pending Note' },
      execute: async () => {
        throw Object.assign(new Error('network down'), { code: 'network_error' });
      },
    });

    expect(metadata.syncStatus).toBe('pending');
    expect(service.getPendingResourceIds()).toContain('note-1');
  });

  it('creates conflict metadata and conflict records on version divergence', async () => {
    const persistConflict = vi.fn();
    const service = createSyncService({
      persistMetadata: vi.fn(),
      persistSyncEvent: vi.fn(async () => undefined),
      persistConflict,
    });

    const metadata = await service.enqueue({
      resourceId: 'note-1',
      resourceType: 'note',
      localVersion: 2,
      cloudVersion: 2,
      contentHash: 'local-hash',
      payload: { title: 'Conflict Note' },
      execute: async () => {
        throw Object.assign(new Error('conflict'), {
          code: 'conflict',
          cloudVersion: 3,
          cloudContentHash: 'cloud-hash',
        });
      },
    });

    expect(metadata.syncStatus).toBe('conflict');
    expect(persistConflict).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'note-1', cloudVersion: 3 }),
    );
  });

  it('converges to conflict only when cloud version moves ahead with different content', () => {
    for (let localVersion = 1; localVersion <= 3; localVersion += 1) {
      for (let cloudVersion = 1; cloudVersion <= 4; cloudVersion += 1) {
        const sameHash = resolveSyncConflict({
          localVersion,
          cloudVersion,
          localContentHash: 'hash',
          cloudContentHash: 'hash',
        });
        expect(sameHash).toBe(false);

        const differentHash = resolveSyncConflict({
          localVersion,
          cloudVersion,
          localContentHash: 'local',
          cloudContentHash: 'cloud',
        });
        expect(differentHash).toBe(cloudVersion > localVersion);
      }
    }
  });

  it('creates deterministic lightweight content hashes for local sync metadata', () => {
    expect(buildSyncContentHash('# hello')).toBe(buildSyncContentHash('# hello'));
    expect(buildSyncContentHash('# hello')).not.toBe(buildSyncContentHash('# world'));
  });
});
