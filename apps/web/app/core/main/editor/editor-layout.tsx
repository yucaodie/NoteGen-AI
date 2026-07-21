'use client';

import { useCallback, useState } from 'react';
import { useArticleStore } from '@/stores/article';
import { TiptapEditor } from './markdown/tiptap-editor';

function EmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <p className="text-lg">选择文件或记录开始编辑</p>
        <p className="mt-1 text-sm">键盘, AI 和排版工具已就绪</p>
      </div>
    </div>
  );
}

function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
}: {
  tabs: string[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center border-b bg-muted/30 text-xs">
      {tabs.map((id) => (
        <div
          key={id}
          className={`flex items-center gap-1 border-r px-3 py-1.5 cursor-pointer ${
            id === activeId
              ? 'border-b-2 border-b-primary bg-background font-medium'
              : 'hover:bg-accent'
          }`}
          onClick={() => onSelect(id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          <span className="truncate max-w-[120px]">
            {id.length > 12 ? id.slice(0, 12) + '...' : id}
          </span>
          <button
            type="button"
            className="ml-1 rounded px-0.5 hover:bg-muted-foreground/20"
            title="关闭"
            onClick={(e) => {
              e.stopPropagation();
              onClose(id);
            }}
          >
            ×
          </button>
        </div>
      ))}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 min-w-[120px] rounded-md border bg-popover p-1 shadow-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
              onClick={() => {
                tabs.forEach((t) => {
                  if (t !== activeId) onClose(t);
                });
                setContextMenu(null);
              }}
            >
              关闭其他
            </button>
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
              onClick={() => {
                tabs.forEach((t) => onClose(t));
                setContextMenu(null);
              }}
            >
              关闭全部
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function EditorLayout() {
  const { openTabs, activeTabId, openFile, closeTab, fileTree } = useArticleStore();
  const [editorContents, setEditorContents] = useState<Record<string, string>>({});
  const [editorText, setEditorText] = useState<Record<string, string>>({});

  const handleEditorUpdate = useCallback(
    (id: string) => (html: string, text: string) => {
      setEditorContents((prev) => ({ ...prev, [id]: html }));
      setEditorText((prev) => ({ ...prev, [id]: text }));
    },
    [],
  );

  const currentContent = activeTabId ? editorContents[activeTabId] || '' : '';

  if (openTabs.length === 0) return <EmptyState />;

  return (
    <div className="flex h-full flex-col">
      <TabBar
        tabs={openTabs}
        activeId={activeTabId}
        onSelect={openFile}
        onClose={closeTab}
      />
      <div className="flex-1 min-h-0">
        {activeTabId ? (
          <TiptapEditor
            key={activeTabId}
            content={currentContent}
            onUpdate={handleEditorUpdate(activeTabId)}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
