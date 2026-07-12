import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PrintAndCutService } from '../services/PrintAndCutService';
import type { Point } from '../services/PrintAndCutService';
import { canvasStore } from '../stores/canvasStore';
import { machineStore } from '../stores/machineStore';
import { connectionStore } from '../stores/connectionStore';

interface PrintAndCutWizardProps {
  onClose: () => void;
}

export const PrintAndCutWizard: React.FC<PrintAndCutWizardProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [p1Design, setP1Design] = useState<Point | null>(null);
  const [p2Design, setP2Design] = useState<Point | null>(null);
  const [p1Machine, setP1Machine] = useState<Point | null>(null);
  const [p2Machine, setP2Machine] = useState<Point | null>(null);
  
  const [enabled, setEnabled] = useState(false);
  const [useScale, setUseScale] = useState(false);
  const [error, setError] = useState('');

  // Sync state from service initially
  useEffect(() => {
    const pts = PrintAndCutService.getPoints();
    setP1Design(pts.p1Design);
    setP2Design(pts.p2Design);
    setP1Machine(pts.p1Machine);
    setP2Machine(pts.p2Machine);
    setEnabled(pts.enabled);
    setUseScale(pts.useScale);
  }, []);

  const handleSetDesignMarker = (markerNum: 1 | 2) => {
    const { selectedObject } = canvasStore.get();
    if (!selectedObject) {
      setError(t('modal_print_cut.error_no_selection'));
      return;
    }

    // Berechne Zentrum des ausgewählten Objekts in mm
    const cx = selectedObject.x + selectedObject.width / 2;
    const cy = selectedObject.y + selectedObject.height / 2;
    const pt = { x: cx, y: cy };

    if (markerNum === 1) {
      setP1Design(pt);
      setError('');
    } else {
      setP2Design(pt);
      setError('');
    }
  };

  const handleSetMachineMarker = (markerNum: 1 | 2) => {
    if (!connectionStore.get().connected) {
      setError(t('modal_print_cut.error_not_connected'));
      return;
    }

    // Lese aktuelle Maschinen-Arbeitsposition aus dem machineStore
    const wpos = machineStore.get().wpos;
    const pt = { x: wpos.x, y: wpos.y };

    if (markerNum === 1) {
      setP1Machine(pt);
      setError('');
    } else {
      setP2Machine(pt);
      setError('');
    }
  };

  const handleApply = () => {
    if (!p1Design || !p2Design || !p1Machine || !p2Machine) {
      setError(t('modal_print_cut.error_incomplete'));
      return;
    }

    PrintAndCutService.setDesignPoints(p1Design, p2Design);
    PrintAndCutService.setMachinePoints(p1Machine, p2Machine);
    PrintAndCutService.setUseScale(useScale);
    PrintAndCutService.setEnabled(enabled);

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3 className="modal-title">{t('modal_print_cut.title')}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          
          {/* Step Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: step === 1 ? 'bold' : 'normal', color: step === 1 ? 'var(--cyan)' : 'var(--text-muted)' }}>
              1. {t('modal_print_cut.step1')}
            </span>
            <span style={{ fontSize: '12px', fontWeight: step === 2 ? 'bold' : 'normal', color: step === 2 ? 'var(--cyan)' : 'var(--text-muted)' }}>
              2. {t('modal_print_cut.step2')}
            </span>
            <span style={{ fontSize: '12px', fontWeight: step === 3 ? 'bold' : 'normal', color: step === 3 ? 'var(--cyan)' : 'var(--text-muted)' }}>
              3. {t('modal_print_cut.step3')}
            </span>
          </div>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                {t('modal_print_cut.step1_desc')}
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <div style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>{t('modal_print_cut.mark1_design')}</div>
                  {p1Design ? (
                    <div style={{ color: 'var(--accent-green)', fontSize: '11px', marginBottom: '8px' }}>
                      {t('modal_print_cut.set')}: ({p1Design.x.toFixed(1)}, {p1Design.y.toFixed(1)})
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>
                      {t('modal_print_cut.not_set')}
                    </div>
                  )}
                  <button className="btn btn-secondary" onClick={() => handleSetDesignMarker(1)} style={{ fontSize: '11px', width: '100%' }}>
                    {t('modal_print_cut.set_selection')}
                  </button>
                </div>

                <div style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>{t('modal_print_cut.mark2_design')}</div>
                  {p2Design ? (
                    <div style={{ color: 'var(--accent-green)', fontSize: '11px', marginBottom: '8px' }}>
                      {t('modal_print_cut.set')}: ({p2Design.x.toFixed(1)}, {p2Design.y.toFixed(1)})
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>
                      {t('modal_print_cut.not_set')}
                    </div>
                  )}
                  <button className="btn btn-secondary" onClick={() => handleSetDesignMarker(2)} style={{ fontSize: '11px', width: '100%' }}>
                    {t('modal_print_cut.set_selection')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                {t('modal_print_cut.step2_desc')}
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <div style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>{t('modal_print_cut.mark1_laser')}</div>
                  {p1Machine ? (
                    <div style={{ color: 'var(--accent-green)', fontSize: '11px', marginBottom: '8px' }}>
                      {t('modal_print_cut.set')}: ({p1Machine.x.toFixed(1)}, {p1Machine.y.toFixed(1)})
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>
                      {t('modal_print_cut.not_set')}
                    </div>
                  )}
                  <button className="btn btn-secondary" onClick={() => handleSetMachineMarker(1)} style={{ fontSize: '11px', width: '100%' }}>
                    {t('modal_print_cut.capture_position')}
                  </button>
                </div>

                <div style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>{t('modal_print_cut.mark2_laser')}</div>
                  {p2Machine ? (
                    <div style={{ color: 'var(--accent-green)', fontSize: '11px', marginBottom: '8px' }}>
                      {t('modal_print_cut.set')}: ({p2Machine.x.toFixed(1)}, {p2Machine.y.toFixed(1)})
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>
                      {t('modal_print_cut.not_set')}
                    </div>
                  )}
                  <button className="btn btn-secondary" onClick={() => handleSetMachineMarker(2)} style={{ fontSize: '11px', width: '100%' }}>
                    {t('modal_print_cut.capture_position')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                {t('modal_print_cut.step3_desc')}
              </p>

              <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input 
                    type="checkbox"
                    checked={enabled}
                    disabled={!p1Design || !p2Design || !p1Machine || !p2Machine}
                    onChange={e => setEnabled(e.target.checked)}
                  />
                  {t('modal_print_cut.enable_registration')}
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input 
                    type="checkbox"
                    checked={useScale}
                    onChange={e => setUseScale(e.target.checked)}
                  />
                  {t('modal_print_cut.adjust_scale')}
                </label>
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
              {error}
            </div>
          )}

        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div>
            {step > 1 && (
              <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
                {t('modal_print_cut.back')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onClose}>{t('modal_print_cut.cancel')}</button>
            {step < 3 ? (
              <button 
                className="btn btn-primary" 
                onClick={() => setStep(step + 1)}
                disabled={step === 1 ? (!p1Design || !p2Design) : (!p1Machine || !p2Machine)}
              >
                Weiter
              </button>
            ) : (
              <button className="btn btn-success" onClick={handleApply}>
                Fertigstellen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
