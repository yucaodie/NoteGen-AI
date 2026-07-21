'use client';

import * as ResizablePrimitive from 'react-resizable-panels';
import type { Layout } from 'react-resizable-panels';
import { cn } from '@/lib/utils';

function ResizablePanelGroup({
  className,
  onLayout,
  onLayoutChange,
  onLayoutChanged,
  orientation,
  direction,
  ...props
}: ResizablePrimitive.GroupProps & {
  onLayout?: (layout: Layout) => void;
  direction?: 'horizontal' | 'vertical';
}) {
  const layoutCallback = onLayout || onLayoutChange || onLayoutChanged;
  const actualOrientation = orientation || direction || 'horizontal';

  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        'flex h-full w-full aria-[orientation=vertical]:flex-col',
        className,
      )}
      orientation={actualOrientation}
      onLayoutChanged={layoutCallback}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        'relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border" />
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
