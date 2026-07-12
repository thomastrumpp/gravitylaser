import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../stores/store';
import { historyStore, type Command } from '../stores/historyStore';
import {
  Undo2,
  Redo2,
  Play,
  RotateCcw,
  Square,
  Circle,
  HelpCircle,
  Type,
  Link,
  Unlink,
  Layers,
  Trash2,
  ChevronRight,
  GitCommit,
  Scissors
} from 'lucide-react';

export const TimelinePanel: React.FC = () => {
  const { t } = useTranslation();
  const { commands, playheadIndex } = useStore(historyStore);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll zum Ende der Historie bei neuen Commands
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [commands.length]);

  // Command-Typ in lesbaren Text und Icon übersetzen
  const getCommandInfo = (cmd: Command) => {
    switch (cmd.type) {
      case 'create':
        const shape = cmd.params.shapeType;
        if (shape === 'rect') return { label: 'Rechteck', icon: Square, color: 'var(--accent-cyan)' };
        if (shape === 'circle') return { label: 'Kreis', icon: Circle, color: 'var(--accent-cyan)' };
        if (shape === 'text' || shape === 'i-text') return { label: 'Text', icon: Type, color: 'var(--accent-blue)' };
        return { label: `Form: ${shape}`, icon: HelpCircle, color: 'var(--accent-cyan)' };
      case 'update':
        return { label: 'Eigenschaften', icon: RotateCcw, color: 'var(--accent-orange)' };
      case 'delete':
        return { label: 'Löschen', icon: Trash2, color: 'var(--accent-red)' };
      case 'layerChange':
        return { label: 'Ebene wechseln', icon: Layers, color: 'var(--accent-green)' };
      case 'group':
        return { label: 'Gruppieren', icon: Link, color: 'var(--text-muted)' };
      case 'ungroup':
        return { label: 'Auflösen', icon: Unlink, color: 'var(--text-muted)' };
      case 'boolean':
        return { label: `Boolean: ${cmd.params.action}`, icon: Scissors, color: 'var(--accent-orange)' };
      case 'align':
        return { label: 'Ausrichten', icon: ChevronRight, color: 'var(--text-dark)' };
      default:
        return { label: 'Aktion', icon: GitCommit, color: 'var(--text-muted)' };
    }
  };

  const handleNodeClick = (index: number) => {
    historyStore.setPlayhead(index);
  };

  const handleDoubleClick = (cmd: Command) => {
    // Falls das Objekt im Viewport vorhanden ist, wählen wir es aus, um die Properties zu editieren
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    let targetId = '';
    if (cmd.type === 'create') targetId = cmd.params.gravityId;
    else if (cmd.type === 'update') targetId = cmd.params.targetId;
    else if (cmd.type === 'boolean') targetId = cmd.params.newPathId;

    if (targetId) {
      const obj = canvas.getObjects().find((o: any) => o.get('data')?.gravityId === targetId);
      if (obj) {
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
        // Event auslösen zur Selektionsaktualisierung
        canvas.fire('selection:created', { selected: [obj] });
      }
    }
  };

  return (
    <div className="timeline-container">
      {/* Undo/Redo Schnellzugriff */}
      <div className="timeline-controls">
        <button
          className="timeline-btn"
          disabled={playheadIndex < 0}
          onClick={() => historyStore.undo()}
          title="Rückgängig (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          className="timeline-btn"
          disabled={playheadIndex >= commands.length - 1}
          onClick={() => historyStore.redo()}
          title="Wiederholen (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>
        <button
          className="timeline-btn"
          disabled={commands.length === 0}
          onClick={() => historyStore.setPlayhead(-1)}
          title="Zum Anfang springen"
        >
          <Play size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>

      <div className="timeline-divider-vertical" />

      {/* Die eigentliche Zeitleiste */}
      <div className="timeline-scroll-area" ref={containerRef}>
        {commands.length === 0 ? (
          <div className="timeline-empty-message">
            {t('timeline.empty')}
          </div>
        ) : (
          <div className="timeline-track">
            {/* Startknoten */}
            <div
              className={`timeline-node start-node ${playheadIndex === -1 ? 'active-playhead' : ''}`}
              onClick={() => historyStore.setPlayhead(-1)}
              title="Ursprungszustand (Leeres Canvas)"
            >
              <div className="node-icon-wrapper">
                <Play size={10} />
              </div>
              <span className="node-label">{t('timeline.start')}</span>
            </div>

            {commands.map((cmd, idx) => {
              const { label, icon: IconComponent, color } = getCommandInfo(cmd);
              const isActive = idx <= playheadIndex;
              const isPlayhead = idx === playheadIndex;

              return (
                <React.Fragment key={cmd.id}>
                  {/* Verbindungslinie */}
                  <div className={`timeline-connector ${isActive ? 'active' : ''}`} />

                  {/* Aktionsknoten */}
                  <div
                    className={`timeline-node ${isActive ? 'active' : ''} ${isPlayhead ? 'active-playhead' : ''}`}
                    onClick={() => handleNodeClick(idx)}
                    onDoubleClick={() => handleDoubleClick(cmd)}
                    title={`Doppelklick zum Editieren\nTyp: ${label}\nDetails: ${JSON.stringify(cmd.params).slice(0, 100)}...`}
                  >
                    <div className="node-icon-wrapper" style={{ borderColor: isActive ? color : 'var(--border-color)', color: isActive ? color : 'var(--text-muted)' }}>
                      <IconComponent size={12} strokeWidth={2} />
                    </div>
                    <span className="node-label" style={{ color: isPlayhead ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {label}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
