import React, { useState } from 'react';
import { useStore } from '../stores/store';
import { canvasStore } from '../stores/canvasStore';

export const TopToolbar: React.FC = () => {
  const selectedObject = useStore(canvasStore);

  const isText = selectedObject.selectedObject?.type?.toLowerCase() === 'i-text' || selectedObject.selectedObject?.type?.toLowerCase() === 'text';

  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(24);

  // Aktualisiere lokale State wenn neues Objekt ausgewählt
  React.useEffect(() => {
    if (isText && selectedObject.selectedObject) {
      setFontFamily((selectedObject.selectedObject as any).fontFamily || 'Inter');
      setFontSize((selectedObject.selectedObject as any).fontSize || 24);
    }
  }, [selectedObject.selectedObject, isText]);

  const handleFontChange = (newFamily: string, newSize: number) => {
    setFontFamily(newFamily);
    setFontSize(newSize);
    window.dispatchEvent(new CustomEvent('canvasAction', { 
      detail: { action: 'update-text', fontFamily: newFamily, fontSize: newSize } 
    }));
  };


  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      backgroundColor: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border-color)',
      minHeight: '40px'
    }}>
      {/* Text Werkzeuge (nur sichtbar bei Textauswahl) */}
      {isText && (
        <div style={{ display: 'flex', gap: '4px', paddingRight: '12px', borderRight: '1px solid var(--border-color)', alignItems: 'center' }}>
          <select 
            className="input-field" 
            style={{ padding: '4px', fontSize: '12px', width: '120px' }}
            value={fontFamily}
            onChange={(e) => handleFontChange(e.target.value, fontSize)}
          >
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="Verdana">Verdana</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Comic Sans MS">Comic Sans MS</option>
            <option value="Impact">Impact</option>
            <option value="Georgia">Georgia</option>
            <option value="Trebuchet MS">Trebuchet MS</option>
            <option value="Lucida Console">Lucida Console</option>
          </select>
          <input 
            type="number" 
            className="input-field" 
            style={{ width: '60px', padding: '4px', fontSize: '12px', textAlign: 'center' }}
            value={fontSize}
            min={1}
            max={500}
            onChange={(e) => handleFontChange(fontFamily, Number(e.target.value))}
            title="Schriftgröße"
          />
        </div>
      )}

      {/* Assistenten */}
      <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'grid-array' } }))}
          style={{ fontSize: '12px', padding: '4px 8px' }}
          disabled={!selectedObject.selectedObject}
          title="Raster aus dem ausgewählten Objekt erstellen"
        >
          ⚄ Grid Array
        </button>
      </div>
    </div>
  );
};
