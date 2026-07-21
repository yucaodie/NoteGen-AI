'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chat';

const models = [
  { id: 'default', name: '默认模型' },
];

function ChatHeader() {
  const { sessions, activeSessionId, createSession, selectSession, deleteSession, clearChat, modelId, setModelId } = useChatStore();

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="border-b p-2">
      <div className="flex items-center gap-1 mb-1">
        <select
          className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-xs"
          value={activeSessionId || ''}
          onChange={(e) => {
            if (e.target.value) selectSession(e.target.value);
          }}
        >
          <option value="">未选择对话</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title.slice(0, 30)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded px-2 py-1 text-xs hover:bg-accent"
          onClick={createSession}
          title="新建对话"
        >
          +
        </button>
      </div>
      <div className="flex items-center gap-1">
        <select
          className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-xs"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {activeSessionId && (
          <div className="flex gap-0.5">
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearChat}
              title="清空对话"
            >
              清空
            </button>
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => activeSessionId && deleteSession(activeSessionId)}
              title="删除对话"
            >
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatContent() {
  const { sessions, activeSessionId, loading } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = sessions.find((s) => s.id === activeSessionId)?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!activeSessionId) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
        <div>
          <p className="text-lg">AI 对话</p>
          <p className="mt-1 text-sm">点击 + 新建对话开始</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
        <div>
          <p className="text-lg">开始提问</p>
          <p className="mt-1 text-sm">输入问题，AI 将基于您的知识库回答</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto p-2 space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
      {loading && (
        <div className="flex justify-start">
          <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            AI 正在思考...
          </div>
        </div>
      )}
    </div>
  );
}

function ChatInput() {
  const { sendMessage, loading, activeSessionId, ragEnabled, toggleRag } = useChatStore();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() || loading || !activeSessionId) return;
    sendMessage(input.trim());
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="border-t p-2">
      <div className="flex items-center gap-1 mb-1">
        <button
          type="button"
          className={`rounded px-1.5 py-0.5 text-xs ${
            ragEnabled
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={toggleRag}
          title="知识库检索"
        >
          RAG
        </button>
      </div>
      <div className="flex gap-1">
        <textarea
          ref={inputRef}
          className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
          placeholder="输入消息..."
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          type="button"
          className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          disabled={!input.trim() || loading || !activeSessionId}
          onClick={handleSend}
        >
          发送
        </button>
      </div>
    </div>
  );
}

export default function Chat() {
  const { createSession, sessions } = useChatStore();

  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
  }, [sessions.length, createSession]);

  return (
    <div className="flex h-full flex-col">
      <ChatHeader />
      <ChatContent />
      <ChatInput />
    </div>
  );
}
