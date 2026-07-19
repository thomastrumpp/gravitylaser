import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { variableTextStore } from '../stores/variableTextStore';
import { gcodeGen } from '../gcode/GcodeGenerator';
import { gcodeStreamer } from '../gcode/GcodeStreamer';
import { connectionStore } from '../stores/connectionStore';

interface BatchProductionModalProps {
  onClose: () => void;
}

export const BatchProductionModal: React.FC<BatchProductionModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [csvFileName, setCsvFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [serialStart, setSerialStart] = useState(1);
  const [serialStep, setSerialStep] = useState(1);
  const [serialFormat, setSerialFormat] = useState('0001');

  const [autoSequence, setAutoSequence] = useState(false);
  const [safetyDelay, setSafetyDelay] = useState(10);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = variableTextStore.subscribe(state => {
      setCsvHeaders(state.csvHeaders);
      setCsvRows(state.csvRows);
      setCsvFileName(state.csvFileName);
      setCurrentIndex(state.currentIndex);
      
      setSerialStart(state.serialStartValue);
      setSerialStep(state.serialStep);
      setSerialFormat(state.serialFormat);
    });
    return unsubscribe;
  }, []);

  const playBeep = (freq = 880, duration = 0.15) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("AudioContext blockiert oder nicht unterstützt");
    }
  };

  useEffect(() => {
    const handleJobComplete = () => {
      if (!isRunningBatch) return;

      const hasMoreRows = csvRows.length > 0 && currentIndex < csvRows.length - 1;

      playBeep(987.77, 0.2);
      setTimeout(() => playBeep(1318.51, 0.3), 150);

      if (hasMoreRows) {
        if (autoSequence) {
          setCountdown(safetyDelay);
        } else {
          variableTextStore.next();
        }
      } else {
        setIsRunningBatch(false);
        alert(t('modal_batch.alert_complete'));
      }
    };

    window.addEventListener('laserJobComplete', handleJobComplete);
    return () => window.removeEventListener('laserJobComplete', handleJobComplete);
  }, [isRunningBatch, autoSequence, safetyDelay, csvRows, currentIndex, t]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        playBeep(523.25, 0.05);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdown(null);
      variableTextStore.next();
      startNextJob();
    }
  }, [countdown]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      variableTextStore.loadCSV(text, file.name);
    };
    reader.readAsText(file);
  };

  const startNextJob = async () => {
    if (!connectionStore.get().connected) {
      setError(t('modal_batch.error_not_connected'));
      setIsRunningBatch(false);
      return;
    }

    const getObjects = (window as any).getCanvasObjectsForGcode;
    if (!getObjects) {
      setError(t('modal_batch.error_interface'));
      return;
    }

    const objects = getObjects();
    if (objects.length === 0) {
      setError(t('modal_batch.error_empty_canvas'));
      return;
    }

    try {
      setError('');
      const gcode = await gcodeGen.generate(objects);
      await gcodeStreamer.start(gcode);
      setIsRunningBatch(true);
    } catch (err: any) {
      setError(err.message);
      setIsRunningBatch(false);
    }
  };

  const handleStopBatch = () => {
    gcodeStreamer.cancel();
    setCountdown(null);
    setIsRunningBatch(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '800px', maxWidth: '95vw', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3 className="modal-title">{t('modal_batch.title')}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: '20px', padding: '20px' }}>
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold' }}>{t('modal_batch.data_source')}</h4>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept=".csv,.txt"
                  id="csv-file-input"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <label 
                  htmlFor="csv-file-input"
                  className="btn btn-primary"
                  style={{ cursor: 'pointer', margin: 0 }}
                >
                  {t('modal_batch.select_file')}
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {csvFileName ? `${csvFileName} (${csvRows.length} ${t('modal_batch.rows')})` : t('modal_batch.no_file')}
                </span>
              </div>
            </div>

            <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold' }}>{t('modal_batch.serial_properties')}</h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('modal_batch.start_val')}</label>
                  <input 
                    type="number"
                    value={serialStart}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setSerialStart(v);
                      variableTextStore.updateSerialParams({ start: v });
                    }}
                    style={{ width: '100%', padding: '6px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('modal_batch.step_val')}</label>
                  <input 
                    type="number"
                    value={serialStep}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setSerialStep(v);
                      variableTextStore.updateSerialParams({ step: v });
                    }}
                    style={{ width: '100%', padding: '6px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('modal_batch.format')}</label>
                  <input 
                    type="text"
                    value={serialFormat}
                    onChange={e => {
                      setSerialFormat(e.target.value);
                      variableTextStore.updateSerialParams({ format: e.target.value });
                    }}
                    style={{ width: '100%', padding: '6px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-panel-header)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ margin: '0', fontSize: '13px', fontWeight: 'bold' }}>{t('modal_batch.flow_control')}</h4>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input 
                  type="checkbox"
                  checked={autoSequence}
                  onChange={e => setAutoSequence(e.target.checked)}
                />
                {t('modal_batch.auto_sequence')}
              </label>

              {autoSequence && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '22px' }}>
                  <span style={{ fontSize: '12px' }}>{t('modal_batch.safety_delay')}:</span>
                  <input 
                    type="number"
                    value={safetyDelay}
                    min={3}
                    max={60}
                    onChange={e => setSafetyDelay(Number(e.target.value))}
                    style={{ width: '60px', padding: '4px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('modal_batch.seconds')}</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: 'auto', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
              {countdown !== null ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-orange)', marginBottom: '4px' }}>
                    ⚠️ {t('modal_batch.countdown', { seconds: countdown })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {t('modal_batch.prepare_workpiece')}
                  </div>
                </div>
              ) : isRunningBatch ? (
                <div style={{ textAlign: 'center', color: 'var(--text-accent)', fontWeight: 'bold', padding: '10px 0' }}>
                  {t('modal_batch.running', { index: currentIndex + 1 })}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {t('modal_batch.waiting')}
                </div>
              )}

              {error && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                {isRunningBatch || countdown !== null ? (
                  <button className="btn" onClick={handleStopBatch} style={{ flex: 1, backgroundColor: '#ef4444', color: '#ffffff' }}>
                    {t('modal_batch.stop')}
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    onClick={startNextJob} 
                    style={{ flex: 1 }}
                    disabled={csvRows.length === 0 && !serialStart}
                  >
                    {t('modal_batch.start')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-panel-header)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('modal_batch.data_preview')}</span>
              {csvRows.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {t('modal_batch.active_row', { current: currentIndex + 1, total: csvRows.length })}
                </span>
              )}
            </div>

            <div style={{ flex: 1, overflow: 'auto', fontSize: '12px' }}>
              {csvRows.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  {t('modal_batch.no_data')}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-panel-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px', width: '40px' }}>#</th>
                      {csvHeaders.map(h => (
                        <th key={h} style={{ padding: '8px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => variableTextStore.setCurrentIndex(idx)}
                        style={{ 
                          borderBottom: '1px solid var(--border-color)', 
                          cursor: 'pointer',
                          backgroundColor: idx === currentIndex ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                          fontWeight: idx === currentIndex ? 'bold' : 'normal'
                        }}
                      >
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        {csvHeaders.map(h => (
                          <td key={h} style={{ padding: '8px' }}>{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {csvRows.length > 0 && (
              <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', justifyContent: 'center', backgroundColor: 'var(--bg-panel-header)' }}>
                <button className="btn" onClick={() => variableTextStore.prev()} disabled={currentIndex === 0}>
                  {t('modal_batch.prev')}
                </button>
                <button className="btn" onClick={() => variableTextStore.next()} disabled={currentIndex === csvRows.length - 1}>
                  {t('modal_batch.next')}
                </button>
                <button className="btn" onClick={() => variableTextStore.reset()}>
                  {t('modal_batch.reset')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t('modal_batch.close')}</button>
        </div>
      </div>
    </div>
  );
};
