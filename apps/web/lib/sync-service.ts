import type { ConflictRecord, SyncMetadata } from '@supanotegen/shared';

export type SyncMutationResult = {
  cloudVersion: number;
  contentHash: string;
};

export type SyncMutation = {
  resourceId: string;
  resourceType: SyncMetadata['resourceType'];
  localVersion: number;
  cloudVersion: number | null;
  contentHash: string;
  payload: Record<string, unknown>;
  execute: () => Promise<SyncMutationResult>;
};

type SyncServiceOptions = {
  persistMetadata: (metadata: SyncMetadata) => void;
  persistSyncEvent: (input: {
    resourceType: SyncMetadata['resourceType'];
    resourceId: string;
    operation: 'upsert' | 'delete';
    localVersion: number;
    cloudVersion: number | null;
    status: SyncMetadata['syncStatus'];
    payload: Record<string, unknown>;
  }) => Promise<void>;
  persistConflict: (record: ConflictRecord) => void;
  onStateChange?: (metadata: SyncMetadata) => void;
};

export type SyncService = ReturnType<typeof createSyncService>;

export function createSyncService(options: SyncServiceOptions) {
  const pending = new Map<string, SyncMutation>();

  async function enqueue(mutation: SyncMutation) {
    const pendingMetadata = createMetadata(mutation, 'pending', null);
    pending.set(mutation.resourceId, mutation);
    await persistTransition(pendingMetadata, mutation.payload);

    return flushMutation(mutation);
  }

  async function retryPending() {
    const mutations = [...pending.values()];
    const results = await Promise.allSettled(mutations.map((mutation) => flushMutation(mutation)));
    return results;
  }

  function getPendingResourceIds() {
    return [...pending.keys()];
  }

  async function flushMutation(mutation: SyncMutation) {
    try {
      const result = await mutation.execute();
      pending.delete(mutation.resourceId);
      const syncedMetadata = createMetadata(mutation, 'synced', result);
      await persistTransition(syncedMetadata, mutation.payload);
      return syncedMetadata;
    } catch (error) {
      const syncError = error as Error & { code?: string; statusCode?: number; cloudVersion?: number; cloudContentHash?: string };

      if (syncError.code === 'conflict' && typeof syncError.cloudVersion === 'number' && syncError.cloudContentHash) {
        pending.delete(mutation.resourceId);
        const conflictMetadata = createMetadata(mutation, 'conflict', {
          cloudVersion: syncError.cloudVersion,
          contentHash: syncError.cloudContentHash,
        });
        await persistTransition(conflictMetadata, mutation.payload);
        options.persistConflict({
          resourceId: mutation.resourceId,
          resourceType: mutation.resourceType,
          localVersion: mutation.localVersion,
          cloudVersion: syncError.cloudVersion,
          localContentHash: mutation.contentHash,
          cloudContentHash: syncError.cloudContentHash,
          createdAt: new Date().toISOString(),
        });
        return conflictMetadata;
      }

      const status = syncError.code === 'forbidden' ? 'failed' : 'pending';
      const metadata = createMetadata(mutation, status, null);
      if (status === 'failed') {
        pending.delete(mutation.resourceId);
      }
      await persistTransition(metadata, mutation.payload);
      return metadata;
    }
  }

  async function persistTransition(metadata: SyncMetadata, payload: Record<string, unknown>) {
    options.persistMetadata(metadata);
    options.onStateChange?.(metadata);
    await options.persistSyncEvent({
      resourceType: metadata.resourceType,
      resourceId: metadata.resourceId,
      operation: metadata.tombstone ? 'delete' : 'upsert',
      localVersion: metadata.localVersion,
      cloudVersion: metadata.cloudVersion,
      status: metadata.syncStatus,
      payload,
    });
  }

  return {
    enqueue,
    retryPending,
    getPendingResourceIds,
  };
}

export function resolveSyncConflict(options: {
  localVersion: number;
  cloudVersion: number;
  localContentHash: string;
  cloudContentHash: string;
}) {
  return options.cloudVersion > options.localVersion && options.cloudContentHash !== options.localContentHash;
}

export function buildSyncContentHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return `sync-${hash.toString(16)}`;
}

function createMetadata(
  mutation: SyncMutation,
  status: SyncMetadata['syncStatus'],
  result: SyncMutationResult | null,
): SyncMetadata {
  return {
    resourceId: mutation.resourceId,
    resourceType: mutation.resourceType,
    localVersion: mutation.localVersion,
    cloudVersion: result?.cloudVersion ?? mutation.cloudVersion,
    syncStatus: status,
    contentHash: result?.contentHash ?? mutation.contentHash,
    lastSyncedAt: status === 'synced' ? new Date().toISOString() : null,
    tombstone: false,
  };
}
