import type { Folder, KnowledgeBaseTree, Note } from '@supanotegen/shared';
import type { NoteDraft } from './draft-storage';

export function sortFolders(folders: Folder[]): Folder[] {
  return [...folders].sort((left, right) => left.sortKey.localeCompare(right.sortKey) || left.title.localeCompare(right.title));
}

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((left, right) => right.version - left.version || left.title.localeCompare(right.title));
}

export function mergeNoteWithDraft(note: Note, draft: NoteDraft | null): Note {
  if (!draft) {
    return note;
  }

  return {
    ...note,
    title: draft.title,
    markdownContent: draft.markdownContent,
  };
}

export function getVisibleNotes(tree: KnowledgeBaseTree, selectedFolderId: string | null): Note[] {
  const notes = selectedFolderId ? tree.notes.filter((note) => note.folderId === selectedFolderId) : tree.notes;
  return sortNotes(notes);
}

export function buildNextTree(tree: KnowledgeBaseTree, nextNote: Note): KnowledgeBaseTree {
  const existingIndex = tree.notes.findIndex((note) => note.id === nextNote.id);
  if (existingIndex === -1) {
    return {
      ...tree,
      notes: sortNotes([...tree.notes, nextNote]),
    };
  }

  const notes = [...tree.notes];
  notes[existingIndex] = nextNote;
  return {
    ...tree,
    notes: sortNotes(notes),
  };
}

export function buildNextTreeWithFolder(tree: KnowledgeBaseTree, nextFolder: Folder): KnowledgeBaseTree {
  if (tree.folders.some((folder) => folder.id === nextFolder.id)) {
    return tree;
  }

  return {
    ...tree,
    folders: sortFolders([...tree.folders, nextFolder]),
  };
}
