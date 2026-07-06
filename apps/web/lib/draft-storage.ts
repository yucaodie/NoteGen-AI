const DRAFT_STORAGE_KEY = 'supanotegen.workspace.drafts';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type NoteDraft = {
  noteId: string;
  title: string;
  markdownContent: string;
  savedAt: string;
};

export function loadDraft(noteId: string, storage: BrowserStorage = getBrowserStorage()): NoteDraft | null {
  const drafts = readDraftMap(storage);
  return drafts[noteId] ?? null;
}

export function saveDraft(draft: NoteDraft, storage: BrowserStorage = getBrowserStorage()) {
  const drafts = readDraftMap(storage);
  drafts[draft.noteId] = draft;
  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

export function clearDraft(noteId: string, storage: BrowserStorage = getBrowserStorage()) {
  const drafts = readDraftMap(storage);
  delete drafts[noteId];

  if (Object.keys(drafts).length === 0) {
    storage.removeItem(DRAFT_STORAGE_KEY);
    return;
  }

  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function readDraftMap(storage: BrowserStorage): Record<string, NoteDraft> {
  const rawValue = storage.getItem(DRAFT_STORAGE_KEY);
  if (!rawValue) {
    return {};
  }

  try {
    return JSON.parse(rawValue) as Record<string, NoteDraft>;
  } catch {
    storage.removeItem(DRAFT_STORAGE_KEY);
    return {};
  }
}

function getBrowserStorage(): BrowserStorage {
  if (typeof window === 'undefined') {
    throw new Error('Browser storage is unavailable during server rendering.');
  }

  return window.localStorage;
}
