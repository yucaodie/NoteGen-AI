'use client';

import { useState } from 'react';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

const initialTree: FileNode[] = [
  {
    id: '1',
    name: '我的工作区',
    type: 'folder',
    children: [
      { id: '2', name: '快速笔记.md', type: 'file' },
      { id: '3', name: '项目规划.md', type: 'file' },
      {
        id: '4',
        name: '学习笔记',
        type: 'folder',
        children: [
          { id: '5', name: 'React 入门.md', type: 'file' },
          { id: '6', name: 'TypeScript 类型系统.md', type: 'file' },
        ],
      },
    ],
  },
];

function FileItem({ node }: { node: FileNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer">
      <span>{node.type === 'folder' ? '📁' : '📄'}</span>
      <span className="truncate">{node.name}</span>
    </div>
  );
}

function FolderItem({ node }: { node: FileNode }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <div
        className="flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs">{expanded ? '▼' : '▶'}</span>
        <span>📁</span>
        <span className="truncate">{node.name}</span>
      </div>
      {expanded && node.children && (
        <div className="ml-4">
          {node.children.map((child) => (
            <FileItem key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileSidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b p-2">
        <button
          type="button"
          className="rounded px-2 py-0.5 text-xs text-foreground hover:bg-accent"
          title="新建文件"
        >
          新建
        </button>
      </div>
      <div className="flex-1 overflow-auto p-1">
        {initialTree.map((node) => (
          <FolderItem key={node.id} node={node} />
        ))}
      </div>
      <div className="border-t p-2 text-xs text-muted-foreground">
        我的工作区
      </div>
    </div>
  );
}
