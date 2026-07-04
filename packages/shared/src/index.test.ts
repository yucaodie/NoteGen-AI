import { describe, expect, it } from 'vitest';
import type { AppDescriptor, SyncMetadata } from './index';

describe('shared domain contracts', () => {
  it('supports the base API descriptor shape', () => {
    const descriptor: AppDescriptor = {
      name: 'SupaNoteGen API',
      status: 'ok',
      surface: 'api',
    };

    expect(descriptor.status).toBe('ok');
    expect(descriptor.surface).toBe('api');
  });

  it('supports sync metadata state transitions', () => {
    const metadata: SyncMetadata = {
      resourceId: 'note-1',
      resourceType: 'note',
      localVersion: 2,
      cloudVersion: 1,
      syncStatus: 'pending',
      contentHash: 'hash-value',
      lastSyncedAt: null,
      tombstone: false,
    };

    expect(metadata.syncStatus).toBe('pending');
    expect(metadata.cloudVersion).toBeLessThan(metadata.localVersion);
  });
});
