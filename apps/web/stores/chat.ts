import { create } from 'zustand';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  modelId: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  modelId: string;
  ragEnabled: boolean;
  loading: boolean;

  createSession: () => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  setModelId: (id: string) => void;
  toggleRag: () => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

const defaultModelId = 'default';

function createNewSession(): ChatSession {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: '新对话',
    messages: [],
    modelId: defaultModelId,
    createdAt: now,
    updatedAt: now,
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  modelId: defaultModelId,
  ragEnabled: false,
  loading: false,

  createSession: () => {
    const session = createNewSession();
    set((s) => ({
      sessions: [...s.sessions, session],
      activeSessionId: session.id,
    }));
  },

  selectSession: (id) => set({ activeSessionId: id }),

  deleteSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((session) => session.id !== id),
      activeSessionId: s.activeSessionId === id
        ? (s.sessions.find((session) => session.id !== id)?.id ?? null)
        : s.activeSessionId,
    })),

  sendMessage: async (content: string) => {
    const { activeSessionId, modelId } = get();
    if (!activeSessionId) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    set((s) => ({
      loading: true,
      sessions: s.sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [...session.messages, userMessage],
              title: session.messages.length === 0 ? content.slice(0, 30) : session.title,
              updatedAt: new Date().toISOString(),
            }
          : session,
      ),
    }));

    try {
      const response = await fetch('/api/v1/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: content, model: modelId }),
      });

      let replyContent = '';

      if (response.ok) {
        const data = await response.json();
        replyContent = data.answer || '（无回答）';
      } else {
        replyContent = 'AI 服务暂不可用，请配置 AI 模型后重试。';
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toISOString(),
      };

      set((s) => ({
        loading: false,
        sessions: s.sessions.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                messages: [...session.messages, assistantMessage],
                updatedAt: new Date().toISOString(),
              }
            : session,
        ),
      }));
    } catch {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'AI 服务暂不可用，请稍后重试。',
        timestamp: new Date().toISOString(),
      };

      set((s) => ({
        loading: false,
        sessions: s.sessions.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                messages: [...session.messages, errorMessage],
                updatedAt: new Date().toISOString(),
              }
            : session,
        ),
      }));
    }
  },

  clearChat: () => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;
    set((s) => ({
      sessions: s.sessions.map((session) =>
        session.id === activeSessionId
          ? { ...session, messages: [], title: '新对话', updatedAt: new Date().toISOString() }
          : session,
      ),
    }));
  },

  setModelId: (modelId) => set({ modelId }),
  toggleRag: () => set((s) => ({ ragEnabled: !s.ragEnabled })),
}));
