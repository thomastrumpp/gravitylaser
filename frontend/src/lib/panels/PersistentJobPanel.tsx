import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../stores/store';
import { connectionStore } from '../stores/connectionStore';
import { gcodeStreamer, type StreamState } from '../gcode/GcodeStreamer';
import { gcodeGen } from '../gcode/GcodeGenerator';
import { GcodeValidator } from '../gcode/GcodeValidator';
import { GcodeEditorModal } from './GcodeEditorModal';
import { AirflowValidationModal } from './AirflowValidationModal';
import { settingsStore } from '../stores/settingsStore';
import { materialsStore } from '../stores/materialStore';
import { layersStore } from '../stores/layersStore';

export const PersistentJobPanel: React.FC = () => {
  const { t } = useTranslation();
  const connState = useStore(connectionStore);

  const [streamState, setStreamState] = useState<StreamState>('Idle');
  const [sentLines, setSentLines] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [gcodeEditorData, setGcodeEditorData] = useState<{ isOpen: boolean, gcode: string }>({ isOpen: false, gcode: '' });
  const [pendingAirflowData, setPendingAirflowData] = useState<{ isOpen: boolean, requiredAirflow: number }>({ isOpen: false, requiredAirflow: 0 });

  useEffect(() => {
    gcodeStreamer.registerCallbacks(
      (sent, total) => {
        setSentLines(sent);
        setTotalLines(total);
      },
      (state) => {
        setStreamState(state);
      }
    );
  }, []);

  const handleStartJob = async () => {
    if (!connState.connected) return;
    const getObjects = (window as any).getCanvasObjectsForGcode;
    if (!getObjects) return;
    const objects = getObjects();
    if (objects.length === 0) {
      alert(t('job.empty_canvas_alert', { defaultValue: "Bitte zeichne zuerst ein Gel-Objekt auf der Arbeitsfläche." }));
      return;
    }

    // --- Airflow Check ---
    let maxRequiredAirflow = 0;
    const settings = settingsStore.get();
    const materials = materialsStore.get();
    const mat = materials[settings.selectedMaterialId];
    if (mat) {
      const layers = layersStore.get();
      for (const obj of objects) {
        const layerId = obj.layerId || 'C00';
        const layerSettings = layers[layerId];
        if (!layerSettings || !layerSettings.output) continue;
        
        const subLayers = layerSettings.subLayers && layerSettings.subLayers.length > 0
          ? layerSettings.subLayers
          : [{ mode: layerSettings.mode }];
          
        for (const subLayer of subLayers) {
          if (subLayer.mode === 'line' || subLayer.mode === 'offset_fill') {
             if (mat.cutAirflow && mat.cutAirflow > maxRequiredAirflow) maxRequiredAirflow = mat.cutAirflow;
          } else {
             if (mat.engraveAirflow && mat.engraveAirflow > maxRequiredAirflow) maxRequiredAirflow = mat.engraveAirflow;
          }
        }
      }
    }

    if (maxRequiredAirflow > 0) {
      setPendingAirflowData({ isOpen: true, requiredAirflow: maxRequiredAirflow });
    } else {
      await finalizeStartJob(objects);
    }
  };

  const finalizeStartJob = async (objects: any) => {
    const gcode = await gcodeGen.generate(objects);
    if (gcode.split('\n').length <= 15) {
      alert(t('job.no_gcode_alert', { defaultValue: "Es konnte kein G-Code generiert werden." }));
      return;
    }
    setGcodeEditorData({ isOpen: true, gcode });
  };

  const handleFrame = () => {
    if (!connState.connected) return;
    const getObjects = (window as any).getCanvasObjectsForGcode;
    if (!getObjects) return;
    const objects = getObjects();
    if (objects.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const obj of objects) {
      const w = obj.width * obj.scaleX;
      const h = obj.height * obj.scaleY;
      const xStart = gcodeGen.mapX(obj.left);
      const yStart = gcodeGen.mapY(obj.top);
      const xEnd = gcodeGen.mapX(obj.left + w);
      const yEnd = gcodeGen.mapY(obj.top + h);

      minX = Math.min(minX, xStart, xEnd);
      maxX = Math.max(maxX, xStart, xEnd);
      minY = Math.min(minY, yStart, yEnd);
      maxY = Math.max(maxY, yStart, yEnd);
    }

    const frameGcode = [
      `G90`,
      `G0 X${minX} Y${minY} F6000`,
      `G1 X${maxX} Y${minY} F3000`,
      `G1 X${maxX} Y${maxY}`,
      `G1 X${minX} Y${maxY}`,
      `G1 X${minX} Y${minY}`,
      `; Soft Landing: schnell bis 10mm vor 0/0, dann langsam`,
      `G0 X10 Y10 F6000`,
      `G1 X0 Y0 F500`
    ].join('\n');

    const validation = GcodeValidator.validate(frameGcode);
    if (!validation.valid) {
      alert(`${t('job.collision_warning', '⚠️ Kollisionsschutz: Der Rahmen liegt außerhalb der Arbeitsfläche!')}\n\n${validation.error}`);
      return;
    }

    gcodeStreamer.start(frameGcode);
  };

  const handleSimulateJob = async () => {
    const getObjects = (window as any).getCanvasObjectsForGcode;
    if (!getObjects) return;
    const objects = getObjects();
    if (objects.length === 0) {
      alert(t('job.empty_canvas_alert', { defaultValue: "Bitte zeichne zuerst ein Objekt auf der Arbeitsfläche." }));
      return;
    }
    const gcode = await gcodeGen.generate(objects);
    if (gcode.split('\n').length <= 15) {
      alert(t('job.no_gcode_alert', { defaultValue: "Es konnte kein G-Code generiert werden." }));
      return;
    }
    setGcodeEditorData({ isOpen: true, gcode });
  };

  const handleDownloadGcode = async () => {
    const getObjects = (window as any).getCanvasObjectsForGcode;
    if (!getObjects) return;
    const objects = getObjects();
    if (objects.length === 0) {
      alert(t('job.nothing_to_export', 'Nichts zum Exportieren.'));
      return;
    }
    const gcode = await gcodeGen.generate(objects);
    const blob = new Blob([gcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gravitylaser_export_${new Date().toISOString().replace(/[:.]/g, '-')}.nc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const isIdle = streamState === 'Idle';
  const progressPercent = totalLines > 0 ? Math.round((sentLines / totalLines) * 100) : 0;
  const estTotalSeconds = gcodeStreamer.estimatedTotalTimeSeconds || 0;
  const remainingSeconds = totalLines > 0 ? estTotalSeconds * (1 - (sentLines / totalLines)) : 0;

  return (
    <div style={{
      borderTop: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-panel-header)',
      padding: '8px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      boxShadow: '0 -4px 10px rgba(0, 0, 0, 0.05)'
    }}>
      {gcodeEditorData.isOpen && (
        <GcodeEditorModal
          initialGcode={gcodeEditorData.gcode}
          onClose={() => setGcodeEditorData({ isOpen: false, gcode: '' })}
          onRun={(finalGcode: string) => {
            setGcodeEditorData({ isOpen: false, gcode: '' });
            gcodeStreamer.start(finalGcode);
          }}
          onSimulate={(finalGcode: string) => {
            setGcodeEditorData({ isOpen: false, gcode: '' });
            if ((window as any).gcodeSimulator) {
              (window as any).gcodeSimulator.simulate(finalGcode);
            } else {
              alert(t('job.simulator_not_ready', 'Simulator ist nicht bereit.'));
            }
          }}
        />
      )}

      {pendingAirflowData.isOpen && (
        <AirflowValidationModal
          requiredAirflow={pendingAirflowData.requiredAirflow}
          onCancel={() => setPendingAirflowData({ isOpen: false, requiredAirflow: 0 })}
          onConfirm={() => {
            setPendingAirflowData({ isOpen: false, requiredAirflow: 0 });
            const getObjects = (window as any).getCanvasObjectsForGcode;
            if (getObjects) {
              finalizeStartJob(getObjects());
            }
          }}
        />
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {t('job.title', { defaultValue: "Auftragssteuerung" })}
        </span>
        <span style={{ 
          fontSize: '9px', 
          fontWeight: 'bold', 
          padding: '1px 5px', 
          borderRadius: '3px',
          backgroundColor: streamState === 'Idle' ? 'var(--bg-input)' : streamState === 'Paused' ? 'var(--accent-orange)' : 'var(--accent-green)',
          color: streamState === 'Idle' ? 'var(--text-muted)' : '#ffffff'
        }}>
          {streamState}
        </span>
      </div>

      {isIdle ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Reihe 1: Start & Frame */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className="btn btn-danger" 
              style={{ 
                flex: 1.8,
                fontWeight: 'bold', 
                fontSize: '12px', 
                padding: '6px 10px', 
                borderRadius: '4px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: '1px solid #dc2626',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                textShadow: '0 1px 1px rgba(0,0,0,0.1)'
              }} 
              onClick={handleStartJob} 
              disabled={!connState.connected} 
              title={t('job.tooltip_start')}
            >
              🔥 {t('job.start', 'Start')}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleFrame}
              disabled={!connState.connected}
              title={t('job.tooltip_frame')}
              style={{ flex: 1, padding: '6px', borderRadius: '4px', fontSize: '11px' }}
            >
              📐 {t('job.frame', 'Rahmen')}
            </button>
          </div>

          {/* Reihe 2: Export, Simulieren, Serien */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              className="btn" 
              onClick={handleDownloadGcode} 
              title={t('job.tooltip_export')}
              style={{ flex: 1, padding: '4px 2px', fontSize: '10px', whiteSpace: 'nowrap' }}
            >
              💾 {t('job.export_short', 'G-Code')}
            </button>
            <button 
              className="btn" 
              onClick={handleSimulateJob} 
              title={t('job.tooltip_simulate')}
              style={{ flex: 1, padding: '4px 2px', fontSize: '10px', whiteSpace: 'nowrap' }}
            >
              👁️ {t('job.simulate_short', 'Vorschau')}
            </button>
            <button 
              className="btn" 
              onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'batch' } }))} 
              title={t('job.tooltip_batch')}
              style={{ flex: 1, padding: '4px 2px', fontSize: '10px', whiteSpace: 'nowrap' }}
            >
              📊 {t('job.batch_short', 'Serien')}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="flex-between">
            <span>{t('job.progress')}: {progressPercent}%</span>
            <span style={{ color: 'var(--accent-cyan)' }}>⏱️ {formatTime(remainingSeconds)}</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'var(--accent-cyan)', transition: 'width 0.1s ease' }} />
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '-2px' }}>
            {sentLines}/{totalLines} {t('job.lines', 'Zeilen')}
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {streamState === 'Streaming' ? (
              <button className="btn btn-primary" onClick={() => gcodeStreamer.pause()} style={{ padding: '4px 8px', fontSize: '11px' }}>
                ⏸️ {t('job.pause', 'Pause')}
              </button>
            ) : (
              <button className="btn btn-success" onClick={() => gcodeStreamer.resume()} style={{ padding: '4px 8px', fontSize: '11px' }}>
                ▶️ {t('job.resume', 'Fortsetzen')}
              </button>
            )}
            <button className="btn btn-danger" onClick={() => gcodeStreamer.cancel()} style={{ padding: '4px 8px', fontSize: '11px' }}>
              ⏹️ {t('job.cancel', 'Abbrechen')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
