'use client';

import { useState } from 'react';
import { useMarkStore, createRecordItem, recordTypeLabels, recordTypeIcons } from '@/stores/mark';

function MarkFilterPopover({
  onClose,
}: {
  onClose: () => void;
}) {
  const { filters, setKeywordFilter, toggleTypeFilter, setTimeRange, resetFilters } = useMarkStore();

  const recordTypes = Object.keys(recordTypeLabels);
  const timeRanges = [
    { value: 'all', label: '全部' },
    { value: 'today', label: '今天' },
    { value: 'week', label: '近7天' },
    { value: 'month', label: '近30天' },
  ] as const;

  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-3 shadow-md">
      <div className="mb-2">
        <label className="mb-1 block text-xs text-muted-foreground">关键词</label>
        <input
          className="w-full rounded border bg-background px-2 py-1 text-xs"
          placeholder="搜索记录..."
          value={filters.keyword}
          onChange={(e) => setKeywordFilter(e.target.value)}
        />
      </div>
      <div className="mb-2">
        <label className="mb-1 block text-xs text-muted-foreground">类型</label>
        <div className="flex flex-wrap gap-1">
          {recordTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`rounded px-1.5 py-0.5 text-xs ${
                filters.types.includes(type)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-accent'
              }`}
              onClick={() => toggleTypeFilter(type)}
            >
              {recordTypeIcons[type]} {recordTypeLabels[type]}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2">
        <label className="mb-1 block text-xs text-muted-foreground">时间</label>
        <div className="flex flex-wrap gap-1">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              type="button"
              className={`rounded px-2 py-0.5 text-xs ${
                filters.timeRange === range.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-accent'
              }`}
              onClick={() => setTimeRange(range.value)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="w-full rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => {
          resetFilters();
          onClose();
        }}
      >
        重置筛选
      </button>
    </div>
  );
}

function MarkItem({
  mark,
  onSelect,
}: {
  mark: { id: string; type: string; title: string; content: string; tags: string[]; createdAt: string };
  onSelect: (id: string) => void;
}) {
  const typeLabel = recordTypeLabels[mark.type] || mark.type;
  const typeIcon = recordTypeIcons[mark.type] || '📝';

  return (
    <div
      className="flex items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
      onClick={() => onSelect(mark.id)}
    >
      <span className="mt-0.5 shrink-0">{typeIcon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate font-medium">
            {mark.title || '无标题'}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{typeLabel}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {mark.content || '无内容'}
        </p>
        {mark.tags.length > 0 && (
          <div className="mt-0.5 flex gap-1">
            {mark.tags.map((tag) => (
              <span key={tag} className="rounded bg-muted px-1 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function NoteSidebar() {
  const {
    marks,
    addMark,
    deleteMark,
    viewMode,
    setViewMode,
    filters,
    selectedIds,
  } = useMarkStore();
  const [showFilter, setShowFilter] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [newText, setNewText] = useState('');

  const quickRecordTypes = [
    { type: 'text', label: '文本', icon: '📝' },
    { type: 'todo', label: '待办', icon: '✅' },
    { type: 'link', label: '链接', icon: '🔗' },
  ] as const;

  const handleQuickCreate = (type: string) => {
    if (!newText.trim() && type === 'text') return;
    const title = newText.trim() || '新记录';
    addMark(createRecordItem({ type: type as any, title, content: newText }));
    setNewText('');
    setShowNewMenu(false);
  };

  const filteredMarks = marks.filter((m) => {
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      if (!m.title.toLowerCase().includes(kw) && !m.content.toLowerCase().includes(kw)) return false;
    }
    if (filters.types.length > 0 && !filters.types.includes(m.type)) return false;
    if (filters.timeRange !== 'all') {
      const now = Date.now();
      const markTime = new Date(m.createdAt).getTime();
      const ranges: Record<string, number> = { today: 86400000, week: 604800000, month: 2592000000 };
      if (now - markTime > ranges[filters.timeRange]) return false;
    }
    return true;
  });

  const visibleMarks = filteredMarks.filter((m) => !m.deleted);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b px-2 py-1">
        <div className="relative">
          <button
            type="button"
            className="rounded px-2 py-1 text-xs hover:bg-accent"
            onClick={() => setShowNewMenu(!showNewMenu)}
          >
            新记录
          </button>
          {showNewMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border bg-popover p-2 shadow-md">
                <div className="mb-2">
                  <textarea
                    className="w-full rounded border bg-background px-2 py-1 text-xs"
                    rows={2}
                    placeholder="输入记录内容..."
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleQuickCreate('text');
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-1">
                  {quickRecordTypes.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      type="button"
                      className="flex-1 rounded px-2 py-1 text-xs hover:bg-accent"
                      onClick={() => handleQuickCreate(type)}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative ml-auto">
          <button
            type="button"
            className={`rounded px-2 py-1 text-xs hover:bg-accent ${showFilter ? 'bg-accent' : ''}`}
            onClick={() => setShowFilter(!showFilter)}
          >
            筛选
          </button>
          {showFilter && <MarkFilterPopover onClose={() => setShowFilter(false)} />}
        </div>

        <div className="flex rounded border text-xs">
          <button
            type="button"
            className={`rounded-l px-1.5 py-0.5 ${viewMode === 'list' ? 'bg-accent' : ''}`}
            onClick={() => setViewMode('list')}
            title="列表"
          >
            ☰
          </button>
          <button
            type="button"
            className={`px-1.5 py-0.5 ${viewMode === 'compact' ? 'bg-accent' : ''}`}
            onClick={() => setViewMode('compact')}
            title="紧凑"
          >
            ≡
          </button>
          <button
            type="button"
            className={`rounded-r px-1.5 py-0.5 ${viewMode === 'cards' ? 'bg-accent' : ''}`}
            onClick={() => setViewMode('cards')}
            title="卡片"
          >
            ⊞
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === 'list' && (
          <div>
            {visibleMarks.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                暂无记录。点击「新记录」开始采集。
              </div>
            ) : (
              visibleMarks.map((mark) => (
                <MarkItem key={mark.id} mark={mark} onSelect={() => {}} />
              ))
            )}
          </div>
        )}
        {viewMode === 'compact' && (
          <div className="space-y-0.5 p-1">
            {visibleMarks.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                暂无记录。
              </div>
            ) : (
              visibleMarks.map((mark) => (
                <div
                  key={mark.id}
                  className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs hover:bg-accent cursor-pointer"
                >
                  <span>{recordTypeIcons[mark.type]}</span>
                  <span className="truncate">{mark.title || '无标题'}</span>
                </div>
              ))
            )}
          </div>
        )}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-2 gap-1 p-1">
            {visibleMarks.length === 0 ? (
              <div className="col-span-2 p-4 text-center text-sm text-muted-foreground">
                暂无记录。
              </div>
            ) : (
              visibleMarks.map((mark) => (
                <div
                  key={mark.id}
                  className="rounded border p-2 text-xs hover:bg-accent cursor-pointer"
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span>{recordTypeIcons[mark.type]}</span>
                    <span className="truncate font-medium">{mark.title || '无标题'}</span>
                  </div>
                  <p className="line-clamp-2 text-muted-foreground">{mark.content || '无内容'}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="border-t p-1 text-center text-xs text-muted-foreground">
        {selectedIds.size > 0 ? (
          <span>已选 {selectedIds.size} 条</span>
        ) : (
          <span>共 {visibleMarks.length} 条记录</span>
        )}
      </div>
    </div>
  );
}
