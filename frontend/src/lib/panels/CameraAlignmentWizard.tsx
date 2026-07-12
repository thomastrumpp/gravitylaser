import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CameraAlignment } from '../vision/CameraAlignment';
import type { Point } from '../services/PrintAndCutService';
import { settingsStore } from '../stores/settingsStore';
import { connectionStore } from '../stores/connectionStore';
import { machineStore } from '../stores/machineStore';
import { canvasStore } from '../stores/canvasStore';

interface Props {
  onClose: () => void;
}

export const CameraAlignmentWizard: React.FC<Props> = ({ onClose }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [points, setPoints] = useState<Point[]>([]);
  const [isEngraving, setIsEngraving] = useState(false);
  const [error, setError] = useState('');
  
  const settings = settingsStore.get();
  const connected = connectionStore.get().connected;

  // Berechne 4 Ziel-Passmarken-Koordinaten in Millimetern auf dem Arbeitsbett
  const margin = 20; // 20mm Rand
  const destPoints: Point[] = [
    { x: margin, y: margin }, // Unten-Links
    { x: settings.workingSizeX - margin, y: margin }, // Unten-Rechts
    { x: settings.workingSizeX - margin, y: settings.workingSizeY - margin }, // Oben-Rechts
    { x: margin, y: settings.workingSizeY - margin } // Oben-Links
  ];

  const markerLabels = [
    t('modal_camera.marker_1', { x: margin, y: margin }),
    t('modal_camera.marker_2', { x: settings.workingSizeX - margin, y: margin }),
    t('modal_camera.marker_3', { x: settings.workingSizeX - margin, y: settings.workingSizeY - margin }),
    t('modal_camera.marker_4', { x: margin, y: settings.workingSizeY - margin })
  ];

  const handleEngraveMarkers = () => {
    if (!connected) {
      setError(t('modal_camera.error_not_connected'));
      return;
    }
    
    setIsEngraving(true);
    setError('');

    // Generiere einfachen G-Code zum Gravieren von 4 kleinen Kreuzen
    const gcode: string[] = [
      "; --- Camera Calibration Markers ---",
      "G90", // Absolutmodus
      "G21", // Metrisch (mm)
      "M5",  // Laser aus
      "F1200"
    ];

    destPoints.forEach((pt, idx) => {
      gcode.push(`; Marker ${idx + 1}`);
      // Verschiebe auf Markerzentrum
      gcode.push(`G0 X${pt.x - 3} Y${pt.y}`);
      gcode.push("M4 S200"); // Geringe Stärke für Marker (S200)
      gcode.push(`G1 X${pt.x + 3} Y${pt.y} F1000`);
      gcode.push("M5");
      gcode.push(`G0 X${pt.x} Y${pt.y - 3}`);
      gcode.push("M4 S200");
      gcode.push(`G1 X${pt.x} Y${pt.y + 3} F1000`);
      gcode.push("M5");
    });

    gcode.push("G0 X0 Y0 ; Zurück zum Nullpunkt");

    // Sende Befehle nacheinander
    gcode.forEach(cmd => {
      machineStore.sendCommand(cmd);
    });

    setTimeout(() => {
      setIsEngraving(false);
      setStep(2);
    }, 4000);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (points.length >= 4) return;

    const rect = e.currentTarget.getBoundingClientRect();
    
    // Berechne relative Klick-Position im Bild (0% bis 100%)
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;

    // Verwende echte Pixelabmessungen des Originalbildes
    const imgElement = e.currentTarget;
    const pxX = relativeX * imgElement.naturalWidth;
    const pxY = relativeY * imgElement.naturalHeight;

    const newPoint = { x: pxX, y: pxY };
    setPoints([...points, newPoint]);
  };

  const handleResetPoints = () => {
    setPoints([]);
    setError('');
  };

  const handleCalculateCalibration = () => {
    if (points.length !== 4) {
      setError(t('modal_camera.error_incomplete'));
      return;
    }

    try {
      // Berechne Homographie-Matrix: Kamera-Pixel -> Maschinen-Millimeter
      const H = CameraAlignment.computeHomography(points, destPoints);
      settingsStore.updateSettings({ cameraHomography: H });
      
      alert(t('modal_camera.success'));
      onClose();
    } catch (err: any) {
      setError(t('modal_camera.error_calibration') + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3 className="modal-title">{t('modal_camera.title')}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          
          {/* Step Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: step === 1 ? 'bold' : 'normal', color: step === 1 ? 'var(--cyan)' : 'var(--text-muted)' }}>
              1. {t('modal_camera.step_1')}
            </span>
            <span style={{ fontSize: '12px', fontWeight: step === 2 ? 'bold' : 'normal', color: step === 2 ? 'var(--cyan)' : 'var(--text-muted)' }}>
              2. {t('modal_camera.step_2', { count: points.length })}
            </span>
            <span style={{ fontSize: '12px', fontWeight: step === 3 ? 'bold' : 'normal', color: step === 3 ? 'var(--cyan)' : 'var(--text-muted)' }}>
              3. {t('modal_camera.step_3')}
            </span>
          </div>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                {t('modal_camera.desc_1')}
              </p>

              <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('modal_camera.safety_checklist')}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {t('modal_camera.safety_1')}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {t('modal_camera.safety_2')}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {t('modal_camera.safety_3')}</span>
              </div>

              <button 
                className="btn btn-cyan" 
                onClick={handleEngraveMarkers}
                disabled={isEngraving}
                style={{ alignSelf: 'center', marginTop: '10px', padding: '10px 20px', fontWeight: 'bold' }}
              >
                {isEngraving ? t('modal_camera.engraving') : t('modal_camera.engrave_markers')}
              </button>

              <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ alignSelf: 'center', fontSize: '11px' }}>
                {t('modal_camera.skip')}
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                {t('modal_camera.desc_2')}
              </p>

              {points.length < 4 ? (
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--cyan)', backgroundColor: 'rgba(6, 182, 212, 0.08)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                  👉 {t('modal_camera.click_instruction')}: {markerLabels[points.length]}
                </div>
              ) : (
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-green)', backgroundColor: 'rgba(34, 197, 94, 0.08)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                  ✓ {t('modal_camera.finished_capturing')}
                </div>
              )}

              {/* Kamerabild mit Klick-Overlay */}
              <div style={{ position: 'relative', width: '100%', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', justifyContent: 'center' }}>
                <img 
                  src={canvasStore.get().cameraImage || '/camera_mockup.png'}
                  alt="Kamera"
                  onClick={handleImageClick}
                  style={{ width: '100%', height: 'auto', display: 'block', cursor: points.length < 4 ? 'crosshair' : 'default' }}
                />
                
                {/* Gezeichnete Marker */}
                {points.map((pt, idx) => {
                  return (
                    <div 
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `calc(${(pt.x / 1280) * 100}% - 8px)`,
                        top: `calc(${(pt.y / 720) * 100}% - 8px)`,
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: '2px solid red',
                        backgroundColor: 'rgba(255,0,0,0.4)',
                        color: 'white',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}
                    >
                      {idx + 1}
                    </div>
                  );
                })}
              </div>

              <button className="btn btn-secondary" onClick={handleResetPoints} style={{ alignSelf: 'flex-start', fontSize: '11px' }}>
                {t('modal_camera.reset')}
              </button>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                {t('modal_camera.desc_3')}
              </p>

              <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>{t('modal_camera.captured_points')}</div>
                {points.map((pt, idx) => (
                  <div key={idx} style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {t('modal_camera.point_label', { idx: idx + 1, pxX: pt.x.toFixed(1), pxY: pt.y.toFixed(1), mmX: destPoints[idx].x, mmY: destPoints[idx].y })}
                  </div>
                ))}
              </div>

              <button 
                className="btn btn-success" 
                onClick={handleCalculateCalibration}
                style={{ alignSelf: 'center', marginTop: '10px', padding: '10px 20px', fontWeight: 'bold' }}
              >
                💾 {t('modal_camera.calculate_save')}
              </button>
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
                {t('modal_camera.back')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onClose}>{t('modal_camera.cancel')}</button>
            {step < 3 && (
              <button 
                className="btn btn-primary" 
                onClick={() => setStep(step + 1)}
                disabled={step === 2 && points.length !== 4}
              >
                Weiter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
