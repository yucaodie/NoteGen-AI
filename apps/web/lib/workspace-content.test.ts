import { describe, expect, it } from 'vitest';
import type { KnowledgeBaseTree, Note } from '@supanotegen/shared';
import { buildNextTree, getVisibleNotes, mergeNoteWithDraft } from './workspace-content';

const tree: KnowledgeBaseTree = {
  knowledgeBase: {
    id: 'kb-1',
    ownerUserId: 'user-1',
    name: 'My Knowledge Base',
    description: null,
  },
  folders: [
    {
      id: 'folder-1',
      ownerUserId: 'user-1',
      knowledgeBaseId: 'kb-1',
      parentFolderId: null,
      title: 'Inbox',
      sortKey: '0001',
    },
  ],
  notes: [
    {
      id: 'note-1',
      ownerUserId: 'user-1',
      knowledgeBaseId: 'kb-1',
      folderId: 'folder-1',
      title: 'Quick Note',
      markdownContent: '# Hello',
      contentHash: 'hash-1',
      version: 1,
    },
    {
      id: 'note-2',
      ownerUserId: 'user-1',
      knowledgeBaseId: 'kb-1',
      folderId: null,
      title: 'Top Note',
      markdownContent: '# Root',
      contentHash: 'hash-2',
      version: 3,
    },
  ],
};

describe('workspace-content helpers', () => {
  it('filters notes by folder and keeps latest versions first', () => {
    const notes = getVisibleNotes(tree, 'folder-1');

    expect(notes).toHaveLength(1);
    expect(notes[0]?.id).toBe('note-1');
  });

  it('merges a local draft over cloud content', () => {
    const merged = mergeNoteWithDraft(tree.notes[0]!, {
      noteId: 'note-1',
      title: 'Local Draft',
      markdownContent: '# Local',
      savedAt: '2026-07-06T16:00:00.000Z',
    });

    expect(merged.title).toBe('Local Draft');
    expect(merged.markdownContent).toBe('# Local');
  });

  it('updates an existing note in the tree after save', () => {
    const updatedNote: Note = {
      ...tree.notes[0]!,
      title: 'Saved Title',
      version: 2,
    };

    const nextTree = buildNextTree(tree, updatedNote);
    expect(nextTree.notes.find((note) => note.id === 'note-1')?.version).toBe(2);
  });
});
