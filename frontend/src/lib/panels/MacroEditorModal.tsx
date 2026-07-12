import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { macroStore } from '../stores/macroStore';
import type { Macro } from '../stores/macroStore';

interface MacroEditorModalProps {
  macro?: Macro; // If provided, we are editing, otherwise creating
  onClose: () => void;
}

export const MacroEditorModal: React.FC<MacroEditorModalProps> = ({ macro, onClose }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(macro?.name || '');
  const [gcode, setGcode] = useState(macro?.gcode || '');
  const [hotkey, setHotkey] = useState(macro?.hotkey || '');
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      setError(t("modal_macro.error_no_name"));
      return;
    }
    if (!gcode.trim()) {
      setError(t("modal_macro.error_no_gcode"));
      return;
    }

    if (macro) {
      // Edit mode
      macroStore.updateMacro(macro.id, { name, gcode, hotkey: hotkey || undefined });
    } else {
      // Create mode
      macroStore.addMacro({ name, gcode, hotkey: hotkey || undefined });
    }
    onClose();
  };

  const handleRecordHotkey = () => {
    setRecording(true);
    setHotkey('');
    
    const recordListener = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');

      const key = e.key.toUpperCase();
      if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt') {
        parts.push(key);
        const hotkeyStr = parts.join('+');
        setHotkey(hotkeyStr);
        setRecording(false);
        window.removeEventListener('keydown', recordListener, true);
      }
    };

    window.addEventListener('keydown', recordListener, true);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '450px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{macro ? t('modal_macro.title_edit') : t('modal_macro.title_new')}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('modal_macro.name')}</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. 🚀 Air Assist Start"
              style={{ padding: '8px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('modal_macro.commands')}</label>
            <textarea
              className="form-input"
              value={gcode}
              onChange={(e) => setGcode(e.target.value)}
              placeholder="G90&#10;M8"
              rows={4}
              style={{ fontFamily: 'monospace', padding: '8px', fontSize: '12px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('modal_macro.hotkey')}</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                value={recording ? t('modal_macro.recording') : hotkey}
                readOnly
                placeholder={t('modal_macro.no_hotkey')}
                style={{ padding: '8px', flex: 1, backgroundColor: recording ? '#2a1a1a' : 'var(--bg-input)' }}
              />
              <button 
                className={`btn ${recording ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleRecordHotkey}
                disabled={recording}
                style={{ fontSize: '12px' }}
              >
                {recording ? t('modal_macro.recording') : t('modal_macro.assign')}
              </button>
              {hotkey && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setHotkey('')}
                  style={{ fontSize: '12px', padding: '8px' }}
                >
                  {t('modal_macro.clear')}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--accent-red)', fontSize: '11px', textAlign: 'center' }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>{t('modal_macro.cancel')}</button>
          <button className="btn btn-cyan" onClick={handleSave} style={{ fontWeight: 'bold' }}>
            {t('modal_macro.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
