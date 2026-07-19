import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { canvasStore } from '../stores/canvasStore';

interface GridArrayModalProps {
  onClose: () => void;
}

export const GridArrayModal: React.FC<GridArrayModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [columns, setColumns] = useState(2);
  const [rows, setRows] = useState(2);
  const [spacingX, setSpacingX] = useState(5.0);
  const [spacingY, setSpacingY] = useState(5.0);

  const selectedObject = canvasStore.get().selectedObject;

  const handleApply = () => {
    window.dispatchEvent(new CustomEvent('canvasAction', {
      detail: {
        action: 'create-grid-array',
        columns,
        rows,
        spacingX,
        spacingY
      }
    }));
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{t('modal_grid.title', 'Matrix / Grid Array')}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!selectedObject ? (
            <div style={{ color: 'var(--accent-orange)' }}>
              {t('modal_grid.no_selection', 'Bitte wähle zuerst ein Objekt auf der Arbeitsfläche aus.')}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{t('modal_grid.cols', 'Spalten (X)')}</label>
                  <input type="number" className="form-input" min={1} max={50} value={columns} onChange={e => setColumns(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{t('modal_grid.rows', 'Zeilen (Y)')}</label>
                  <input type="number" className="form-input" min={1} max={50} value={rows} onChange={e => setRows(Number(e.target.value))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{t('modal_grid.spacing_x', 'Abstand X (mm)')}</label>
                  <input type="number" step="0.1" className="form-input" value={spacingX} onChange={e => setSpacingX(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{t('modal_grid.spacing_y', 'Abstand Y (mm)')}</label>
                  <input type="number" step="0.1" className="form-input" value={spacingY} onChange={e => setSpacingY(Number(e.target.value))} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px' }}>
          <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel', 'Abbrechen')}</button>
          <button className="btn btn-primary" onClick={handleApply} disabled={!selectedObject}>{t('common.apply', 'Erstellen')}</button>
        </div>
      </div>
    </div>
  );
};
