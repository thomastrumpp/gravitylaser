import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NestingService } from '../services/NestingService';
import type { NestingOptions } from '../services/NestingService';
import { settingsStore } from '../stores/settingsStore';

interface NestingModalProps {
  onClose: () => void;
}

export const NestingModal: React.FC<NestingModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const settings = settingsStore.get();
  
  const [padding, setPadding] = useState(2.0); // 2mm Default Spacing
  const [edgeBuffer, setEdgeBuffer] = useState(5.0); // 5mm Default Rand
  const [allowRotation, setAllowRotation] = useState(true);
  const [lockInnerObjects, setLockInnerObjects] = useState(true);
  const [source, setSource] = useState<'all' | 'selected'>('all');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNest = () => {
    setError('');
    setIsProcessing(true);
    const fabricCanvas = (window as any).fabricCanvas;
    if (!fabricCanvas) {
      setError(t('modal_nesting.error_canvas'));
      setIsProcessing(false);
      return;
    }

    const activeObjects = fabricCanvas.getActiveObjects();
    const hasSelection = activeObjects.length > 0;
    
    let targetObjects = [];
    if (source === 'selected') {
      if (!hasSelection) {
        setError(t('modal_nesting.error_selection'));
        setIsProcessing(false);
        return;
      }
      targetObjects = activeObjects;
    } else {
      targetObjects = fabricCanvas.getObjects().filter((o: any) => {
        const data = o.get('data');
        return !data?.isCameraOverlay && !data?.isGridElement && o.selectable;
      });
    }

    if (targetObjects.length === 0) {
      setError(t('modal_nesting.error_none'));
      setIsProcessing(false);
      return;
    }

    try {
      const scalePxPerMm = (fabricCanvas as any).scalePxPerMm || 2;

      const options: NestingOptions = {
        padding: padding * scalePxPerMm,
        edgeBuffer: edgeBuffer * scalePxPerMm,
        allowRotation,
        lockInnerObjects
      };

      const result = NestingService.nest(
        targetObjects,
        settings.workingSizeX * scalePxPerMm,
        settings.workingSizeY * scalePxPerMm,
        options
      );

      if (result.packedCount === 0) {
        setError(t('modal_nesting.error_packed'));
        setIsProcessing(false);
        return;
      }

      result.moved.forEach(move => {
        const match = targetObjects.find((o: any) => {
          const gravityId = o.get('data')?.gravityId;
          return gravityId === move.id || o.id === move.id;
        });
        
        if (match) {
          match.set({ angle: move.angle });
          match.setPositionByOrigin(new (window as any).fabric.Point(move.x, move.y), 'center', 'center');
          match.setCoords();
        }
      });

      fabricCanvas.discardActiveObject();
      fabricCanvas.requestRenderAll();

      window.dispatchEvent(new CustomEvent('canvasAction', { detail: { action: 'save-history' } }));
      
      alert(t('modal_nesting.success', { count: result.packedCount }));
      onClose();
    } catch (err: any) {
      setError(t('modal_nesting.error') + ": " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{t('modal_nesting.title')}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <p style={{ fontSize: '13px', lineHeight: '1.4', color: 'var(--text-muted)' }}>
            {t('modal_nesting.description')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('modal_nesting.source')}</label>
              <select
                className="form-input"
                value={source}
                onChange={(e) => setSource(e.target.value as 'all' | 'selected')}
                style={{ padding: '8px' }}
              >
                <option value="all">{t('modal_nesting.all')}</option>
                <option value="selected">{t('modal_nesting.selected')}</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="flex-between">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('modal_nesting.padding')}</label>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{padding.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                className="form-input"
                style={{ padding: 0 }}
                value={padding}
                onChange={(e) => setPadding(parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="flex-between">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('modal_nesting.edge')}</label>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{edgeBuffer.toFixed(0)} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                className="form-input"
                style={{ padding: 0 }}
                value={edgeBuffer}
                onChange={(e) => setEdgeBuffer(parseInt(e.target.value))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input 
                  type="checkbox"
                  checked={allowRotation}
                  onChange={e => setAllowRotation(e.target.checked)}
                />
                {t('modal_nesting.rotation')}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input 
                  type="checkbox"
                  checked={lockInnerObjects}
                  onChange={e => setLockInnerObjects(e.target.checked)}
                />
                {t('modal_nesting.locking')}
              </label>
            </div>
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>{t('modal_nesting.cancel')}</button>
          <button className="btn btn-cyan" onClick={handleNest} style={{ fontWeight: 'bold' }} disabled={isProcessing}>
            {isProcessing ? t('modal_nesting.processing') : t('modal_nesting.start')}
          </button>
        </div>
      </div>
    </div>
  );
};
