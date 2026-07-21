'use client';

import { useSidebarStore } from '@/stores/sidebar';
import { FileSidebar } from './file';
import { NoteSidebar } from './mark';

export function LeftSidebar() {
  const { leftSidebarTab, setLeftSidebarTab } = useSidebarStore();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-12 w-full shrink-0 items-center justify-between border-b px-2">
        <div className="flex gap-1">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              leftSidebarTab === 'files'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setLeftSidebarTab('files')}
          >
            文件
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              leftSidebarTab === 'notes'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setLeftSidebarTab('notes')}
          >
            记录
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {leftSidebarTab === 'files' && <FileSidebar />}
        {leftSidebarTab === 'notes' && <NoteSidebar />}
      </div>
    </div>
  );
}
