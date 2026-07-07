import type { ConflictRecord, SyncMetadata } from '@supanotegen/shared';

const SYNC_METADATA_STORAGE_KEY = 'supanotegen.workspace.sync-metadata';
const CONFLICT_STORAGE_KEY = 'supanotegen.workspace.conflicts';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function loadSyncMetadata(resourceId: string, storage: BrowserStorage = getBrowserStorage()): SyncMetadata | null {
  const metadataMap = readJson<Record<string, SyncMetadata>>(storage, SYNC_METADATA_STORAGE_KEY);
  return metadataMap?.[resourceId] ?? null;
}

export function loadAllSyncMetadata(storage: BrowserStorage = getBrowserStorage()): Record<string, SyncMetadata> {
  return readJson<Record<string, SyncMetadata>>(storage, SYNC_METADATA_STORAGE_KEY) ?? {};
}

export function saveSyncMetadata(metadata: SyncMetadata, storage: BrowserStorage = getBrowserStorage()) {
  const metadataMap = loadAllSyncMetadata(storage);
  metadataMap[metadata.resourceId] = metadata;
  storage.setItem(SYNC_METADATA_STORAGE_KEY, JSON.stringify(metadataMap));
}

export function loadConflictRecords(storage: BrowserStorage = getBrowserStorage()): ConflictRecord[] {
  return readJson<ConflictRecord[]>(storage, CONFLICT_STORAGE_KEY) ?? [];
}

export function saveConflictRecord(record: ConflictRecord, storage: BrowserStorage = getBrowserStorage()) {
  const records = loadConflictRecords(storage).filter((item) => item.resourceId !== record.resourceId);
  records.unshift(record);
  storage.setItem(CONFLICT_STORAGE_KEY, JSON.stringify(records));
}

export function removeConflictRecord(resourceId: string, storage: BrowserStorage = getBrowserStorage()) {
  const records = loadConflictRecords(storage).filter((item) => item.resourceId !== resourceId);

  if (records.length === 0) {
    storage.removeItem(CONFLICT_STORAGE_KEY);
    return;
  }

  storage.setItem(CONFLICT_STORAGE_KEY, JSON.stringify(records));
}

function readJson<T>(storage: BrowserStorage, key: string): T | null {
  const rawValue = storage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function getBrowserStorage(): BrowserStorage {
  if (typeof window === 'undefined') {
    throw new Error('Browser storage is unavailable during server rendering.');
  }

  return window.localStorage;
}
