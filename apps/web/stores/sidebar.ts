import { create } from 'zustand';

const STORAGE_KEY = 'notegen-sidebar-state';

interface SidebarState {
  leftSidebarVisible: boolean;
  centerPanelVisible: boolean;
  rightSidebarVisible: boolean;
  leftSidebarTab: 'files' | 'notes';
  toggleLeftSidebar: () => void;
  toggleCenterPanel: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarTab: (tab: 'files' | 'notes') => void;
  initSidebarState: () => void;
}

function loadPersistedState(): Partial<SidebarState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function persistState(state: SidebarState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        leftSidebarVisible: state.leftSidebarVisible,
        centerPanelVisible: state.centerPanelVisible,
        rightSidebarVisible: state.rightSidebarVisible,
        leftSidebarTab: state.leftSidebarTab,
      }),
    );
  } catch {
    // ignore
  }
}

function countVisible(state: SidebarState) {
  return [state.leftSidebarVisible, state.centerPanelVisible, state.rightSidebarVisible].filter(Boolean).length;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  leftSidebarVisible: true,
  centerPanelVisible: true,
  rightSidebarVisible: true,
  leftSidebarTab: 'files',

  toggleLeftSidebar: () => {
    const state = get();
    if (state.leftSidebarVisible && countVisible(state) <= 1) return;
    const next: Partial<SidebarState> = { leftSidebarVisible: !state.leftSidebarVisible };
    if (!next.leftSidebarVisible && state.leftSidebarVisible) {
      if (!state.centerPanelVisible && !state.rightSidebarVisible) return;
    }
    set(next);
    persistState(get());
  },

  toggleCenterPanel: () => {
    const state = get();
    if (state.centerPanelVisible && countVisible(state) <= 1) return;
    const next: Partial<SidebarState> = { centerPanelVisible: !state.centerPanelVisible };
    if (!next.centerPanelVisible && state.centerPanelVisible) {
      if (!state.leftSidebarVisible && !state.rightSidebarVisible) return;
      if (state.leftSidebarVisible && !state.rightSidebarVisible) return;
    }
    set(next);
    persistState(get());
  },

  toggleRightSidebar: () => {
    const state = get();
    if (state.rightSidebarVisible && countVisible(state) <= 1) return;
    const next: Partial<SidebarState> = { rightSidebarVisible: !state.rightSidebarVisible };
    if (!next.rightSidebarVisible && state.rightSidebarVisible) {
      if (!state.leftSidebarVisible && !state.centerPanelVisible) return;
    }
    set(next);
    persistState(get());
  },

  setLeftSidebarTab: (tab) => {
    set({ leftSidebarTab: tab });
    persistState(get());
  },

  initSidebarState: () => {
    const persisted = loadPersistedState();
    set((state) => ({
      ...state,
      leftSidebarVisible: persisted.leftSidebarVisible ?? state.leftSidebarVisible,
      centerPanelVisible: persisted.centerPanelVisible ?? state.centerPanelVisible,
      rightSidebarVisible: persisted.rightSidebarVisible ?? state.rightSidebarVisible,
      leftSidebarTab: persisted.leftSidebarTab ?? state.leftSidebarTab,
    }));
  },
}));
