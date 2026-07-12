import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  requiredAirflow: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AirflowValidationModal: React.FC<Props> = ({ requiredAirflow, onConfirm, onCancel }) => {
  const { t } = useTranslation();

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="brand" style={{ fontSize: '15px' }}>💨 Airflow Check</h3>
          <button className="menu-button" onClick={onCancel} style={{ fontSize: '18px', padding: '0 4px', cursor: 'pointer' }}>×</button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)', border: '1px solid var(--accent-orange)', padding: '15px', borderRadius: '6px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-orange)' }}>
              Manuelle Einstellung erforderlich!
            </p>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text-main)' }}>
              Dieser Job benötigt Airflow. Bitte stelle die Airflow-Stärke manuell am Gerät auf den folgenden Zielwert ein:
            </p>
            <div style={{ fontSize: '32px', fontWeight: 'bold', textAlign: 'center', margin: '20px 0', color: 'var(--text-main)' }}>
              {requiredAirflow}%
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
              Das Relais (M8) wird beim Start automatisch eingeschaltet.
            </p>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="btn btn-success" onClick={onConfirm}>
            Bestätigen & Starten
          </button>
        </div>
      </div>
    </div>
  );
};
