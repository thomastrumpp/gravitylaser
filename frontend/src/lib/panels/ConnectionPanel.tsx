import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../stores/store';
import { connectionStore } from '../stores/connectionStore';

export const ConnectionPanel: React.FC = () => {
  const { t } = useTranslation();
  const connState = useStore(connectionStore);
  const [connecting, setConnecting] = useState(false);

  const handleConnectToggle = async () => {
    if (connState.connected) {
      await connectionStore.disconnect();
    } else {
      setConnecting(true);
      const success = await connectionStore.connect();
      setConnecting(false);
      if (!success) {
        alert(t('connection.disconnected') + " - " + t('status.alarm'));
      }
    }
  };

  return (
    <div className="form-group" style={{ padding: '4px' }}>
      <div className="form-row" style={{ marginBottom: '12px' }}>
        <button
          className={`btn ${connState.type === 'wifi' ? 'btn-cyan' : ''}`}
          onClick={() => connectionStore.update((s) => ({ ...s, type: 'wifi' }))}
          disabled={connState.connected}
        >
          📶 {t('connection.wifi')}
        </button>
        <button
          className={`btn ${connState.type === 'usb' ? 'btn-cyan' : ''}`}
          onClick={() => connectionStore.update((s) => ({ ...s, type: 'usb' }))}
          disabled={connState.connected}
        >
          🔌 {t('connection.usb')}
        </button>
      </div>

      {connState.type === 'wifi' ? (
        <div className="form-group">
          <label className="form-label">{t('connection.ip')}</label>
          <div className="flex-row">
            <input
              type="text"
              className="form-input"
              value={connState.ip}
              onChange={(e) => connectionStore.update((s) => ({ ...s, ip: e.target.value }))}
              disabled={connState.connected}
              placeholder="192.168.4.1"
            />
            <label className="flex-row" style={{ fontSize: '11px', gap: '4px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={connState.isFluidNc}
                onChange={(e) => connectionStore.update((s) => ({ ...s, isFluidNc: e.target.checked }))}
                disabled={connState.connected}
              />
              FluidNC
            </label>
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label">{t('connection.port')}</label>
          <input
            type="text"
            className="form-input"
            value={connState.port}
            onChange={(e) => connectionStore.update((s) => ({ ...s, port: e.target.value }))}
            disabled={connState.connected}
            placeholder="z.B. COM3 oder /dev/ttyUSB0 (Wird autom. angefragt)"
          />
        </div>
      )}

      <button
        className={`btn ${connState.connected ? 'btn-danger' : 'btn-success'}`}
        style={{ width: '100%', marginTop: '8px', fontWeight: 'bold' }}
        onClick={handleConnectToggle}
        disabled={connecting}
      >
        {connecting ? '...' : connState.connected ? t('connection.disconnect') : t('connection.connect')}
      </button>
    </div>
  );
};
