import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { settingsStore } from '../stores/settingsStore';
import { layersStore } from '../stores/layersStore';

interface Props {
  initialGcode: string;
  onClose: () => void;
  onRun: (gcode: string) => void;
  onSimulate: (gcode: string) => void;
}

export const GcodeEditorModal: React.FC<Props> = ({ initialGcode, onClose, onRun, onSimulate }) => {
  const { t } = useTranslation();
  const [gcode, setGcode] = useState(initialGcode);
  const settings = settingsStore.get();
  const origin = settings.origin;
  const layers = layersStore.get();

  // Hole alle Leinwand-Objekte
  const objects = typeof window !== 'undefined' && (window as any).getCanvasObjectsForGcode
    ? (window as any).getCanvasObjectsForGcode()
    : [];

  // Gruppiere Objekte nach Ebenen
  const objectsByLayer: Record<string, any[]> = {};
  objects.forEach((obj: any) => {
    const lId = obj.layerId || 'C00';
    if (!objectsByLayer[lId]) objectsByLayer[lId] = [];
    objectsByLayer[lId].push(obj);
  });

  const getMarkerCoords = (orig: string) => {
    switch (orig) {
      case 'TopLeft':
        return { cx: 25, cy: 25, label: t('modal_gcode_editor.origin_top_left'), desc: t('modal_gcode_editor.desc_top_left') };
      case 'TopRight':
        return { cx: 135, cy: 25, label: t('modal_gcode_editor.origin_top_right'), desc: t('modal_gcode_editor.desc_top_right') };
      case 'BottomRight':
        return { cx: 135, cy: 135, label: t('modal_gcode_editor.origin_bottom_right'), desc: t('modal_gcode_editor.desc_bottom_right') };
      case 'Center':
        return { cx: 80, cy: 80, label: t('modal_gcode_editor.origin_center'), desc: t('modal_gcode_editor.desc_center') };
      case 'BottomLeft':
      default:
        return { cx: 25, cy: 135, label: t('modal_gcode_editor.origin_bottom_left'), desc: t('modal_gcode_editor.desc_bottom_left') };
    }
  };

  const coords = getMarkerCoords(origin);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '920px', maxWidth: '95vw', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3 className="modal-title">{t('modal_gcode_editor.title')}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body" style={{ flex: 1, display: 'flex', gap: '20px', minHeight: 0, padding: '15px 20px' }}>
          {/* Linke Spalte: G-Code Editor */}
          <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-color)' }}>
              {t('modal_gcode_editor.generated_gcode')}
            </span>
            <textarea
              className="input-field"
              style={{ 
                flex: 1, 
                fontFamily: 'monospace', 
                fontSize: '13px', 
                resize: 'none', 
                whiteSpace: 'pre',
                padding: '10px',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)'
              }}
              value={gcode}
              onChange={(e) => setGcode(e.target.value)}
              spellCheck="false"
            />
          </div>

          {/* Rechte Spalte: Startposition Guide & Ebenen-Übersicht */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px', 
            padding: '15px',
            backgroundColor: 'var(--bg-panel)', 
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            fontSize: '13px',
            overflowY: 'auto',
            maxHeight: '100%'
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📍 {t('modal_gcode_editor.origin_header')}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
              <svg width="150" height="150" viewBox="0 0 160 160" style={{ background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {/* Rasterbox */}
                <rect x="20" y="20" width="120" height="120" fill="var(--bg-panel)" stroke="var(--border-color)" strokeWidth="1.5" />
                
                {/* Hilfslinien */}
                <line x1="50" y1="20" x2="50" y2="140" stroke="var(--border-color)" strokeDasharray="3,3" />
                <line x1="80" y1="20" x2="80" y2="140" stroke="var(--border-hover)" />
                <line x1="110" y1="20" x2="110" y2="140" stroke="var(--border-color)" strokeDasharray="3,3" />
                
                <line x1="20" y1="50" x2="140" y2="50" stroke="var(--border-color)" strokeDasharray="3,3" />
                <line x1="20" y1="80" x2="140" y2="80" stroke="var(--border-hover)" />
                <line x1="20" y1="110" x2="140" y2="110" stroke="var(--border-color)" strokeDasharray="3,3" />
                
                {/* Achsenbezeichnungen */}
                <text x="80" y="14" fill="var(--text-dark)" fontSize="8" fontFamily="sans-serif" textAnchor="middle">{t('modal_gcode_editor.back_y')}</text>
                <text x="80" y="154" fill="var(--text-dark)" fontSize="8" fontFamily="sans-serif" textAnchor="middle">{t('modal_gcode_editor.front_y')}</text>
                <text x="6" y="83" fill="var(--text-dark)" fontSize="8" fontFamily="sans-serif" textAnchor="middle" transform="rotate(-90 6 80)">{t('modal_gcode_editor.left_x')}</text>
                <text x="154" y="83" fill="var(--text-dark)" fontSize="8" fontFamily="sans-serif" textAnchor="middle" transform="rotate(90 154 80)">{t('modal_gcode_editor.right_x')}</text>

                {/* Pulsierender roter Zielkreis */}
                <circle cx={coords.cx} cy={coords.cy} r="10" fill="rgba(255, 75, 75, 0.25)" stroke="rgba(255, 75, 75, 0.8)" strokeWidth="1.5">
                  <animate attributeName="r" values="6;12;6" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle cx={coords.cx} cy={coords.cy} r="3" fill="#ff4b4b" />
                
                {/* Fadenkreuz */}
                <path d={`M ${coords.cx-7} ${coords.cy} L ${coords.cx+7} ${coords.cy} M ${coords.cx} ${coords.cy-7} L ${coords.cx} ${coords.cy+7}`} stroke="#ffffff" strokeWidth="1" />
              </svg>
              
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ff4b4b', textAlign: 'center' }}>
                {t('modal_gcode_editor.origin_label')}: {coords.label}
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(255, 127, 0, 0.1)', borderLeft: '3px solid var(--accent-orange)', padding: '8px 10px', borderRadius: '4px', lineHeight: '1.4' }}>
              <strong style={{ color: 'var(--accent-orange)' }}>⚠️ {t('modal_gcode_editor.before_start')}:</strong><br />
              {coords.desc}
            </div>

            {/* EBENEN UND OBJEKTE ÜBERSICHT */}
            <h3 style={{ margin: '10px 0 0 0', fontSize: '14px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              📋 {t('modal_gcode_editor.layers_overview')}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.keys(objectsByLayer).length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  {t('modal_gcode_editor.no_objects')}
                </div>
              ) : (
                Object.keys(objectsByLayer).sort().map((layerId) => {
                  const layer = layers[layerId];
                  const layerObjs = objectsByLayer[layerId];
                  if (!layer || !layer.output) return null;

                  return (
                    <div key={layerId} style={{ 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '6px', 
                      padding: '8px 10px', 
                      backgroundColor: 'var(--bg-input)'
                    }}>
                      {/* Ebenen-Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '5px' }}>
                        <span style={{ 
                          display: 'inline-block', 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '2px', 
                          backgroundColor: layer.color,
                          border: '1px solid var(--border-color)'
                        }} />
                        <span style={{ fontSize: '12px' }}>{layer.name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {layer.mode.toUpperCase()} ({layer.presetMode === 'engrave' ? t('modal_gcode_editor.mode_engrave') : layer.presetMode === 'cut' ? t('modal_gcode_editor.mode_cut') : t('modal_gcode_editor.mode_manual')})
                        </span>
                      </div>

                      {/* Parameter */}
                      <div style={{ fontSize: '11px', color: 'var(--accent-orange)', marginBottom: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <span>⚡ {t('modal_gcode_editor.power')}: {layer.power}%</span>
                        <span>🚀 {t('modal_gcode_editor.speed')}: {layer.speed} mm/min</span>
                        <span>🔄 {t('modal_gcode_editor.passes')}: {layer.passes}</span>
                        {layer.airAssist && <span>💨 Air Assist</span>}
                      </div>

                      {/* Objekte auf dieser Ebene */}
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '4px' }}>
                        {layerObjs.map((obj: any, idx: number) => {
                          let name = t('modal_gcode_editor.unknown_obj');
                          let sizeInfo = '';
                          
                          if (obj.type === 'rect') {
                            name = t('modal_gcode_editor.obj_rect');
                            sizeInfo = `${(obj.width * obj.scaleX).toFixed(1)} x ${(obj.height * obj.scaleY).toFixed(1)} mm`;
                          } else if (obj.type === 'circle') {
                            name = t('modal_gcode_editor.obj_circle');
                            sizeInfo = `R: ${(obj.radius * obj.scaleX).toFixed(1)} mm`;
                          } else if (obj.type === 'image') {
                            name = t('modal_gcode_editor.obj_image');
                            sizeInfo = `${(obj.width * obj.scaleX).toFixed(1)} x ${(obj.height * obj.scaleY).toFixed(1)} mm (${obj.imageMode})`;
                          } else if (obj.type === 'line') {
                            name = t('modal_gcode_editor.obj_line');
                            sizeInfo = `${(obj.width * obj.scaleX).toFixed(1)} mm`;
                          } else if (obj.type === 'path') {
                            name = t('modal_gcode_editor.obj_path');
                            sizeInfo = `${obj.path?.length || 0} ${t('modal_gcode_editor.points')}`;
                          }

                          return (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                              <span>{name}</span>
                              <span style={{ fontFamily: 'monospace' }}>{sizeInfo}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center', marginRight: 'auto' }}>
            {t('modal_gcode_editor.lines')}: {gcode.split('\n').length}
          </span>
          <button className="btn btn-secondary" onClick={onClose}>{t('modal_gcode_editor.cancel')}</button>
          <button className="btn" onClick={() => onSimulate(gcode)}>💻 {t('modal_gcode_editor.simulate')}</button>
          <button className="btn btn-danger" onClick={() => onRun(gcode)} style={{ fontWeight: 'bold' }}>
            🔥 {t('modal_gcode_editor.run')}
          </button>
        </div>
      </div>
    </div>
  );
};
