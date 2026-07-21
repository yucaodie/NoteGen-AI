'use client';

import { useState, useCallback } from 'react';
import { useArticleStore } from '@/stores/article';

function FileItem({
  id,
  name,
  onSelect,
}: {
  id: string;
  name: string;
  onSelect: (id: string) => void;
}) {
  const { renameNode, deleteNode } = useArticleStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [showMenu, setShowMenu] = useState(false);

  const handleRename = useCallback(() => {
    if (editName.trim() && editName.trim() !== name) {
      renameNode(id, editName.trim());
    }
    setEditing(false);
  }, [id, name, editName, renameNode]);

  return (
    <div
      className="group flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer relative"
      onClick={() => onSelect(id)}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      <span>📄</span>
      {editing ? (
        <input
          className="min-w-0 flex-1 rounded border bg-background px-1 text-sm"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') setEditing(false);
          }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="truncate">{name}</span>
      )}
      <div className="ml-auto hidden gap-0.5 group-hover:flex">
        <button
          type="button"
          className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
          title="重命名"
          onClick={(e) => {
            e.stopPropagation();
            setEditName(name);
            setEditing(true);
          }}
        >
          ✎
        </button>
        <button
          type="button"
          className="rounded px-1 text-xs text-muted-foreground hover:text-destructive"
          title="删除"
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
        >
          ✕
        </button>
      </div>
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full z-50 min-w-[120px] rounded-md border bg-popover p-1 shadow-md">
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                setEditName(name);
                setEditing(true);
                setShowMenu(false);
              }}
            >
              重命名
            </button>
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-left text-sm text-destructive hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(id);
                setShowMenu(false);
              }}
            >
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function FolderItem({
  id,
  name,
  children,
  defaultExpanded,
  onSelect,
}: {
  id: string;
  name: string;
  children?: Array<{ id: string; name: string; type: 'file' | 'folder'; children?: Array<{ id: string; name: string; type: 'file' | 'folder'; children?: any[] }> }>;
  defaultExpanded: boolean;
  onSelect: (id: string) => void;
}) {
  const { toggleExpanded, renameNode, deleteNode, createFile, createFolder } = useArticleStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showMenu, setShowMenu] = useState(false);
  const [showNewInput, setShowNewInput] = useState<'file' | 'folder' | null>(null);
  const [newName, setNewName] = useState('');

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
    toggleExpanded(id);
  }, [id, toggleExpanded]);

  const handleRename = useCallback(() => {
    if (editName.trim() && editName.trim() !== name) {
      renameNode(id, editName.trim());
    }
    setEditing(false);
  }, [id, name, editName, renameNode]);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    if (showNewInput === 'file') createFile(id, newName.trim());
    if (showNewInput === 'folder') createFolder(id, newName.trim());
    setNewName('');
    setShowNewInput(null);
  }, [newName, showNewInput, id, createFile, createFolder]);

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer relative"
        onClick={handleToggle}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(true);
        }}
      >
        <span className="w-3 text-center text-xs">{expanded ? '▼' : '▶'}</span>
        <span>📁</span>
        {editing ? (
          <input
            className="min-w-0 flex-1 rounded border bg-background px-1 text-sm"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setEditing(false);
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate">{name}</span>
        )}
        <div className="ml-auto hidden gap-0.5 group-hover:flex">
          <button
            type="button"
            className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
            title="重命名"
            onClick={(e) => {
              e.stopPropagation();
              setEditName(name);
              setEditing(true);
            }}
          >
            ✎
          </button>
          <button
            type="button"
            className="rounded px-1 text-xs text-muted-foreground hover:text-destructive"
            title="删除"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
          >
            ✕
          </button>
        </div>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full z-50 min-w-[140px] rounded-md border bg-popover p-1 shadow-md">
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewInput('file');
                  setNewName('');
                  setShowMenu(false);
                }}
              >
                新建文件
              </button>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewInput('folder');
                  setNewName('');
                  setShowMenu(false);
                }}
              >
                新建文件夹
              </button>
              <hr className="my-1" />
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName(name);
                  setEditing(true);
                  setShowMenu(false);
                }}
              >
                重命名
              </button>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-sm text-destructive hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNode(id);
                  setShowMenu(false);
                }}
              >
                删除
              </button>
            </div>
          </>
        )}
      </div>
      {expanded && children && (
        <div className="ml-4">
          {children.map((child) =>
            child.type === 'folder' ? (
              <FolderItem
                key={child.id}
                id={child.id}
                name={child.name}
                children={child.children}
                defaultExpanded={false}
                onSelect={onSelect}
              />
            ) : (
              <FileItem key={child.id} id={child.id} name={child.name} onSelect={onSelect} />
            ),
          )}
          {showNewInput && (
            <div className="ml-4 flex items-center gap-1 rounded px-2 py-1">
              <span>{showNewInput === 'folder' ? '📁' : '📄'}</span>
              <input
                className="min-w-0 flex-1 rounded border bg-background px-1 text-sm"
                placeholder={showNewInput === 'folder' ? '文件夹名称' : '文件名称'}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleCreate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setShowNewInput(null);
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FileSidebar() {
  const { fileTree, createFile, createFolder, openFile } = useArticleStore();
  const [showNewInput, setShowNewInput] = useState<'file' | 'folder' | null>(null);
  const [newName, setNewName] = useState('');

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    const parentId = 'root';
    if (showNewInput === 'file') createFile(parentId, newName.trim());
    if (showNewInput === 'folder') createFolder(parentId, newName.trim());
    setNewName('');
    setShowNewInput(null);
  }, [newName, showNewInput, createFile, createFolder]);

  const handleSelect = useCallback(
    (id: string) => {
      openFile(id);
    },
    [openFile],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b px-2 py-1">
        <button
          type="button"
          className="rounded px-2 py-1 text-xs hover:bg-accent"
          title="新建文件"
          onClick={() => {
            setShowNewInput('file');
            setNewName('');
          }}
        >
          新建
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-xs hover:bg-accent"
          title="新建文件夹"
          onClick={() => {
            setShowNewInput('folder');
            setNewName('');
          }}
        >
          新建目录
        </button>
      </div>
      {showNewInput && (
        <div className="flex items-center gap-1 border-b px-3 py-1">
          <span>{showNewInput === 'folder' ? '📁' : '📄'}</span>
          <input
            className="min-w-0 flex-1 rounded border bg-background px-1 text-sm"
            placeholder={showNewInput === 'folder' ? '目录名称' : '文件名称'}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') {
                setShowNewInput(null);
                setNewName('');
              }
            }}
            autoFocus
          />
        </div>
      )}
      <div className="flex-1 overflow-auto p-1">
        {fileTree.map((node) =>
          node.type === 'folder' ? (
            <FolderItem
              key={node.id}
              id={node.id}
              name={node.name}
              children={node.children}
              defaultExpanded={true}
              onSelect={handleSelect}
            />
          ) : (
            <FileItem key={node.id} id={node.id} name={node.name} onSelect={handleSelect} />
          ),
        )}
      </div>
      <div className="border-t p-2 text-xs text-muted-foreground">
        我的工作区
      </div>
    </div>
  );
}
