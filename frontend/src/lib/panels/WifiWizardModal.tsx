import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../stores/store';
import { connectionStore } from '../stores/connectionStore';
import { machineStore } from '../stores/machineStore';

interface WifiWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WifiWizardModal: React.FC<WifiWizardModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const connState = useStore(connectionStore);

  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!connState.connected || connState.type !== 'usb') {
      alert(t('wizard.error'));
      return;
    }

    if (!ssid) {
      alert("Bitte gib einen WLAN-Namen (SSID) ein.");
      return;
    }

    setLoading(true);
    try {
      // Sende die GRBL-Parametrierungsbefehle für WLAN an die MKS-Steuerung
      // $50=SSID, $51=Passwort, $53=1 (STA-Modus aktivieren)
      machineStore.sendCommand(`$50=${ssid}`);
      // Kurze Pause, damit das Board den EEPROM beschreiben kann
      await new Promise((r) => setTimeout(r, 200));
      machineStore.sendCommand(`$51=${password}`);
      await new Promise((r) => setTimeout(r, 200));
      machineStore.sendCommand(`$53=1`);
      await new Promise((r) => setTimeout(r, 200));
      
      // ESP32 neu starten, um die Verbindung im STA-Modus aufzubauen
      // MKS-DLC32 Neustartbefehl ist oft ein Hard-Reset oder einfaches Strom-Aus/An.
      // Wir senden ein Ctrl+X (Reset) und bitten den Benutzer ggf. um einen Neustart.
      machineStore.sendRealtime('\x18');

      alert(t('wizard.success'));
      onClose();
    } catch (err) {
      console.error(err);
      alert("Fehler bei der WLAN-Konfiguration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>📶 {t('wizard.title')}</span>
          <button className="menu-button" onClick={onClose} style={{ fontSize: '16px', padding: '0 4px' }}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', lineHeight: '1.4', color: 'var(--text-muted)' }}>
            {t('wizard.desc')}
          </p>

          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--accent-red-glow)', padding: '10px', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>⚠️ Voraussetzung:</span>
            <span>Der Laser muss über <strong>USB (WebSerial)</strong> verbunden sein, um die Parameter zu überschreiben. Über WLAN ist dies aus Sicherheitsgründen nicht möglich.</span>
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

        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={loading}>
            Abbrechen
          </button>
          <button
            className="btn btn-success"
            onClick={handleSave}
            disabled={loading || !connState.connected || connState.type !== 'usb'}
          >
            {loading ? 'Sende...' : t('wizard.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
