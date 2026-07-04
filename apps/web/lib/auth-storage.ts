import type { AuthBootstrap, AuthSession } from '@supanotegen/shared';

const SESSION_STORAGE_KEY = 'supanotegen.auth.session';
const WORKSPACE_STORAGE_KEY = 'supanotegen.workspace.bootstrap';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function loadStoredSession(storage: BrowserStorage = getBrowserStorage()): AuthSession | null {
  return readJson<AuthSession>(storage, SESSION_STORAGE_KEY);
}

export function saveStoredSession(session: AuthSession, storage: BrowserStorage = getBrowserStorage()) {
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(storage: BrowserStorage = getBrowserStorage()) {
  storage.removeItem(SESSION_STORAGE_KEY);
}

export function loadStoredWorkspace(storage: BrowserStorage = getBrowserStorage()): AuthBootstrap | null {
  return readJson<AuthBootstrap>(storage, WORKSPACE_STORAGE_KEY);
}

export function saveStoredWorkspace(bootstrap: AuthBootstrap, storage: BrowserStorage = getBrowserStorage()) {
  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(bootstrap));
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
