import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { settingsStore, type OriginPosition } from '../stores/settingsStore';
import { useStore } from '../stores/store';
import { canvasStore } from '../stores/canvasStore';
import { ConnectionPanel } from './ConnectionPanel';
import { connectionStore } from '../stores/connectionStore';
import { machineStore } from '../stores/machineStore';
import { materialsStore, type MaterialPreset } from '../stores/materialStore';

interface Props {
  onClose: () => void;
  initialTab?: 'verbindung' | 'general' | 'materials' | 'wlan' | 'kamera';
}

export const MachineSettingsModal: React.FC<Props> = ({ onClose, initialTab = 'verbindung' }) => {
  const { t } = useTranslation();
  const settings = useStore(settingsStore);
  const connState = useStore(connectionStore);
  const materials = useStore(materialsStore);
  const [activeTab, setActiveTab] = useState<'verbindung' | 'general' | 'materials' | 'wlan' | 'kamera'>(initialTab);
  const [cameraType, setCameraType] = useState<'usb' | 'ip'>(settings.cameraType || 'usb');
  const [cameraIpUrl, setCameraIpUrl] = useState(settings.cameraIpUrl || '');
  const [cameraOpacity, setCameraOpacity] = useState(settings.cameraOpacity !== undefined ? settings.cameraOpacity : 0.5);
  const [cameraK1, setCameraK1] = useState(settings.cameraK1 !== undefined ? settings.cameraK1 : 0.0);
  const [cameraK2, setCameraK2] = useState(settings.cameraK2 !== undefined ? settings.cameraK2 : 0.0);
  
  const [sizeX, setSizeX] = useState(settings.workingSizeX);
  const [sizeY, setSizeY] = useState(settings.workingSizeY);
  const [sizeXStr, setSizeXStr] = useState(settings.workingSizeX.toString());
  const [sizeYStr, setSizeYStr] = useState(settings.workingSizeY.toString());
  const [origin, setOrigin] = useState<OriginPosition>(settings.origin);
  const [laserMode, setLaserMode] = useState<'M3' | 'M4'>(settings.laserMode || 'M4');
  const [backlashX, setBacklashX] = useState(settings.backlashX || 0);
  const [backlashY, setBacklashY] = useState(settings.backlashY || 0);
  const [backlashXStr, setBacklashXStr] = useState((settings.backlashX || 0).toString());
  const [backlashYStr, setBacklashYStr] = useState((settings.backlashY || 0).toString());

  // WLAN Wizard State
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Material Editor State
  const [selectedMatId, setSelectedMatId] = useState<string | null>(null);
  const [localMatName, setLocalMatName] = useState('');
  const [localEngraveSpeed, setLocalEngraveSpeed] = useState('');
  const [localEngravePower, setLocalEngravePower] = useState('');
  const [localCutSpeed, setLocalCutSpeed] = useState('');
  const [localCutPower, setLocalCutPower] = useState('');
  const [localEngraveAirflow, setLocalEngraveAirflow] = useState('');
  const [localCutAirflow, setLocalCutAirflow] = useState('');
  const [localMaxDepth, setLocalMaxDepth] = useState('');
  const [localLossCoeff, setLocalLossCoeff] = useState('');
  const [localNotes, setLocalNotes] = useState('');

  // Initialisiere Materialien
  useEffect(() => {
    const matKeys = Object.keys(materials);
    if (!selectedMatId && matKeys.length > 0) {
      setSelectedMatId(matKeys[0]);
      loadLocalFields(materials[matKeys[0]]);
    } else if (selectedMatId && materials[selectedMatId]) {
      // Wenn das aktuell ausgewählte Material sich geändert hat (z. B. durch Reset)
      loadLocalFields(materials[selectedMatId]);
    }
  }, [materials, selectedMatId]);

  const loadLocalFields = (mat: MaterialPreset) => {
    setLocalMatName(mat.name);
    setLocalEngraveSpeed(mat.engraveSpeed.toString());
    setLocalEngravePower(mat.engravePower.toString());
    setLocalCutSpeed(mat.cutSpeed.toString());
    setLocalCutPower(mat.cutPower.toString());
    setLocalEngraveAirflow((mat.engraveAirflow || 0).toString());
    setLocalCutAirflow((mat.cutAirflow || 0).toString());
    setLocalMaxDepth(mat.maxDepthPerPass.toString());
    setLocalLossCoeff(mat.lossCoeff.toString());
    setLocalNotes(mat.notes);
  };

  const handleSelectMaterial = (id: string) => {
    setSelectedMatId(id);
    loadLocalFields(materials[id]);
  };

  const handleSave = () => {
    settingsStore.updateSettings({
      workingSizeX: sizeX,
      workingSizeY: sizeY,
      origin,
      laserMode,
      backlashX,
      backlashY,
      cameraType,
      cameraIpUrl,
      cameraOpacity,
      cameraK1,
      cameraK2
    });
    
    // Arbeitsbereichsgröße automatisch an den GRBL-Controller senden
    if (connectionStore.get().connected) {
      machineStore.sendCommand(`$130=${sizeX}`);
      machineStore.sendCommand(`$131=${sizeY}`);
    }

    onClose();
  };

  const handleAddNewMaterial = () => {
    const id = `mat_${Date.now()}`;
    const newMat: MaterialPreset = {
      id,
      name: 'Neues Material',
      engraveSpeed: 3000,
      engravePower: 30,
      cutSpeed: 200,
      cutPower: 100,
      engraveAirflow: 0,
      cutAirflow: 0,
      maxDepthPerPass: 2.0,
      lossCoeff: 0.15,
      supportedOps: ['engrave', 'cut'],
      notes: 'Benutzerdefiniertes Material.'
    };
    materialsStore.addMaterial(newMat);
    setSelectedMatId(id);
    loadLocalFields(newMat);
  };

  const handleDeleteMaterial = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Möchtest du das Material "${materials[id]?.name}" wirklich löschen?`)) {
      materialsStore.removeMaterial(id);
      const remainingIds = Object.keys(materials).filter(k => k !== id);
      if (remainingIds.length > 0) {
        setSelectedMatId(remainingIds[0]);
        loadLocalFields(materials[remainingIds[0]]);
      } else {
        setSelectedMatId(null);
      }
    }
  };

  const handleSaveMaterial = () => {
    if (!selectedMatId) return;
    const updated: MaterialPreset = {
      id: selectedMatId,
      name: localMatName,
      engraveSpeed: Number(localEngraveSpeed) || 3000,
      engravePower: Number(localEngravePower) || 30,
      cutSpeed: Number(localCutSpeed) || 200,
      cutPower: Number(localCutPower) || 100,
      engraveAirflow: Number(localEngraveAirflow) || 0,
      cutAirflow: Number(localCutAirflow) || 0,
      maxDepthPerPass: Number(localMaxDepth) || 2.0,
      lossCoeff: Number(localLossCoeff) || 0.15,
      supportedOps: ['engrave', 'cut'],
      notes: localNotes
    };
    materialsStore.updateMaterial(selectedMatId, updated);
    alert(t('materials.save_success', 'Material erfolgreich gespeichert!'));
  };

  const handleResetMaterials = () => {
    if (confirm(t('materials.reset_confirm', 'Möchtest du alle Materialien auf die Standardwerte zurücksetzen? Eigene Änderungen gehen verloren.'))) {
      materialsStore.resetToDefault();
      const firstId = Object.keys(materialsStore.get())[0];
      setSelectedMatId(firstId);
    }
  };

  const handleWlanSave = async () => {
    if (!connState.connected || connState.type !== 'usb') {
      alert(t('wizard.error'));
      return;
    }

    if (!ssid) {
      alert(t('wifi.error_ssid', 'Bitte gib einen WLAN-Namen (SSID) ein.'));
      return;
    }

    setLoading(true);
    try {
      machineStore.sendCommand(`$50=${ssid}`);
      await new Promise((r) => setTimeout(r, 200));
      machineStore.sendCommand(`$51=${password}`);
      await new Promise((r) => setTimeout(r, 200));
      machineStore.sendCommand(`$53=1`);
      await new Promise((r) => setTimeout(r, 200));
      
      // ESP32 neu starten, um die Verbindung im STA-Modus aufzubauen
      machineStore.sendRealtime('\x18');

      alert(t('wizard.success'));
      onClose();
    } catch (err) {
      console.error(err);
      alert(t('wifi.error_config', 'Fehler bei der WLAN-Konfiguration.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ 
          width: '940px', 
          transition: 'width 0.2s ease',
          display: 'flex',
          flexDirection: 'column'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ paddingBottom: '8px' }}>
          <div className="brand" style={{ fontSize: '15px' }}>⚙️ {t('settings.title')}</div>
          <button className="menu-button" onClick={onClose} style={{ fontSize: '18px', padding: '0 4px', cursor: 'pointer' }}>×</button>
        </div>

        <div className="tabs-container" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel-header)' }}>
          <button 
            className={`tab-btn ${activeTab === 'verbindung' ? 'active' : ''}`}
            onClick={() => setActiveTab('verbindung')}
            style={{ flex: 1, padding: '12px 6px', fontSize: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            🔌 {t('nav.settings_connection', 'Verbindung')}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
            style={{ flex: 1, padding: '12px 6px', fontSize: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            🔧 {t('nav.settings_general', 'Einstellungen')}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
            style={{ flex: 1, padding: '12px 6px', fontSize: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            🪵 {t('nav.settings_materials', 'Materialien')}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'wlan' ? 'active' : ''}`}
            onClick={() => setActiveTab('wlan')}
            style={{ flex: 1, padding: '12px 6px', fontSize: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            📶 {t('nav.settings_wifi', 'WLAN-Assistent')}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'kamera' ? 'active' : ''}`}
            onClick={() => setActiveTab('kamera')}
            style={{ flex: 1, padding: '12px 6px', fontSize: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            📷 {t('nav.settings_camera', 'Kamera')}
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: activeTab === 'materials' ? '15px' : '20px' }}>
          {activeTab === 'verbindung' && (
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '13px', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔌 {t('connection.title')}
              </h3>
              <ConnectionPanel />
            </div>
          )}

          {activeTab === 'general' && (
            <>
              {/* ARBEITSBEREICH */}
              <div className="form-group">
                <label className="form-label">{t('settings.working_size')} (mm)</label>
                <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>X</label>
                    <input 
                      type="text" 
                      className="form-input" 
                    value={sizeXStr} 
                    onChange={e => {
                      setSizeXStr(e.target.value);
                      const num = Number(e.target.value);
                      if (!isNaN(num) && num > 0) {
                        setSizeX(num);
                      }
                    }} 
                    onBlur={() => {
                      if (sizeXStr === '' || isNaN(Number(sizeXStr))) {
                        setSizeXStr(sizeX.toString());
                      }
                    }}
                    placeholder="X"
                  />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Y</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={sizeYStr} 
                      onChange={e => {
                      setSizeYStr(e.target.value);
                      const num = Number(e.target.value);
                      if (!isNaN(num) && num > 0) {
                        setSizeY(num);
                      }
                    }} 
                    onBlur={() => {
                      if (sizeYStr === '' || isNaN(Number(sizeYStr))) {
                        setSizeYStr(sizeY.toString());
                      }
                    }}
                    placeholder="Y"
                  />
                  </div>
                </div>
              </div>
              
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">{t('settings.origin')}</label>
                <select 
                  className="form-input" 
                  value={origin} 
                  onChange={e => setOrigin(e.target.value as OriginPosition)}
                >
                  <option value="BottomLeft">{t('settings.origin_bl')}</option>
                  <option value="TopLeft">{t('settings.origin_tl')}</option>
                  <option value="BottomRight">{t('settings.origin_br')}</option>
                  <option value="TopRight">{t('settings.origin_tr')}</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">{t('settings.laser_mode', 'Laser Modus')}</label>
                <select 
                  className="form-input" 
                  value={laserMode} 
                  onChange={e => setLaserMode(e.target.value as 'M3' | 'M4')}
                >
                  <option value="M3">{t('settings.laser_m3', 'M3 (Konstant)')}</option>
                  <option value="M4">{t('settings.laser_m4', 'M4 (Dynamisch)')}</option>
                </select>
              </div>

              {/* BACKLASH COMPENSATON */}
              <div className="form-group" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '13px', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('settings.backlash', '⚙️ Backlash-Kompensation (Spielausgleich)')}
                </h3>
                <label className="form-label">{t('settings.backlash_xy', 'Kompensation X & Y (mm)')}</label>
                <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('settings.axis_x', 'Achse X')}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={backlashXStr} 
                      onChange={e => {
                        setBacklashXStr(e.target.value);
                        const num = Number(e.target.value);
                        if (!isNaN(num) && num >= 0) {
                          setBacklashX(num);
                        }
                      }}
                      onBlur={() => {
                        if (backlashXStr === '' || isNaN(Number(backlashXStr))) {
                          setBacklashXStr(backlashX.toString());
                        }
                      }}
                      placeholder="0.0"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('settings.axis_y', 'Achse Y')}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={backlashYStr} 
                      onChange={e => {
                        setBacklashYStr(e.target.value);
                        const num = Number(e.target.value);
                        if (!isNaN(num) && num >= 0) {
                          setBacklashY(num);
                        }
                      }}
                      onBlur={() => {
                        if (backlashYStr === '' || isNaN(Number(backlashYStr))) {
                          setBacklashYStr(backlashY.toString());
                        }
                      }}
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>

              {/* CANVAS EINSTELLUNGEN */}
              <div className="form-group" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '13px', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📐 Canvas
                </h3>
                <label className="form-label">Raster-Einrasten (Grid Snap)</label>
                <select 
                  className="form-input" 
                  value={canvasStore.get().gridResolution}
                  onChange={(e) => canvasStore.setGridResolution(Number(e.target.value))}
                >
                  <option value={0}>Aus</option>
                  <option value={0.1}>0.1 mm</option>
                  <option value={0.5}>0.5 mm</option>
                  <option value={1}>1.0 mm</option>
                  <option value={5}>5.0 mm</option>
                  <option value={10}>10 mm</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'wlan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', lineHeight: '1.4', color: 'var(--text-muted)' }}>
                {t('wizard.desc')}
              </p>

              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--accent-red-glow)', padding: '12px', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>⚠️ Voraussetzung:</span>
                <span style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>
                  Der Laser muss über <strong>USB (WebSerial)</strong> verbunden sein, um die Parameter zu überschreiben. Über WLAN ist dies aus Sicherheitsgründen nicht möglich.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">{t('wizard.ssid')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  placeholder="z.B. FritzBox-Heimnetzwerk"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('wizard.password')}</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="WLAN-Passwort eingeben"
                  disabled={loading}
                />
              </div>
            </div>
          )}
          {activeTab === 'kamera' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '13px', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📷 Kamera-Einstellungen
              </h3>
              
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>Kameratyp</label>
                <select
                  className="form-input"
                  value={cameraType}
                  onChange={(e) => setCameraType(e.target.value as 'usb' | 'ip')}
                  style={{ padding: '8px' }}
                >
                  <option value="usb">Lokale USB-Webcam</option>
                  <option value="ip">Netzwerk- / IP-Kamera (MJPEG/JPEG)</option>
                </select>
              </div>

              {cameraType === 'ip' && (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>IP-Kamera Snapshot-URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cameraIpUrl}
                    onChange={(e) => setCameraIpUrl(e.target.value)}
                    placeholder="z.B. http://192.168.1.100:8080/shot.jpg"
                    style={{ padding: '8px' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Geben Sie die URL ein, unter der Ihre IP-Kamera ein JPEG-Bild oder einen Snapshot bereitstellt.
                  </span>
                </div>
              )}

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="flex-between">
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>Overlay-Deckkraft (Opacity)</label>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{Math.round(cameraOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  className="form-input"
                  style={{ padding: 0 }}
                  value={cameraOpacity}
                  onChange={(e) => setCameraOpacity(parseFloat(e.target.value))}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginTop: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-main)' }}>🛡️ Linsenentzerrung (Kalibrierung)</h4>
                
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <div className="flex-between">
                    <label className="form-label" style={{ fontSize: '11px' }}>K1 (Radiale Verzerrung 1)</label>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{cameraK1.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="-1.00"
                    max="1.00"
                    step="0.01"
                    className="form-input"
                    style={{ padding: 0 }}
                    value={cameraK1}
                    onChange={(e) => setCameraK1(parseFloat(e.target.value))}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="flex-between">
                    <label className="form-label" style={{ fontSize: '11px' }}>K2 (Radiale Verzerrung 2)</label>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{cameraK2.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="-0.50"
                    max="0.50"
                    step="0.01"
                    className="form-input"
                    style={{ padding: 0 }}
                    value={cameraK2}
                    onChange={(e) => setCameraK2(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', color: 'var(--text-main)' }}>📐 Kamera-Ausrichtung</h4>
                <button 
                  type="button"
                  className="btn btn-cyan" 
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'camera-align' } }));
                  }}
                  style={{ width: '100%', fontWeight: 'bold' }}
                >
                  Ausrichtungs-Wizard starten
                </button>
              </div>
            </div>
          )}
          {activeTab === 'materials' && (
            <div style={{ display: 'flex', gap: '15px', height: '50vh', minHeight: '380px' }}>
              {/* Linke Seite: Materialliste */}
              <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '10px', borderRight: '1px solid var(--border-color)', paddingRight: '15px' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {Object.values(materials).map((mat) => (
                    <div
                      key={mat.id}
                      onClick={() => handleSelectMaterial(mat.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '4px',
                        backgroundColor: selectedMatId === mat.id ? '#2c2c2e' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        border: selectedMatId === mat.id ? '1px solid #ff7f00' : '1px solid transparent',
                        color: selectedMatId === mat.id ? '#ff7f00' : 'var(--text-main)'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '5px' }}>
                        {mat.name}
                      </span>
                      <button 
                        onClick={(e) => handleDeleteMaterial(mat.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ff453a',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Material löschen"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  className="btn btn-cyan" 
                  onClick={handleAddNewMaterial} 
                  style={{ width: '100%', fontSize: '11px', padding: '6px' }}
                >
                  {t('materials.new', '➕ Neues Material')}
                </button>
                <button 
                  className="btn" 
                  onClick={handleResetMaterials} 
                  style={{ width: '100%', fontSize: '11px', padding: '6px', color: '#ff9500', borderColor: '#ff9500' }}
                >
                  {t('materials.reset', '🔄 Zurücksetzen')}
                </button>
              </div>

              {/* Rechte Seite: Editor-Formular */}
              {selectedMatId && materials[selectedMatId] ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '5px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>{t('materials.name', 'Materialname')}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={localMatName} 
                      onChange={e => setLocalMatName(e.target.value)} 
                      style={{ padding: '6px' }}
                    />
                  </div>

                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px', backgroundColor: 'var(--bg-input)' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#30d158' }}>{t('materials.engrave_preset', '🪵 Gravieren (Ebene 0 Voreinstellung)')}</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <div className="form-group" style={{ flex: 1, minWidth: '100px', margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }}>{t('materials.speed', 'Geschw. (mm/min)')}</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={localEngraveSpeed} 
                          onChange={e => setLocalEngraveSpeed(e.target.value)} 
                          style={{ padding: '6px' }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, minWidth: '100px', margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }}>{t('materials.power', 'Leistung (0-100%)')}</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={localEngravePower} 
                          onChange={e => setLocalEngravePower(e.target.value)} 
                          style={{ padding: '6px' }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, minWidth: '100px', margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }} title="Startet das Relais via M8">{t('materials.airflow', 'Airflow (0-100%)')}</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={localEngraveAirflow} 
                          onChange={e => setLocalEngraveAirflow(e.target.value)} 
                          style={{ padding: '6px' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px', backgroundColor: 'var(--bg-input)' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#ff453a' }}>{t('materials.cut_preset', '✂️ Schneiden (Ebene 1 Voreinstellung)')}</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <div className="form-group" style={{ flex: 1, minWidth: '100px', margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }}>{t('materials.speed', 'Geschw. (mm/min)')}</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={localCutSpeed} 
                          onChange={e => setLocalCutSpeed(e.target.value)} 
                          style={{ padding: '6px' }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, minWidth: '100px', margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }}>{t('materials.power', 'Leistung (0-100%)')}</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={localCutPower} 
                          onChange={e => setLocalCutPower(e.target.value)} 
                          style={{ padding: '6px' }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, minWidth: '100px', margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }} title="Startet das Relais via M8">{t('materials.airflow', 'Airflow (0-100%)')}</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={localCutAirflow} 
                          onChange={e => setLocalCutAirflow(e.target.value)} 
                          style={{ padding: '6px' }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, minWidth: '100px', margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }}>{t('materials.max_depth', 'Max. Tiefe/Durchg. (mm)')}</label>
                        <input 
                          type="number" 
                          step="0.1"
                          className="form-input" 
                          value={localMaxDepth} 
                          onChange={e => setLocalMaxDepth(e.target.value)} 
                          style={{ padding: '6px' }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, minWidth: '100px', margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }}>{t('materials.loss_coeff', 'Dämpfung (Verlustfaktor)')}</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="form-input" 
                          value={localLossCoeff} 
                          onChange={e => setLocalLossCoeff(e.target.value)} 
                          style={{ padding: '6px' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>{t('materials.notes', 'Hinweise / Besonderheiten')}</label>
                    <textarea 
                      className="form-input" 
                      value={localNotes} 
                      onChange={e => setLocalNotes(e.target.value)} 
                      style={{ padding: '6px', height: '60px', resize: 'none', fontSize: '12px' }}
                    />
                  </div>

                  <button 
                    className="btn btn-primary" 
                    onClick={handleSaveMaterial} 
                    style={{ width: '100%', fontWeight: 'bold' }}
                  >
                    {t('materials.save', '💾 Material speichern')}
                  </button>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  {t('materials.select_prompt', 'Bitte wähle ein Material aus oder erstelle ein neues.')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border-color)' }}>
          {activeTab !== 'wlan' ? (
            <>
              <button className="btn" onClick={onClose}>
                Schließen
              </button>
              {activeTab === 'general' && (
                <button className="btn btn-primary" onClick={handleSave}>
                  {t('settings.save')}
                </button>
              )}
            </>
          ) : (
            <>
              <button className="btn" onClick={onClose} disabled={loading}>
                Abbrechen
              </button>
              <button
                className="btn btn-success"
                onClick={handleWlanSave}
                disabled={loading || !connState.connected || connState.type !== 'usb'}
              >
                {loading ? 'Sende...' : t('wizard.save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
