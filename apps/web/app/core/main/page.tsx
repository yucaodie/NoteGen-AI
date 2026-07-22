'use client';

import { useEffect, useRef, useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import type { Layout } from 'react-resizable-panels';
import { LeftSidebar } from './left-sidebar';
import { EditorLayout } from './editor/editor-layout';
import Chat from './chat';
import { useSidebarStore } from '@/stores/sidebar';

const DEFAULT_LAYOUTS: Record<string, number[]> = {
  'left-center-right': [20, 50, 30],
  'left-center': [30, 70, 0],
  'center-right': [0, 60, 40],
  'left-right': [50, 0, 50],
  left: [100, 0, 0],
  center: [0, 100, 0],
  right: [0, 0, 100],
};

function loadPersistedLayout(layoutKey: string): number[] {
  if (typeof window === 'undefined') return getDefaultLayout(layoutKey);
  const storageKey = `react-resizable-panels:main-layout:${layoutKey}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.length === 3) {
        const sum = parsed.reduce((a: number, b: number) => a + b, 0);
        if (Math.abs(sum - 100) < 0.1) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return getDefaultLayout(layoutKey);
}

function getDefaultLayout(layoutKey: string): number[] {
  return DEFAULT_LAYOUTS[layoutKey] || [30, 40, 30];
}

export default function MainPage() {
  const {
    leftSidebarVisible,
    centerPanelVisible,
    rightSidebarVisible,
    initSidebarState,
  } = useSidebarStore();

  const leftPanelRef = useRef<any>(null);
  const centerPanelRef = useRef<any>(null);
  const rightPanelRef = useRef<any>(null);

  const MIN_SIDEBAR_WIDTH_PX = 280;
  const MIN_EDITOR_WIDTH_PX = 400;
  const [minSidebarSize, setMinSidebarSize] = useState(20);
  const [minEditorSize, setMinEditorSize] = useState(30);

  const visiblePanels = [
    leftSidebarVisible && 'left',
    centerPanelVisible && 'center',
    rightSidebarVisible && 'right',
  ].filter(Boolean);
  const layoutKey = visiblePanels.join('-') || 'center';

  const [layout, setLayout] = useState<number[]>(() => getDefaultLayout(layoutKey));

  useEffect(() => {
    initSidebarState();
    setLayout(loadPersistedLayout(layoutKey));
    calculateMinSizes();

    window.addEventListener('resize', calculateMinSizes);
    return () => window.removeEventListener('resize', calculateMinSizes);
  }, [initSidebarState]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (leftPanelRef.current) {
        if (leftSidebarVisible) leftPanelRef.current.expand();
        else leftPanelRef.current.collapse();
      }
      if (centerPanelRef.current) {
        if (centerPanelVisible) centerPanelRef.current.expand();
        else centerPanelRef.current.collapse();
      }
      if (rightPanelRef.current) {
        if (rightSidebarVisible) rightPanelRef.current.expand();
        else rightPanelRef.current.collapse();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [leftSidebarVisible, centerPanelVisible, rightSidebarVisible]);

  function calculateMinSizes() {
    const windowWidth = window.innerWidth;
    const minSidebarPercent = Math.max(15, (MIN_SIDEBAR_WIDTH_PX / windowWidth) * 100);
    const minEditorPercent = Math.max(25, (MIN_EDITOR_WIDTH_PX / windowWidth) * 100);
    setMinSidebarSize(Math.min(minSidebarPercent, 40));
    setMinEditorSize(Math.min(minEditorPercent, 50));
  }

  const onLayout = (newLayout: Layout) => {
    const storageKey = `react-resizable-panels:main-layout:${layoutKey}`;
    const sizes = ['left', 'center', 'right'].map((id) => newLayout[id] ?? 0);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(sizes));
    }
  };

  let panelIndex = 0;

  const shouldShowLeftHandle = leftSidebarVisible && (centerPanelVisible || rightSidebarVisible);
  const shouldShowRightHandle = centerPanelVisible && rightSidebarVisible;

  return (
    <div className="h-screen w-screen overflow-hidden" suppressHydrationWarning>
      <ResizablePanelGroup
        id="main-group"
        orientation="horizontal"
        onLayout={onLayout}
        className="h-full w-full"
      >
        <ResizablePanel
          id="left"
          panelRef={leftPanelRef}
          defaultSize={`${layout[panelIndex++]}%`}
          minSize={`${minSidebarSize}%`}
          collapsible
          collapsedSize="0%"
        >
          <LeftSidebar />
        </ResizablePanel>

        <ResizableHandle className={!shouldShowLeftHandle ? 'hidden' : 'w-1 bg-border hover:bg-primary/50 transition-colors'} />

        <ResizablePanel
          id="center"
          panelRef={centerPanelRef}
          defaultSize={`${layout[panelIndex++]}%`}
          minSize={`${minEditorSize}%`}
          collapsible
          collapsedSize="0%"
        >
          <EditorLayout />
        </ResizablePanel>

        <ResizableHandle className={!shouldShowRightHandle ? 'hidden' : 'w-1 bg-border hover:bg-primary/50 transition-colors'} />

        <ResizablePanel
          id="right"
          panelRef={rightPanelRef}
          defaultSize={`${layout[panelIndex++]}%`}
          minSize={`${minSidebarSize}%`}
          collapsible
          collapsedSize="0%"
        >
          <Chat />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
