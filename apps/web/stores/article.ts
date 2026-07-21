import { create } from 'zustand';

interface DirNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  children?: DirNode[];
}

interface ArticleState {
  fileTree: DirNode[];
  activeFilePath: string | null;
  openTabs: string[];
  activeTabId: string | null;
  expandedFolderIds: Set<string>;

  setFileTree: (tree: DirNode[]) => void;
  setActiveFilePath: (path: string | null) => void;
  createFile: (parentId: string | null, name: string) => void;
  createFolder: (parentId: string | null, name: string) => void;
  deleteNode: (id: string) => void;
  renameNode: (id: string, name: string) => void;
  toggleExpanded: (id: string) => void;
  openFile: (id: string) => void;
  closeTab: (id: string) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function insertNode(nodes: DirNode[], parentId: string, newNode: DirNode): DirNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children || []), newNode],
      };
    }
    if (node.children) {
      return {
        ...node,
        children: insertNode(node.children, parentId, newNode),
      };
    }
    return node;
  });
}

function removeNode(nodes: DirNode[], id: string): DirNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: node.children ? removeNode(node.children, id) : undefined,
    }));
}

function renameInTree(nodes: DirNode[], id: string, name: string): DirNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, name };
    if (node.children) return { ...node, children: renameInTree(node.children, id, name) };
    return node;
  });
}

export const useArticleStore = create<ArticleState>((set) => ({
  fileTree: [
    {
      id: 'root',
      name: '我的工作区',
      type: 'folder',
      parentId: null,
      children: [],
    },
  ],
  activeFilePath: null,
  openTabs: [],
  activeTabId: null,
  expandedFolderIds: new Set<string>(['root']),

  setFileTree: (tree) => set({ fileTree: tree }),

  setActiveFilePath: (path) => set({ activeFilePath: path }),

  createFile: (parentId, name) =>
    set((state) => {
      const id = generateId();
      const newNode: DirNode = { id, name, type: 'file', parentId };
      const parent = parentId || 'root';
      return { fileTree: insertNode(state.fileTree, parent, newNode) };
    }),

  createFolder: (parentId, name) =>
    set((state) => {
      const id = generateId();
      const newNode: DirNode = { id, name, type: 'folder', parentId, children: [] };
      const parent = parentId || 'root';
      const newExpanded = new Set(state.expandedFolderIds);
      newExpanded.add(id);
      return {
        fileTree: insertNode(state.fileTree, parent, newNode),
        expandedFolderIds: newExpanded,
      };
    }),

  deleteNode: (id) =>
    set((state) => ({
      fileTree: removeNode(state.fileTree, id),
      openTabs: state.openTabs.filter((t) => t !== id),
      activeTabId: state.activeTabId === id ? null : state.activeTabId,
    })),

  renameNode: (id, name) =>
    set((state) => ({
      fileTree: renameInTree(state.fileTree, id, name),
    })),

  toggleExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedFolderIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedFolderIds: next };
    }),

  openFile: (id) =>
    set((state) => {
      const tabs = state.openTabs.includes(id)
        ? state.openTabs
        : [...state.openTabs, id];
      return { openTabs: tabs, activeTabId: id, activeFilePath: id };
    }),

  closeTab: (id) =>
    set((state) => {
      const tabIndex = state.openTabs.indexOf(id);
      const nextTabs = state.openTabs.filter((t) => t !== id);
      let nextActive = state.activeTabId;
      if (state.activeTabId === id) {
        if (nextTabs.length > 0) {
          nextActive = nextTabs[Math.min(tabIndex, nextTabs.length - 1)];
        } else {
          nextActive = null;
        }
      }
      return { openTabs: nextTabs, activeTabId: nextActive };
    }),
}));
