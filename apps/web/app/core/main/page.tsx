'use client';

import { useEffect, useRef, useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import type { Layout, PanelImperativeHandle } from 'react-resizable-panels';
import { LeftSidebar } from './left-sidebar';
import { EditorLayout } from './editor/editor-layout';
import Chat from './chat';
import { useSidebarStore } from '@/stores/sidebar';

function getDefaultLayout(layoutKey: string) {
  if (typeof window === 'undefined') return [30, 40, 30];
  const storageKey = `react-resizable-panels:main-layout:${layoutKey}`;
  const layout = localStorage.getItem(storageKey);

  if (layout) {
    try {
      const parsed = JSON.parse(layout);
      const sum = parsed.reduce((a: number, b: number) => a + b, 0);
      if (Math.abs(sum - 100) < 0.1) {
        return parsed;
      }
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  switch (layoutKey) {
    case 'left-center-right':
      return [20, 50, 30];
    case 'left-center':
      return [30, 70, 0];
    case 'center-right':
      return [0, 60, 40];
    case 'left-right':
      return [50, 0, 50];
    case 'left':
      return [100, 0, 0];
    case 'center':
      return [0, 100, 0];
    case 'right':
      return [0, 0, 100];
    default:
      return [30, 40, 30];
  }
}

export default function MainPage() {
  const {
    leftSidebarVisible,
    centerPanelVisible,
    rightSidebarVisible,
    initSidebarState,
  } = useSidebarStore();

  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const centerPanelRef = useRef<PanelImperativeHandle>(null);
  const rightPanelRef = useRef<PanelImperativeHandle>(null);

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

  const calculateMinSizes = () => {
    const windowWidth = window.innerWidth;
    const minSidebarPercent = Math.max(15, (MIN_SIDEBAR_WIDTH_PX / windowWidth) * 100);
    const minEditorPercent = Math.max(25, (MIN_EDITOR_WIDTH_PX / windowWidth) * 100);
    setMinSidebarSize(Math.min(minSidebarPercent, 40));
    setMinEditorSize(Math.min(minEditorPercent, 50));
  };

  useEffect(() => {
    initSidebarState();
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

  const getActualLayout = () => {
    const savedLayout = getDefaultLayout(layoutKey);
    if (savedLayout.length === 3) return savedLayout;
    return [30, 40, 30];
  };

  const actualLayout = getActualLayout();

  const onLayout = (layout: Layout) => {
    const storageKey = `react-resizable-panels:main-layout:${layoutKey}`;
    const sizes = ['left', 'center', 'right'].map((id) => layout[id] ?? 0);
    localStorage.setItem(storageKey, JSON.stringify(sizes));
  };

  let panelIndex = 0;

  const shouldShowLeftHandle = leftSidebarVisible && (centerPanelVisible || rightSidebarVisible);
  const shouldShowRightHandle = centerPanelVisible && rightSidebarVisible;

  return (
    <div className="h-screen w-screen overflow-hidden">
      <ResizablePanelGroup
        orientation="horizontal"
        onLayout={onLayout}
        className="h-full w-full"
      >
        <ResizablePanel
          id="left"
          panelRef={leftPanelRef}
          defaultSize={`${actualLayout[panelIndex++]}%`}
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
          defaultSize={`${actualLayout[panelIndex++]}%`}
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
          defaultSize={`${actualLayout[panelIndex++]}%`}
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
