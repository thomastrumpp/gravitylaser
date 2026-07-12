import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../stores/store';
import { macroStore } from '../stores/macroStore';
import type { Macro } from '../stores/macroStore';
import { MacroEditorModal } from './MacroEditorModal';
import { connectionStore } from '../stores/connectionStore';

export const MacroPanel: React.FC = () => {
  const { t } = useTranslation();
  const { macros, selectedMacroId } = useStore(macroStore);
  const { connected } = useStore(connectionStore);
  const [editorMacro, setEditorMacro] = useState<Macro | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleSelect = (id: string) => {
    macroStore.selectMacro(selectedMacroId === id ? null : id);
  };

  const handleDoubleClick = (macro: Macro) => {
    setEditorMacro(macro);
    setIsEditorOpen(true);
  };

  const handleAddMacro = () => {
    setEditorMacro(undefined);
    setIsEditorOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(t('modal_macro.confirm_delete'))) {
      macroStore.deleteMacro(id);
    }
  };

  const handleExecute = () => {
    if (!selectedMacroId) return;
    macroStore.executeMacro(selectedMacroId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '10px', backgroundColor: 'var(--bg-panel)' }}>
      <div className="flex-between">
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('modal_macro.panel_title')}</span>
        <button className="btn btn-secondary" onClick={handleAddMacro} style={{ fontSize: '11px', padding: '2px 6px' }}>
          ➕ {t('modal_macro.add')}
        </button>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.3' }}>
        💡 <b>{t('modal_macro.click_select')}</b><br />
        💡 <b>{t('modal_macro.double_click_edit')}</b><br />
        ⚠️ <b>{t('modal_macro.safety_warning')}</b>
      </p>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', backgroundColor: 'var(--bg-panel-header)' }}>
        {macros.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            {t('modal_macro.no_macros')}
          </div>
        ) : (
          macros.map((m) => {
            const isSelected = selectedMacroId === m.id;
            return (
              <div
                key={m.id}
                onClick={() => handleSelect(m.id)}
                onDoubleClick={() => handleDoubleClick(m)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  border: isSelected ? '1px solid var(--cyan)' : '1px solid transparent',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}>{m.name}</span>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {m.gcode.split('\n')[0]}{m.gcode.split('\n').length > 1 ? ' ...' : ''}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {m.hotkey && (
                    <span style={{ fontSize: '9px', backgroundColor: 'var(--bg-active)', border: '1px solid var(--border-color)', color: 'var(--cyan)', padding: '2px 4px', borderRadius: '3px', fontFamily: 'monospace' }}>
                      {m.hotkey}
                    </span>
                  )}
                  {/* Prevent deleting preset macros */}
                  {!['home', 'unlock', 'air-on', 'air-off', 'laser-test'].includes(m.id) && (
                    <button
                      className="tab-btn"
                      onClick={(e) => handleDelete(e, m.id)}
                      title={t('modal_macro.delete')}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--accent-red)' }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Execute bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
        <button
          className="btn btn-cyan"
          disabled={!selectedMacroId || !connected}
          onClick={handleExecute}
          style={{
            fontWeight: 'bold',
            padding: '10px',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            width: '100%',
            opacity: selectedMacroId && connected ? 1 : 0.5
          }}
        >
          ⚡ Ausgewähltes Makro Ausführen
        </button>
        {!connected && selectedMacroId && (
          <span style={{ fontSize: '10px', color: 'var(--accent-red)', textAlign: 'center' }}>
            Bitte verbinden Sie den Laser, um das Makro auszuführen.
          </span>
        )}
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <MacroEditorModal
          macro={editorMacro}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
};
