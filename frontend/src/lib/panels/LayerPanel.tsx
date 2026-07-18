import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../stores/store';
import { layersStore, type LayerSettings } from '../stores/layersStore';
import { canvasStore } from '../stores/canvasStore';
import { settingsStore } from '../stores/settingsStore';
import { MATERIALS } from '../stores/materialStore';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export const LayerPanel: React.FC = () => {
  const { t } = useTranslation();
  const layers = useStore(layersStore);
  const settings = useStore(settingsStore);
  
  // Lokaler Zustand für die ausgewählte Ebene im Editor
  const [selectedLayerId, setSelectedLayerId] = useState<string>('C00');
  const selectedLayer = layers[selectedLayerId];

  const handleLayerSelect = (id: string) => {
    setSelectedLayerId(id);
    canvasStore.setActiveLayer(id); // Setzt auch das aktive Zeichen-Layer
    window.dispatchEvent(new CustomEvent('changeLayer', { detail: { layerId: id } }));
  };

  const handleUpdate = (updates: Partial<LayerSettings>) => {
    layersStore.updateLayer(selectedLayerId, updates);
  };

  const [localSpeed, setLocalSpeed] = useState('');
  const [localPower, setLocalPower] = useState('');
  const [localPasses, setLocalPasses] = useState('');
  const [localThickness, setLocalThickness] = useState('');

  useEffect(() => {
    if (selectedLayer) {
      setLocalSpeed(selectedLayer.speed.toString());
      setLocalPower(selectedLayer.power.toString());
      setLocalPasses(selectedLayer.passes.toString());
    }
  }, [selectedLayerId, selectedLayer?.speed, selectedLayer?.power, selectedLayer?.passes]);

  useEffect(() => {
    setLocalThickness(settings.materialThickness.toString());
  }, [settings.materialThickness]);

  const isPresetMode = selectedLayer && (selectedLayer.presetMode === 'engrave' || selectedLayer.presetMode === 'cut');
  const activeMaterial = MATERIALS[settings.selectedMaterialId];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 0. Globales Material-Profil */}
      <div className="sidebar-section" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="section-header">
          <span className="section-title">🪵 {t('layers.material_profile', 'Material-Profil')}</span>
        </div>
        <div className="section-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div className="form-group" style={{ flex: activeMaterial && activeMaterial.supportedOps.includes('cut') ? 1.8 : 1, marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px' }}>{t('layers.material', 'Material')}</label>
              <select
                className="form-input"
                value={settings.selectedMaterialId}
                onChange={(e) => settingsStore.updateSettings({ selectedMaterialId: e.target.value })}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  height: '30px'
                }}
              >
                {Object.values(MATERIALS).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            
            {activeMaterial && activeMaterial.supportedOps.includes('cut') && (
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px' }} title={t('layers.thickness', 'Materialstärke (mm)')}>{t('layers.thickness_short', 'Dicke (mm)')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={localThickness}
                  style={{ fontSize: '12px', padding: '6px', height: '30px' }}
                  onChange={(e) => {
                    setLocalThickness(e.target.value);
                    const parsed = parseFloat(e.target.value.replace(',', '.'));
                    if (!isNaN(parsed) && parsed >= 0) {
                      settingsStore.updateSettings({ materialThickness: parsed });
                    }
                  }}
                  onBlur={() => {
                    if (localThickness === '' || isNaN(parseFloat(localThickness))) {
                      setLocalThickness(settings.materialThickness.toString());
                    }
                  }}
                />
              </div>
            )}
          </div>

          {activeMaterial?.notes && (
            <div style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              padding: '4px 8px',
              borderRadius: '4px',
              borderLeft: '3px solid var(--primary-color)',
              lineHeight: '1.3'
            }}>
              💡 {activeMaterial.notes}
            </div>
          )}
        </div>
      </div>

      {/* 1. Liste aller Ebenen (Mittlerer Teil) */}
      <div className="sidebar-section" style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="section-content" style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-panel-header)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '6px 8px' }}>{t('layers.layer')}</th>
                <th style={{ padding: '6px 8px' }}>{t('layers.mode')}</th>
                <th style={{ padding: '6px 8px' }}>{t('layers.speed')}</th>
                <th style={{ padding: '6px 8px' }}>{t('layers.power')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>{t('layers.output')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(layers).map((layer) => (
                <tr
                  key={layer.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: selectedLayerId === layer.id ? 'var(--bg-active)' : 'transparent',
                    borderLeft: selectedLayerId === layer.id ? `3px solid ${layer.color}` : '3px solid transparent'
                  }}
                  onClick={() => handleLayerSelect(layer.id)}
                >
                  <td style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', backgroundColor: layer.color, borderRadius: '2px', border: '1px solid #555' }} />
                    <span style={{ fontWeight: selectedLayerId === layer.id ? 'bold' : 'normal' }}>{layer.id}</span>
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{ fontWeight: 'bold' }}>{layer.mode === 'line' ? 'Linie' : 'Füllen'}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>
                      {layer.presetMode === 'engrave' ? '(Gravur)' : layer.presetMode === 'cut' ? '(Schnitt)' : '(Manuell)'}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{layer.speed}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{layer.power}%</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={layer.output}
                      onChange={(e) => layersStore.updateLayer(layer.id, { output: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Parameter-Editor für die gewählte Ebene (Unterer Teil) */}
      <div className="sidebar-section" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="section-header">
          <span className="section-title">⚙️ {t('layers.settings_for', 'Einstellungen für')} {selectedLayerId}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: selectedLayer?.color, borderRadius: '3px' }} />
          </div>
        </div>

        <div className="section-content">
          {selectedLayer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* WEICHE: Kombi-Modus (Sub-Layers) vs. Standard-Modus */}
              {selectedLayer.subLayers && selectedLayer.subLayers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="form-label" style={{ margin: 0, color: 'var(--accent-cyan)' }}>🥞 {t('layers.combo_mode', 'Kombi-Modus (Sub-Layers)')}</span>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '2px 6px', fontSize: '9px' }}
                      onClick={() => layersStore.updateLayer(selectedLayerId, { subLayers: undefined })}
                      title={t('layers.combo_deactivate_tooltip', 'Deaktiviert alle Sub-Layer und kehrt zum manuellen Modus zurück')}
                    >
                      {t('layers.deactivate', 'Deaktivieren')}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {selectedLayer.subLayers.map((sl, idx) => (
                      <div
                        key={sl.id}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                            Sub-Layer #{idx + 1}
                          </span>
                          
                          {/* Steuerungstools (Up, Down, Delete) */}
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              className="btn"
                              style={{ padding: '2px', width: '20px', height: '20px' }}
                              disabled={idx === 0}
                              onClick={() => {
                                const list = [...selectedLayer.subLayers!];
                                const temp = list[idx];
                                list[idx] = list[idx - 1];
                                list[idx - 1] = temp;
                                layersStore.updateLayer(selectedLayerId, { subLayers: list });
                              }}
                            >
                              <ArrowUp size={10} />
                            </button>
                            <button
                              className="btn"
                              style={{ padding: '2px', width: '20px', height: '20px' }}
                              disabled={idx === selectedLayer.subLayers!.length - 1}
                              onClick={() => {
                                const list = [...selectedLayer.subLayers!];
                                const temp = list[idx];
                                list[idx] = list[idx + 1];
                                list[idx + 1] = temp;
                                layersStore.updateLayer(selectedLayerId, { subLayers: list });
                              }}
                            >
                              <ArrowDown size={10} />
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '2px', width: '20px', height: '20px', backgroundColor: 'var(--accent-red)' }}
                              onClick={() => layersStore.deleteSubLayer(selectedLayerId, sl.id)}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>

                        {/* Modus Dropdown */}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <select
                            className="form-input"
                            value={sl.mode}
                            onChange={(e) => layersStore.updateSubLayer(selectedLayerId, sl.id, { mode: e.target.value as any })}
                            style={{ fontSize: '11px', padding: '4px', height: '26px' }}
                          >
                            <option value="line">Line (Schnitt/Outline)</option>
                            <option value="fill">Fill (Rastergravur)</option>
                            <option value="offset_fill">Offset Fill (Pocket-Spirale)</option>
                          </select>
                        </div>

                        {/* Parameter Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                          <div>
                            <span style={{ fontSize: '8px', textTransform: 'uppercase', color: 'var(--text-dark)' }}>Speed</span>
                            <input
                              type="number"
                              className="form-input"
                              value={sl.speed}
                              onChange={(e) => layersStore.updateSubLayer(selectedLayerId, sl.id, { speed: parseInt(e.target.value) || 0 })}
                              style={{ fontSize: '11px', padding: '3px 6px', height: '24px' }}
                            />
                          </div>
                          <div>
                            <span style={{ fontSize: '8px', textTransform: 'uppercase', color: 'var(--text-dark)' }}>Power %</span>
                            <input
                              type="number"
                              className="form-input"
                              value={sl.power}
                              onChange={(e) => layersStore.updateSubLayer(selectedLayerId, sl.id, { power: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                              style={{ fontSize: '11px', padding: '3px 6px', height: '24px' }}
                            />
                          </div>
                          <div>
                            <span style={{ fontSize: '8px', textTransform: 'uppercase', color: 'var(--text-dark)' }}>Passes</span>
                            <input
                              type="number"
                              className="form-input"
                              value={sl.passes}
                              onChange={(e) => layersStore.updateSubLayer(selectedLayerId, sl.id, { passes: Math.max(1, parseInt(e.target.value) || 1) })}
                              style={{ fontSize: '11px', padding: '3px 6px', height: '24px' }}
                            />
                          </div>
                        </div>

                        {/* Air Assist Checkbox */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px', marginTop: '2px' }}>
                          <input
                            type="checkbox"
                            checked={sl.airAssist}
                            onChange={(e) => layersStore.updateSubLayer(selectedLayerId, sl.id, { airAssist: e.target.checked })}
                          />
                          <span>🌬️ Air Assist (M8)</span>
                        </label>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '4px', fontSize: '11px' }}
                    onClick={() => layersStore.addSubLayer(selectedLayerId, {
                      mode: 'line',
                      speed: 3000,
                      power: 50,
                      passes: 1,
                      airAssist: true
                    })}
                  >
                    <Plus size={12} style={{ marginRight: '4px' }} /> {t('layers.add_sublayer', 'Weiteren Sub-Layer hinzufügen')}
                  </button>

                  <div className="form-group" style={{ marginTop: '4px' }}>
                    <label className="flex-row" style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                      <input
                        type="checkbox"
                        checked={selectedLayer.output}
                        onChange={(e) => handleUpdate({ output: e.target.checked })}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>📤 {t('layers.output')}</span>
                    </label>
                  </div>
                </div>
              ) : (
                /* STANDARD MODUS */
                <>
                  {/* Modus Auswahl */}
                  <div className="form-group">
                    <label className="form-label" title={t('layers.graphic_mode_tooltip', 'Bestimmt, ob das Objekt nur umrandet oder flächig gelasert wird')}>🎨 {t('layers.graphic_mode', 'Grafik-Modus (Pfaderzeugung)')}</label>
                    <div className="form-row">
                      <button
                        className={`btn ${selectedLayer.mode === 'line' ? 'btn-cyan' : ''}`}
                        onClick={() => handleUpdate({ mode: 'line' })}
                      >
                        ✏️ {t('layers.line_outline', 'Linie (Outline)')}
                      </button>
                      <button
                        className={`btn ${selectedLayer.mode === 'fill' ? 'btn-cyan' : ''}`}
                        onClick={() => handleUpdate({ mode: 'fill' })}
                        disabled={selectedLayer.presetMode === 'cut'}
                        title={selectedLayer.presetMode === 'cut' ? t('layers.fill_disabled_cut', "Füllen ist im Schneide-Modus nicht verfügbar") : ""}
                      >
                        🎨 {t('layers.fill_raster', 'Füllen (Raster)')}
                      </button>
                    </div>
                  </div>

                  {/* Parameter-Modus */}
                  <div className="form-group">
                    <label className="form-label" title={t('layers.laser_parameters_tooltip', 'Automatische Laser-Parameter basierend auf dem gewählten Material')}>⚙️ {t('layers.laser_parameters', 'Laser-Parameter')}</label>
                    <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                      <button
                        className={`btn ${selectedLayer.presetMode === 'engrave' ? 'btn-cyan' : ''}`}
                        onClick={() => {
                          layersStore.setLayerPresetMode(selectedLayerId, 'engrave');
                        }}
                        style={{ flex: 1, padding: '6px 2px', fontSize: '10px' }}
                        title={t('layers.engrave_tooltip', 'Graviereinstellungen des Materials verwenden')}
                        disabled={!activeMaterial?.supportedOps.includes('engrave')}
                      >
                        🪵 {t('layers.engrave', 'Gravieren')}
                      </button>
                      <button
                        className={`btn ${selectedLayer.presetMode === 'cut' ? 'btn-cyan' : ''}`}
                        onClick={() => {
                          layersStore.setLayerPresetMode(selectedLayerId, 'cut');
                          handleUpdate({ mode: 'line' }); // Schneiden ist immer Linie
                        }}
                        style={{ flex: 1, padding: '6px 2px', fontSize: '10px' }}
                        title={t('layers.cut_tooltip', 'Schneideinstellungen des Materials verwenden')}
                        disabled={!activeMaterial?.supportedOps.includes('cut')}
                      >
                        ✂️ {t('layers.cut', 'Schneiden')}
                      </button>
                      <button
                        className={`btn ${selectedLayer.presetMode === 'manual' || !selectedLayer.presetMode ? 'btn-cyan' : ''}`}
                        onClick={() => layersStore.setLayerPresetMode(selectedLayerId, 'manual')}
                        style={{ flex: 1, padding: '6px 2px', fontSize: '10px' }}
                        title={t('layers.manual_tooltip', 'Parameter manuell anpassen')}
                      >
                        🛠️ {t('layers.manual', 'Manuell')}
                      </button>
                    </div>
                  </div>

                  {/* Parameter: Geschwindigkeit, Leistung & Durchgänge in einer Zeile */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '9px', marginBottom: '2px' }}>{t('layers.speed_short', 'Geschw.')}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={localSpeed}
                        disabled={isPresetMode}
                        style={{
                          fontSize: '11px',
                          padding: '4px 6px',
                          height: '26px',
                          backgroundColor: isPresetMode ? 'rgba(255,255,255,0.02)' : 'var(--bg-input)',
                          color: isPresetMode ? 'var(--text-muted)' : 'var(--text-color)',
                          cursor: isPresetMode ? 'not-allowed' : 'text'
                        }}
                        onChange={(e) => {
                          setLocalSpeed(e.target.value);
                          const parsed = parseInt(e.target.value);
                          if (!isNaN(parsed) && parsed >= 0) {
                            handleUpdate({ speed: parsed });
                          }
                        }}
                        onBlur={() => {
                          if (localSpeed === '' || isNaN(parseInt(localSpeed))) {
                            setLocalSpeed(selectedLayer.speed.toString());
                          }
                        }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '9px', marginBottom: '2px' }}>{t('layers.power_short', 'Leist. %')}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={localPower}
                        disabled={isPresetMode}
                        style={{
                          fontSize: '11px',
                          padding: '4px 6px',
                          height: '26px',
                          backgroundColor: isPresetMode ? 'rgba(255,255,255,0.02)' : 'var(--bg-input)',
                          color: isPresetMode ? 'var(--text-muted)' : 'var(--text-color)',
                          cursor: isPresetMode ? 'not-allowed' : 'text'
                        }}
                        onChange={(e) => {
                          setLocalPower(e.target.value);
                          const parsed = parseInt(e.target.value);
                          if (!isNaN(parsed) && parsed >= 0) {
                            handleUpdate({ power: Math.min(100, Math.max(0, parsed)) });
                          }
                        }}
                        onBlur={() => {
                          if (localPower === '' || isNaN(parseInt(localPower))) {
                            setLocalPower(selectedLayer.power.toString());
                          }
                        }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '9px', marginBottom: '2px' }}>{t('layers.passes_short', 'Durchg.')}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={localPasses}
                        disabled={isPresetMode}
                        style={{
                          fontSize: '11px',
                          padding: '4px 6px',
                          height: '26px',
                          backgroundColor: isPresetMode ? 'rgba(255,255,255,0.02)' : 'var(--bg-input)',
                          color: isPresetMode ? 'var(--text-muted)' : 'var(--text-color)',
                          cursor: isPresetMode ? 'not-allowed' : 'text'
                        }}
                        onChange={(e) => {
                          setLocalPasses(e.target.value);
                          const parsed = parseInt(e.target.value);
                          if (!isNaN(parsed) && parsed >= 1) {
                            handleUpdate({ passes: parsed });
                          }
                        }}
                        onBlur={() => {
                          if (localPasses === '' || isNaN(parseInt(localPasses))) {
                            setLocalPasses(selectedLayer.passes.toString());
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Erläuterungstexte für Voreinstellungen */}
                  {selectedLayer.presetMode === 'engrave' && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      🔒 Profil "{activeMaterial?.name}" (Gravieren) aktiv.
                    </div>
                  )}
                  {selectedLayer.presetMode === 'cut' && (
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '2px' }}>
                      <span>🔒 Profil "{activeMaterial?.name}" (Schneiden) aktiv.</span>
                      <span style={{ opacity: 0.8 }}>
                        Dicke ({settings.materialThickness}mm) / Pass-Tiefe ({activeMaterial?.maxDepthPerPass}mm) = {selectedLayer.passes} Durchgänge.
                      </span>
                    </div>
                  )}

                  {/* Checkboxen in einer Zeile */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <label className="flex-row" style={{ cursor: isPresetMode ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '500', gap: '4px' }}>
                        <input
                          type="checkbox"
                          checked={selectedLayer.airAssist}
                          disabled={isPresetMode}
                          onChange={(e) => handleUpdate({ airAssist: e.target.checked })}
                          style={{ width: '14px', height: '14px', cursor: isPresetMode ? 'not-allowed' : 'pointer' }}
                        />
                        <span style={{ color: isPresetMode ? 'var(--text-muted)' : 'var(--text-color)', whiteSpace: 'nowrap' }} title={selectedLayer.presetMode === 'cut' ? `🌬️ ${t('layers.air_assist_auto_on', 'Luftunterstützung (Auto: An)')}` : selectedLayer.presetMode === 'engrave' ? `🌬️ ${t('layers.air_assist_auto_off', 'Luftunterstützung (Auto: Aus)')}` : `🌬️ ${t('layers.air_assist_manual', 'Luftunterstützung (M8/M9)')}`}>
                          🌬️ Air Assist
                        </span>
                      </label>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label className="flex-row" style={{ cursor: 'pointer', fontSize: '11px', fontWeight: '500', gap: '4px' }}>
                        <input
                          type="checkbox"
                          checked={selectedLayer.output}
                          onChange={(e) => handleUpdate({ output: e.target.checked })}
                          style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                        />
                        <span style={{ whiteSpace: 'nowrap' }}>📤 {t('layers.output', 'Ausgabe')}</span>
                      </label>
                    </div>
                  </div>

                  <div className="toolbar-divider" style={{ width: '100%', margin: '8px 0' }} />

                  <button
                    className="btn"
                    style={{ width: '100%', fontSize: '11px', borderColor: 'var(--border-hover)' }}
                    onClick={() => {
                      layersStore.updateLayer(selectedLayerId, {
                        subLayers: [
                          { id: uuidv4(), mode: 'fill', speed: selectedLayer.speed, power: selectedLayer.power, passes: 1, airAssist: false },
                          { id: uuidv4(), mode: 'line', speed: 2000, power: 80, passes: 1, airAssist: true }
                        ]
                      });
                    }}
                  >
                    🥞 {t('layers.convert_combo', 'In Kombi-Modus (Sub-Layers) umwandeln')}
                  </button>
                </>
              )}

            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dark)' }}>
              -
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
