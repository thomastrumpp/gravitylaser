import React from 'react';
import { useStore } from '../stores/store';
import { canvasStore, type ToolType } from '../stores/canvasStore';
import {
  MousePointer,
  Type,
  Square,
  Circle,
  FolderOpen,
  Image as ImageIcon,
  Link as LinkIcon,
  Unlink as UnlinkIcon,
  Plus,
  Minus,
  Scissors,
  AlignLeft,
  AlignRight,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpDown,
  GitCommit,
  DraftingCompass,
  Crop,
  Barcode,
  Globe,
  Package
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const CanvasToolbar: React.FC = () => {
  const { t } = useTranslation();
  const { activeTool } = useStore(canvasStore);
  const [lastShape, setLastShape] = React.useState<ToolType>('rect');
  const [isShapesOpen, setIsShapesOpen] = React.useState(false);
  const [isOpsOpen, setIsOpsOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isAlignOpen, setIsAlignOpen] = React.useState(false);



  // Alle Formen (Rechteck und Kreis oben, gefolgt von weiteren Formen)
  const allShapes = [
    { id: 'rect' as ToolType, label: t('shapes.rect', 'Rechteck'), icon: Square, isLucide: true },
    { id: 'circle' as ToolType, label: t('shapes.circle', 'Kreis'), icon: Circle, isLucide: true },
    { id: 'ellipse' as ToolType, label: t('shapes.ellipse', 'Ellipse'), icon: '⬭', isLucide: false },
    { id: 'line' as ToolType, label: t('shapes.line', 'Linie'), icon: '╱', isLucide: false },
    { id: 'triangle' as ToolType, label: t('shapes.triangle', 'Dreieck'), icon: '△', isLucide: false },
    { id: 'polygon' as ToolType, label: t('shapes.polygon', 'Fünfeck'), icon: '⬠', isLucide: false },
    { id: 'hexagon' as ToolType, label: t('shapes.hexagon', 'Sechseck'), icon: '⬡', isLucide: false },
    { id: 'star' as ToolType, label: t('shapes.star', 'Stern'), icon: '⭐', isLucide: false },
    { id: 'heart' as ToolType, label: t('shapes.heart', 'Herz'), icon: '❤️', isLucide: false },
    { id: 'arrow' as ToolType, label: t('shapes.arrow', 'Pfeil'), icon: '➔', isLucide: false },
  ];

  React.useEffect(() => {
    if (allShapes.some(s => s.id === activeTool)) {
      setLastShape(activeTool);
    }
  }, [activeTool]);

  const renderShapeIcon = (id: ToolType, size = 18) => {
    const found = allShapes.find(s => s.id === id);
    if (!found) return <Square size={size} strokeWidth={1.75} />;
    if (found.isLucide) {
      return React.createElement(found.icon as React.ComponentType<any>, { size, strokeWidth: 1.75 });
    }
    return <span style={{ fontSize: `${size - 3}px` }}>{found.icon as string}</span>;
  };

  return (
    <div className="sidebar-tools">
      {/* 1. Auswahl & Navigation (Einzelne Buttons) */}
      <button
        className={`tool-button ${activeTool === 'select' ? 'active' : ''}`}
        onClick={() => canvasStore.setActiveTool('select')}
        title={t('toolbar.select', 'Auswahlwerkzeug (S)')}
      >
        <MousePointer size={18} strokeWidth={1.75} />
      </button>

      <button
        className={`tool-button ${activeTool === 'node-edit' ? 'active' : ''}`}
        onClick={() => canvasStore.setActiveTool('node-edit')}
        title={t('toolbar.node_edit', 'Knotenbearbeitung (N)')}
      >
        <GitCommit size={18} strokeWidth={1.75} />
      </button>

      <div className="toolbar-divider" />

      {/* 2. Zeichenwerkzeuge (Formen Popup) */}
      <div style={{ position: 'relative', display: 'flex', width: '38px', height: '38px' }}>
        <button
          className={`tool-button ${allShapes.some(s => s.id === activeTool) || isShapesOpen ? 'active' : ''}`}
          onClick={() => {
            // Entweder direkt das Tool wechseln oder das Menü öffnen.
            // Die eleganteste Lösung: Ein Klick öffnet immer das Menü, 
            // es sei denn, man ist nicht im Shape-Tool, dann setzt man es.
            if (!allShapes.some(s => s.id === activeTool)) {
              canvasStore.setActiveTool(lastShape);
            } else {
              setIsShapesOpen(!isShapesOpen);
            }
          }}
          title={`${t('toolbar.draw_shape', 'Form zeichnen')}: ${allShapes.find(s => s.id === lastShape)?.label || 'Rechteck'}`}
        >
          {renderShapeIcon(lastShape)}
        </button>

        {isShapesOpen && (
          <div
            style={{
              position: 'absolute',
              left: '100%',
              top: 0,
              marginLeft: '8px',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              padding: '8px',
              zIndex: 1000,
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'var(--glass-effect)',
            }}
          >
            {allShapes.map((shape) => (
              <button
                key={shape.id}
                className={`tool-button ${activeTool === shape.id ? 'active' : ''}`}
                style={{ width: '34px', height: '34px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => {
                  canvasStore.setActiveTool(shape.id);
                  setIsShapesOpen(false);
                }}
                title={shape.label}
              >
                {shape.isLucide ? (
                  React.createElement(shape.icon as React.ComponentType<any>, { size: 18, strokeWidth: 1.75 })
                ) : (
                  <span style={{ fontSize: '15px' }}>{shape.icon as string}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className={`tool-button ${activeTool === 'text' ? 'active' : ''}`}
        onClick={() => canvasStore.setActiveTool('text')}
        title={t('toolbar.text', 'Text einfügen (T)')}
      >
        <Type size={18} strokeWidth={1.75} />
      </button>

      <button
        className="tool-button"
        onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'barcode' } }))}
        title={t('toolbar.barcode', 'Barcode / QR-Code einfügen')}
      >
        <Barcode size={18} strokeWidth={1.75} />
      </button>

      <button
        className="tool-button"
        onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'nesting' } }))}
        title={t('nav.tooltip_nesting', { defaultValue: 'Smart-Nesting (Materialplatzierung) starten' })}
      >
        <Package size={18} strokeWidth={1.75} />
      </button>

      <div className="toolbar-divider" />

      {/* 3. Import-Aktionen (Gruppiert) */}
      <div style={{ position: 'relative' }}>
        <button
          className={`tool-button ${isImportOpen ? 'active' : ''}`}
          onClick={() => {
            setIsImportOpen(!isImportOpen);
            setIsShapesOpen(false);
            setIsOpsOpen(false);
            setIsAlignOpen(false);
          }}
          title="Import-Optionen (SVG, DXF, Bild, Web)"
        >
          <FolderOpen size={18} strokeWidth={1.75} />
          <span style={{ fontSize: '7px', position: 'absolute', bottom: 1, right: 1 }}>▼</span>
        </button>

        {isImportOpen && (
          <div
            style={{
              position: 'absolute',
              left: '100%',
              top: 0,
              marginLeft: '8px',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '6px',
              zIndex: 1000,
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'var(--glass-effect)',
            }}
          >
            <label
              className="tool-button"
              title="SVG Vektorgrafik importieren"
              style={{ width: '100%', height: '32px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', justifyContent: 'flex-start', whiteSpace: 'nowrap', fontSize: '11px', borderColor: 'transparent', cursor: 'pointer' }}
            >
              <FolderOpen size={14} strokeWidth={1.75} />
              <span>SVG importieren</span>
              <input
                type="file"
                accept=".svg"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const svgContent = ev.target?.result as string;
                    window.dispatchEvent(new CustomEvent('loadSVG', { detail: svgContent }));
                    setIsImportOpen(false);
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </label>

            <label
              className="tool-button"
              title="DXF Vektorgrafik importieren (.dxf)"
              style={{ width: '100%', height: '32px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', justifyContent: 'flex-start', whiteSpace: 'nowrap', fontSize: '11px', borderColor: 'transparent', cursor: 'pointer' }}
            >
              <DraftingCompass size={14} strokeWidth={1.75} />
              <span>DXF importieren</span>
              <input
                type="file"
                accept=".dxf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const dxfContent = ev.target?.result as string;
                    window.dispatchEvent(new CustomEvent('loadDXF', { detail: dxfContent }));
                    setIsImportOpen(false);
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </label>

            <label
              className="tool-button"
              title="Rasterbild importieren (PNG, JPG)"
              style={{ width: '100%', height: '32px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', justifyContent: 'flex-start', whiteSpace: 'nowrap', fontSize: '11px', borderColor: 'transparent', cursor: 'pointer' }}
            >
              <ImageIcon size={14} strokeWidth={1.75} />
              <span>Bild importieren</span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const dataUrl = ev.target?.result as string;
                    window.dispatchEvent(new CustomEvent('loadImage', { detail: dataUrl }));
                    setIsImportOpen(false);
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
            </label>

            <button
              className="tool-button"
              style={{ width: '100%', height: '32px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', justifyContent: 'flex-start', whiteSpace: 'nowrap', fontSize: '11px', borderColor: 'transparent' }}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'web-import' } }));
                setIsImportOpen(false);
              }}
              title="SVG aus Web / Cuttle.xyz importieren"
            >
              <Globe size={14} strokeWidth={1.75} />
              <span>Web Import (Cuttle.xyz)</span>
            </button>
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* 4. Gruppen & Pfad-Operationen (Kombiniert) */}
      <div style={{ position: 'relative' }}>
        <button
          className={`tool-button ${isOpsOpen ? 'active' : ''}`}
          onClick={() => {
            setIsOpsOpen(!isOpsOpen);
            setIsShapesOpen(false);
            setIsImportOpen(false);
            setIsAlignOpen(false);
          }}
          title="Operationen (Gruppieren, Vereinigung, Masken)"
        >
          <LinkIcon size={18} strokeWidth={1.75} />
          <span style={{ fontSize: '7px', position: 'absolute', bottom: 1, right: 1 }}>▼</span>
        </button>

        {isOpsOpen && (
          <div
            style={{
              position: 'absolute',
              left: '100%',
              top: 0,
              marginLeft: '8px',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '6px',
              zIndex: 1000,
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'var(--glass-effect)',
            }}
          >
            {[
              { action: 'group', label: 'Gruppieren', icon: LinkIcon, tooltip: 'Objekte gruppieren' },
              { action: 'ungroup', label: 'Gruppierung aufheben', icon: UnlinkIcon, tooltip: 'Gruppierung auflösen' },
              { action: 'union', label: 'Vereinigen (Union)', icon: Plus, tooltip: 'Pfade verschmelzen' },
              { action: 'subtract', label: 'Abziehen (Subtract)', icon: Minus, tooltip: 'Vorderes Objekt abziehen' },
              { action: 'intersect', label: 'Schnittmenge', icon: Scissors, tooltip: 'Schnittmenge bilden' },
              { action: 'clip-image', label: 'Maske erstellen', icon: Crop, tooltip: 'Als Maske zuweisen (Bild + Form)' },
              { action: 'unclip-image', label: 'Maske aufheben', icon: UnlinkIcon, tooltip: 'Bildmaske aufheben' }
            ].map((op) => {
              const IconComp = op.icon;
              return (
                <button
                  key={op.action}
                  className="tool-button"
                  style={{ 
                    width: '100%', 
                    height: '32px', 
                    margin: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '0 8px', 
                    justifyContent: 'flex-start',
                    whiteSpace: 'nowrap',
                    fontSize: '11px',
                    borderColor: 'transparent'
                  }}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('canvasAction', { detail: { action: op.action } }));
                    setIsOpsOpen(false);
                  }}
                  title={op.tooltip}
                >
                  <IconComp size={14} strokeWidth={1.75} />
                  <span>{op.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* 6. Ausrichtungs-Werkzeuge (Gruppiert) */}
      <div style={{ position: 'relative' }}>
        <button
          className={`tool-button ${isAlignOpen ? 'active' : ''}`}
          onClick={() => {
            setIsAlignOpen(!isAlignOpen);
            setIsShapesOpen(false);
            setIsOpsOpen(false);
            setIsImportOpen(false);
          }}
          title="Ausrichten (Links, Zentriert, Rechts, ...)"
        >
          <AlignLeft size={18} strokeWidth={1.75} />
          <span style={{ fontSize: '7px', position: 'absolute', bottom: 1, right: 1 }}>▼</span>
        </button>

        {isAlignOpen && (
          <div
            style={{
              position: 'absolute',
              left: '100%',
              top: 0,
              marginLeft: '8px',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '4px',
              padding: '6px',
              zIndex: 1000,
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'var(--glass-effect)',
            }}
          >
            {[
              { action: 'align-left', label: 'Links ausrichten', icon: AlignLeft },
              { action: 'align-center-h', label: 'Horizontal zentrieren', icon: ArrowLeftRight },
              { action: 'align-right', label: 'Rechts ausrichten', icon: AlignRight },
              { action: 'align-top', label: 'Oben ausrichten', icon: ArrowUpToLine },
              { action: 'align-center-v', label: 'Vertikal zentrieren', icon: ArrowUpDown },
              { action: 'align-bottom', label: 'Unten ausrichten', icon: ArrowDownToLine }
            ].map((align) => {
              const IconComp = align.icon;
              return (
                <button
                  key={align.action}
                  className="tool-button"
                  style={{ width: '34px', height: '34px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('canvasAction', { detail: { action: align.action } }));
                    setIsAlignOpen(false);
                  }}
                  title={align.label}
                >
                  <IconComp size={16} strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
