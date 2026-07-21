import { create } from 'zustand';

interface RecordItem {
  id: string;
  type: 'text' | 'image' | 'voice' | 'file' | 'link' | 'todo' | 'scan';
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

interface MarkState {
  marks: RecordItem[];
  selectedTagId: string | null;
  viewMode: 'list' | 'compact' | 'cards';
  filters: {
    keyword: string;
    types: string[];
    timeRange: 'all' | 'today' | 'week' | 'month';
  };
  selectedIds: Set<string>;
  trashMode: boolean;

  setMarks: (marks: RecordItem[]) => void;
  addMark: (mark: RecordItem) => void;
  updateMark: (id: string, updates: Partial<RecordItem>) => void;
  deleteMark: (id: string) => void;
  restoreMark: (id: string) => void;
  setTag: (tagId: string | null) => void;
  setViewMode: (mode: 'list' | 'compact' | 'cards') => void;
  setKeywordFilter: (keyword: string) => void;
  toggleTypeFilter: (type: string) => void;
  setTimeRange: (range: 'all' | 'today' | 'week' | 'month') => void;
  resetFilters: () => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setTrashMode: (mode: boolean) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function createRecordItem(overrides: Partial<RecordItem> = {}): RecordItem {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    type: 'text',
    title: '',
    content: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
    deleted: false,
    ...overrides,
  };
}

export const useMarkStore = create<MarkState>((set) => ({
  marks: [],
  selectedTagId: null,
  viewMode: 'list',
  filters: {
    keyword: '',
    types: [],
    timeRange: 'all',
  },
  selectedIds: new Set(),
  trashMode: false,

  setMarks: (marks) => set({ marks }),
  addMark: (mark) => set((state) => ({ marks: [...state.marks, mark] })),
  updateMark: (id, updates) =>
    set((state) => ({
      marks: state.marks.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m,
      ),
    })),
  deleteMark: (id) =>
    set((state) => ({
      marks: state.marks.map((m) => (m.id === id ? { ...m, deleted: true } : m)),
    })),
  restoreMark: (id) =>
    set((state) => ({
      marks: state.marks.map((m) => (m.id === id ? { ...m, deleted: false } : m)),
    })),
  setTag: (tagId) => set({ selectedTagId: tagId }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setKeywordFilter: (keyword) =>
    set((state) => ({ filters: { ...state.filters, keyword } })),
  toggleTypeFilter: (type) =>
    set((state) => {
      const types = state.filters.types.includes(type)
        ? state.filters.types.filter((t) => t !== type)
        : [...state.filters.types, type];
      return { filters: { ...state.filters, types } };
    }),
  setTimeRange: (timeRange) =>
    set((state) => ({ filters: { ...state.filters, timeRange } })),
  resetFilters: () =>
    set({ filters: { keyword: '', types: [], timeRange: 'all' } }),
  toggleSelect: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),
  setTrashMode: (mode) => set({ trashMode: mode }),
}));

export const recordTypeLabels: Record<string, string> = {
  text: '文本',
  image: '图片',
  voice: '语音',
  file: '文件',
  link: '链接',
  todo: '待办',
  scan: '扫描',
};

export const recordTypeIcons: Record<string, string> = {
  text: '📝',
  image: '🖼️',
  voice: '🎤',
  file: '📎',
  link: '🔗',
  todo: '✅',
  scan: '📷',
};
