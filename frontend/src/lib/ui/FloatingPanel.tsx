import React, { useRef, useState, useEffect } from 'react';
import { dockingStore } from '../stores/dockingStore';
import type { PanelState } from '../stores/dockingStore';

interface FloatingPanelProps {
  panel: PanelState;
  children: React.ReactNode;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({ panel, children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [prevPanel, setPrevPanel] = useState(panel);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: panel.x, y: panel.y });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: panel.width, h: panel.height });

  // Sync positions/size when updated externally (inline to satisfy ESLint)
  if (panel.x !== prevPanel.x || panel.y !== prevPanel.y || panel.width !== prevPanel.width || panel.height !== prevPanel.height) {
    setPos({ x: panel.x, y: panel.y });
    setSize({ w: panel.width, h: panel.height });
    setPrevPanel(panel);
  }

  // Drag hander (movement)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag from header, ignore buttons/clicks
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });
    e.preventDefault();
  };

  // Resize handler
  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsResizing(true);
    setResizeStart({
      x: e.clientX - size.w,
      y: e.clientY - size.h
    });
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const nx = e.clientX - dragStart.x;
        const ny = Math.max(0, e.clientY - dragStart.y); // Prevent dragging above viewport
        setPos({ x: nx, y: ny });
      }
      if (isResizing) {
        const nw = Math.max(200, e.clientX - resizeStart.x);
        const nh = Math.max(150, e.clientY - resizeStart.y);
        setSize({ w: nw, h: nh });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        dockingStore.updatePanelPosition(panel.id, pos.x, pos.y);
      }
      if (isResizing) {
        setIsResizing(false);
        dockingStore.updatePanelSize(panel.id, size.w, size.h);
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, pos, isResizing, resizeStart, size, panel.id]);

  const handleDoubleClick = () => {
    dockingStore.toggleFloating(panel.id);
  };

  const handleClose = () => {
    dockingStore.setOpen(panel.id, false);
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${size.w}px`,
        height: `${size.h}px`,
        zIndex: 900,
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          height: '36px',
          backgroundColor: 'var(--bg-panel-header)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          cursor: 'move',
          userSelect: 'none',
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📌 {panel.title} (Doppelklick zum Andocken)
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleDoubleClick}
            title="Andocken"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '11px',
              padding: '2px 4px'
            }}
          >
            📥
          </button>
          <button
            onClick={handleClose}
            title="Schließen"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '11px',
              padding: '2px 4px'
            }}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {children}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '12px',
          height: '12px',
          cursor: 'se-resize',
          zIndex: 10,
          backgroundImage: 'linear-gradient(135deg, transparent 40%, var(--border-color) 40%, var(--border-color) 60%, transparent 60%, transparent 80%, var(--border-color) 80%)',
          backgroundSize: '4px 4px'
        }}
      />
    </div>
  );
};
