import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../stores/store';
import { canvasStore } from '../stores/canvasStore';
import { settingsStore } from '../stores/settingsStore';
import { layersStore } from '../stores/layersStore';

export const PropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedObject } = useStore(canvasStore);
  const { units } = useStore(settingsStore);
  const { gridResolution } = useStore(canvasStore);

  const factor = units === 'inch' ? 25.4 : (units === 'cm' ? 10 : 1);

  // Lokaler State für Eingabefelder (speichert raw strings, um z.B. leere Felder oder Kommas zu erlauben)
  const [localValues, setLocalValues] = useState<any>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (selectedObject) {
      setLocalValues((prev: any) => {
        const dec = units === 'inch' ? 3 : 1;
        const next = { 
          width: Number((selectedObject.width / factor).toFixed(dec)).toString(),
          height: Number((selectedObject.height / factor).toFixed(dec)).toString(),
          x: Number((selectedObject.x / factor).toFixed(dec)).toString(),
          y: Number((selectedObject.y / factor).toFixed(dec)).toString(),
          angle: selectedObject.angle.toString(),
          overscan: selectedObject.overscan !== undefined ? selectedObject.overscan.toString() : '2.5',
          kerf: selectedObject.kerf !== undefined ? selectedObject.kerf.toString() : ''
        };
        // Behalte den aktuellen Eingabewert des fokussierten Feldes bei,
        // um Zurücksetzen während des Tippens zu verhindern
        if (prev && focusedField && prev[focusedField] !== undefined) {
          next[focusedField as keyof typeof next] = prev[focusedField];
        }
        return next;
      });
    } else {
      setLocalValues(null);
    }
  }, [selectedObject, factor, focusedField, units]);

  const handleUnitToggle = (newUnits: 'mm' | 'cm' | 'inch') => {
    settingsStore.updateSettings({ units: newUnits });
  };

  const handleChange = (field: string, value: string) => {
    setLocalValues((prev: any) => ({ ...prev, [field]: value }));
  };

  const applyChanges = (field: string, value: string) => {
    if (!selectedObject) return;
    let finalValue = parseFloat(value);
    
    // Fallback auf vorherigen Wert, wenn leer oder ungültig
    if (isNaN(finalValue)) {
      finalValue = selectedObject[field as keyof typeof selectedObject] as number;
      setLocalValues((prev: any) => ({ ...prev, [field]: finalValue.toString() }));
      return;
    }

    // Umrechnen auf mm für das Backend, wenn es Längenwerte sind
    if (['x', 'y', 'width', 'height'].includes(field)) {
       finalValue = finalValue * factor;
    }

    // Raster anwenden (Resolution)
    if (gridResolution > 0 && ['x', 'y', 'width', 'height'].includes(field)) {
      finalValue = Math.round(finalValue / gridResolution) * gridResolution;
    }

    window.dispatchEvent(new CustomEvent('updateActiveObject', { 
      detail: { [field]: finalValue } 
    }));
  };

  const handleBlur = (field: string) => {
    applyChanges(field, localValues[field]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      applyChanges(field, localValues[field]);
    }
  };

  // Debouncer: Nach 1 Sekunde ohne Tippen automatisch anwenden
  useEffect(() => {
    if (!localValues || !selectedObject) return;
    
    const timeout = setTimeout(() => {
      // Prüfe, ob sich Werte vom selectedObject unterscheiden
      Object.keys(localValues).forEach(field => {
        const localVal = parseFloat(localValues[field]);
        const objVal = selectedObject[field as keyof typeof selectedObject] as number;
        
        let expectedLocal = objVal;
        if (['x', 'y', 'width', 'height'].includes(field)) {
           expectedLocal = objVal / factor;
        }

        // Wenn der User etwas Neues getippt hat und 1 Sek. um ist
        if (!isNaN(localVal) && Math.abs(localVal - expectedLocal) > 0.001) {
          applyChanges(field, localValues[field]);
        }
      });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [localValues, factor]);

  const handleScaleChange = (scaleType: 'scaleX' | 'scaleY', percentageStr: string) => {
     const percent = parseFloat(percentageStr);
     if (isNaN(percent)) return;
     window.dispatchEvent(new CustomEvent('updateActiveObject', {
       detail: { [scaleType]: percent / 100 }
     }));
  };

  if (!selectedObject || !localValues) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dark)' }}>
        {t('properties.no_selection')}
      </div>
    );
  }

  return (
    <div className="properties-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* Einheit & Auflösung */}
      <div className="flex-between" style={{ backgroundColor: 'var(--bg-panel-header)', padding: '6px', borderRadius: '4px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            className={`btn ${units === 'mm' ? 'btn-cyan' : ''}`} 
            style={{ padding: '2px 8px', fontSize: '11px' }}
            onClick={() => handleUnitToggle('mm')}
          >
            mm
          </button>
          <button 
            className={`btn ${units === 'cm' ? 'btn-cyan' : ''}`} 
            style={{ padding: '2px 8px', fontSize: '11px' }}
            onClick={() => handleUnitToggle('cm')}
          >
            cm
          </button>
          <button 
            className={`btn ${units === 'inch' ? 'btn-cyan' : ''}`} 
            style={{ padding: '2px 8px', fontSize: '11px' }}
            onClick={() => handleUnitToggle('inch')}
          >
            inch
          </button>
        </div>
      </div>

      <div style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t('properties.type')} {selectedObject.data?.barcode ? 'barcode' : selectedObject.type}</span>
      </div>

      {/* Barcode Eigenschaften Editor */}
      {selectedObject.data?.barcode && (
        <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Barcode-Schnittstelle</div>
          
          <div className="form-group" style={{ marginBottom: '5px' }}>
            <label className="form-label" style={{ fontSize: '11px' }}>{t('properties.barcode_type', 'Barcode-Typ')}</label>
            <select
              className="form-input"
              value={selectedObject.data.barcode.bcid}
              onChange={(e) => {
                window.dispatchEvent(new CustomEvent('updateBarcodeProperties', {
                  detail: { bcid: e.target.value }
                }));
              }}
              style={{ padding: '6px', fontSize: '12px' }}
            >
              <option value="qrcode">QR-Code (2D)</option>
              <option value="datamatrix">DataMatrix (2D)</option>
              <option value="pdf417">PDF417 (2D)</option>
              <option value="code128">Code 128 (1D)</option>
              <option value="ean13">EAN-13 (1D)</option>
              <option value="code39">Code 39 (1D)</option>
              <option value="aruco">ArUco Marker</option>
              <option value="apriltag36h11">AprilTag (36h11)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '5px' }}>
            <label className="form-label" style={{ fontSize: '11px' }}>{t('properties.barcode_content', 'Inhalt / Template')}</label>
            <input
              type="text"
              className="form-input"
              value={selectedObject.data.barcode.template}
              onChange={(e) => {
                window.dispatchEvent(new CustomEvent('updateBarcodeProperties', {
                  detail: { template: e.target.value }
                }));
              }}
              style={{ padding: '6px', fontSize: '12px', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px' }}>{t('properties.barcode_scale', 'Skalierung')}</label>
              <input
                type="number"
                className="form-input"
                value={selectedObject.data.barcode.scale || 3}
                min={1}
                max={10}
                onChange={(e) => {
                  window.dispatchEvent(new CustomEvent('updateBarcodeProperties', {
                    detail: { scale: Number(e.target.value) }
                  }));
                }}
                style={{ padding: '6px', fontSize: '12px' }}
              />
            </div>
            {!['qrcode', 'datamatrix'].includes(selectedObject.data.barcode.bcid) && (
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>{t('properties.barcode_height', 'Strichhöhe')}</label>
                <input
                  type="number"
                  className="form-input"
                  value={selectedObject.data.barcode.height || 10}
                  min={5}
                  max={50}
                  onChange={(e) => {
                    window.dispatchEvent(new CustomEvent('updateBarcodeProperties', {
                      detail: { height: Number(e.target.value) }
                    }));
                  }}
                  style={{ padding: '6px', fontSize: '12px' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Variabler Text Editor */}
      {['text', 'i-text'].includes(selectedObject.type?.toLowerCase()) && (
        <div style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('properties.var_text', 'Variabler Text (Template)')}</div>
          <textarea
            value={selectedObject.text || ''}
            onChange={(e) => {
              window.dispatchEvent(new CustomEvent('updateActiveObject', {
                detail: { text: e.target.value }
              }));
            }}
            rows={2}
            style={{ width: '100%', padding: '6px', fontSize: '12px', fontFamily: 'monospace', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', resize: 'vertical' }}
            placeholder={t('properties.var_text_placeholder', 'z.B. Seriennr: {serial:0001}')}
          />
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Tokens: {'{serial:0001}'}, {'{date:yyyy-MM-dd}'}, {'{time:HH:mm}'}, {'{week}'}, {'{csv:Spalte}'}
          </div>
        </div>
      )}

      {/* Ebene (Layer) Zuweisung */}
      <div className="form-group" style={{ marginBottom: '5px' }}>
        <label className="form-label" style={{ fontSize: '11px', fontWeight: '600' }}>{t('properties.layer', 'Ebene (Farbe / Gravur- & Schneidstärke)')}</label>
        <select
          className="form-input"
          value={selectedObject.layerId || 'C00'}
          onChange={(e) => {
            const newLayerId = e.target.value;
            window.dispatchEvent(new CustomEvent('changeLayer', {
              detail: { layerId: newLayerId }
            }));
          }}
          style={{ padding: '6px', fontSize: '12px', fontWeight: 'bold' }}
        >
          {Object.values(layersStore.get()).map((layer) => (
            <option key={layer.id} value={layer.id}>
              🎨 {layer.name.split(' ')[0]} - {layer.mode === 'fill' ? 'Füllen (Engrave)' : 'Linie (Cut)'} ({layer.speed} mm/min, {layer.power}%)
            </option>
          ))}
        </select>
      </div>

      {/* Dimensionen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-group">
          <label className="form-label">{t('properties.width')} ({units})</label>
          <input 
            type="text" 
            className="form-input" 
            value={localValues.width}
            onChange={(e) => handleChange('width', e.target.value)}
            onFocus={() => setFocusedField('width')}
            onBlur={() => {
              setFocusedField(null);
              handleBlur('width');
            }}
            onKeyDown={(e) => handleKeyDown(e, 'width')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">{t('properties.height')} ({units})</label>
          <input 
            type="text" 
            className="form-input" 
            value={localValues.height}
            onChange={(e) => handleChange('height', e.target.value)}
            onFocus={() => setFocusedField('height')}
            onBlur={() => {
              setFocusedField(null);
              handleBlur('height');
            }}
            onKeyDown={(e) => handleKeyDown(e, 'height')}
          />
        </div>
      </div>

      {/* Skalierung in Prozent (virtuell berechnet) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-group">
          <label className="form-label">{t('properties.scale_x')}</label>
          <input 
            type="number" 
            className="form-input" 
            placeholder="100"
            onBlur={(e) => handleScaleChange('scaleX', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">{t('properties.scale_y')}</label>
          <input 
            type="number" 
            className="form-input" 
            placeholder="100"
            onBlur={(e) => handleScaleChange('scaleY', e.target.value)}
          />
        </div>
      </div>

      {/* Position */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-group">
          <label className="form-label">{t('properties.pos_x')} ({units})</label>
          <input 
            type="text" 
            className="form-input" 
            value={localValues.x}
            onChange={(e) => handleChange('x', e.target.value)}
            onFocus={() => setFocusedField('x')}
            onBlur={() => {
              setFocusedField(null);
              handleBlur('x');
            }}
            onKeyDown={(e) => handleKeyDown(e, 'x')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">{t('properties.pos_y')} ({units})</label>
          <input 
            type="text" 
            className="form-input" 
            value={localValues.y}
            onChange={(e) => handleChange('y', e.target.value)}
            onFocus={() => setFocusedField('y')}
            onBlur={() => {
              setFocusedField(null);
              handleBlur('y');
            }}
            onKeyDown={(e) => handleKeyDown(e, 'y')}
          />
        </div>
      </div>

      {/* Drehung */}
      <div className="form-group">
        <label className="form-label">{t('properties.angle')}</label>
        <input 
          type="text" 
          className="form-input" 
          value={localValues.angle}
          onChange={(e) => handleChange('angle', e.target.value)}
          onFocus={() => setFocusedField('angle')}
          onBlur={() => {
            setFocusedField(null);
            handleBlur('angle');
          }}
          onKeyDown={(e) => handleKeyDown(e, 'angle')}
        />
      </div>

      {/* Schnittbreitenkorrektur (Kerf Compensation) */}
      {selectedObject.type !== 'image' && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>
            {t('properties.kerf', 'Schnittbreitenkorrektur (Kerf)')}
          </div>
          <div className="form-row" style={{ gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">{t('properties.kerf_dir', 'Richtung')}</label>
              <select
                className="form-input"
                value={selectedObject.kerfMode || 'none'}
                onChange={(e) => {
                  window.dispatchEvent(new CustomEvent('updateActiveObject', {
                    detail: { kerfMode: e.target.value }
                  }));
                }}
              >
                <option value="none">Keine Korrektur</option>
                <option value="outer">Außen (Bauteil)</option>
                <option value="inner">Innen (Loch)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('properties.kerf_width', 'Breite (mm)')}</label>
              <input
                type="text"
                className="form-input"
                value={localValues.kerf || ''}
                placeholder="Layer-Kerf"
                onChange={(e) => handleChange('kerf', e.target.value)}
                onFocus={() => setFocusedField('kerf')}
                onBlur={() => {
                  setFocusedField(null);
                  handleBlur('kerf');
                }}
                onKeyDown={(e) => handleKeyDown(e, 'kerf')}
              />
            </div>
          </div>
        </div>
      )}

      {selectedObject.type === 'image' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--cyan)' }}>
            {t('properties.image_prep', 'Bild-Vorbereitung (Laser)')}
          </div>

          {/* Mode Dropdown */}
          <div className="form-group">
            <label className="form-label">{t('properties.image_mode', 'Modus')}</label>
            <select
              className="form-input"
              value={selectedObject.imageMode || 'grayscale'}
              onChange={(e) => {
                window.dispatchEvent(new CustomEvent('updateActiveObject', {
                  detail: { imageMode: e.target.value }
                }));
              }}
            >
              <option value="grayscale">Graustufen (Grayscale)</option>
              <option value="dither">Dithering (Rasterung)</option>
              <option value="threshold">Schwellenwert (Threshold)</option>
            </select>
          </div>

          {/* Dither Type Dropdown */}
          {selectedObject.imageMode === 'dither' && (
            <div className="form-group">
              <label className="form-label">{t('properties.image_dither', 'Dithering-Algorithmus')}</label>
              <select
                className="form-input"
                value={selectedObject.ditherType || 'floyd-steinberg'}
                onChange={(e) => {
                  window.dispatchEvent(new CustomEvent('updateActiveObject', {
                    detail: { ditherType: e.target.value }
                  }));
                }}
              >
                <option value="floyd-steinberg">Floyd-Steinberg</option>
                <option value="atkinson">Atkinson (Mac-Style)</option>
                <option value="stucki">Stucki (Fein)</option>
                <option value="jarvis">Jarvis-Judice-Ninke</option>
              </select>
            </div>
          )}

          {/* Brightness Slider */}
          <div className="form-group">
            <div className="flex-between">
              <label className="form-label">{t('properties.brightness', 'Helligkeit')}</label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedObject.brightness || 0}</span>
            </div>
            <input
              type="range"
              min="-255"
              max="255"
              className="form-input"
              style={{ padding: 0 }}
              value={selectedObject.brightness || 0}
              onChange={(e) => {
                window.dispatchEvent(new CustomEvent('updateActiveObject', {
                  detail: { brightness: parseInt(e.target.value) }
                }));
              }}
            />
          </div>

          {/* Contrast Slider */}
          <div className="form-group">
            <div className="flex-between">
              <label className="form-label">{t('properties.contrast', 'Kontrast')}</label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedObject.contrast || 0}</span>
            </div>
            <input
              type="range"
              min="-255"
              max="255"
              className="form-input"
              style={{ padding: 0 }}
              value={selectedObject.contrast || 0}
              onChange={(e) => {
                window.dispatchEvent(new CustomEvent('updateActiveObject', {
                  detail: { contrast: parseInt(e.target.value) }
                }));
              }}
            />
          </div>

          {/* Gamma Slider */}
          <div className="form-group">
            <div className="flex-between">
              <label className="form-label">{t('properties.gamma', 'Gamma')}</label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{(selectedObject.gamma || 1.0).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              className="form-input"
              style={{ padding: 0 }}
              value={selectedObject.gamma || 1.0}
              onChange={(e) => {
                window.dispatchEvent(new CustomEvent('updateActiveObject', {
                  detail: { gamma: parseFloat(e.target.value) }
                }));
              }}
            />
          </div>

          {/* Threshold Slider (Only for threshold or dither) */}
          {(selectedObject.imageMode === 'threshold' || selectedObject.imageMode === 'dither') && (
            <div className="form-group">
              <div className="flex-between">
                <label className="form-label">{t('properties.threshold', 'Schwellenwert')}</label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedObject.thresholdValue || 128}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                className="form-input"
                style={{ padding: 0 }}
                value={selectedObject.thresholdValue || 128}
                onChange={(e) => {
                  window.dispatchEvent(new CustomEvent('updateActiveObject', {
                    detail: { thresholdValue: parseInt(e.target.value) }
                  }));
                }}
              />
            </div>
          )}

          {/* Overscan Input */}
          <div className="form-group">
            <label className="form-label">{t('properties.overscan', 'Overscan (mm)')}</label>
            <input
              type="text"
              className="form-input"
              value={localValues.overscan || ''}
              onChange={(e) => handleChange('overscan', e.target.value)}
              onBlur={() => handleBlur('overscan')}
              onKeyDown={(e) => handleKeyDown(e, 'overscan')}
            />
          </div>

          {/* Invert Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="invert-colors-checkbox"
              checked={selectedObject.invert || false}
              onChange={(e) => {
                window.dispatchEvent(new CustomEvent('updateActiveObject', {
                  detail: { invert: e.target.checked }
                }));
              }}
            />
            <label htmlFor="invert-colors-checkbox" style={{ fontSize: '12px', userSelect: 'none', cursor: 'pointer' }}>
              {t('properties.invert', 'Farben invertieren')}
            </label>
          </div>

        </div>
      )}

    </div>
  );
};
