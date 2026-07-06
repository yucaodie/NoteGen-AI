import { describe, expect, it } from 'vitest';
import { clearDraft, loadDraft, saveDraft } from './draft-storage';

describe('draft-storage', () => {
  it('persists and restores a note draft', () => {
    const storage = createMemoryStorage();

    saveDraft(
      {
        noteId: 'note-1',
        title: 'Draft Title',
        markdownContent: '# Draft',
        savedAt: '2026-07-06T16:00:00.000Z',
      },
      storage,
    );

    expect(loadDraft('note-1', storage)?.title).toBe('Draft Title');
    expect(loadDraft('note-1', storage)?.markdownContent).toBe('# Draft');
  });

  it('clears a persisted draft', () => {
    const storage = createMemoryStorage();

    saveDraft(
      {
        noteId: 'note-1',
        title: 'Draft Title',
        markdownContent: '# Draft',
        savedAt: '2026-07-06T16:00:00.000Z',
      },
      storage,
    );

    clearDraft('note-1', storage);
    expect(loadDraft('note-1', storage)).toBeNull();
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
