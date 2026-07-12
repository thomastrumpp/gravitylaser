import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type CanvasObjectData, GcodeGenerator } from '../gcode/GcodeGenerator';
import { useStore } from '../stores/store';
import { settingsStore } from '../stores/settingsStore';
import { consoleStore } from '../stores/consoleStore';
import opentype from 'opentype.js';
import fontUrl from '/Roboto-Regular.ttf?url';

function getCenteredPathCommands(font: any, text: string, fontSize: number): any[] {
  const path = font.getPath(text, 0, 0, fontSize);
  const cmds = path.commands;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const cmd of cmds) {
    if (cmd.x !== undefined) {
      if (cmd.x < minX) minX = cmd.x;
      if (cmd.x > maxX) maxX = cmd.x;
      if (cmd.y < minY) minY = cmd.y;
      if (cmd.y > maxY) maxY = cmd.y;
    }
    if (cmd.x1 !== undefined) {
      if (cmd.x1 < minX) minX = cmd.x1;
      if (cmd.x1 > maxX) maxX = cmd.x1;
      if (cmd.y1 < minY) minY = cmd.y1;
      if (cmd.y1 > maxY) maxY = cmd.y1;
    }
    if (cmd.x2 !== undefined) {
      if (cmd.x2 < minX) minX = cmd.x2;
      if (cmd.x2 > maxX) maxX = cmd.x2;
      if (cmd.y2 < minY) minY = cmd.y2;
      if (cmd.y2 > maxY) maxY = cmd.y2;
    }
  }

  if (minX === Infinity) return cmds;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return cmds.map((cmd: any) => {
    const newCmd = { ...cmd };
    if (newCmd.x !== undefined) newCmd.x -= cx;
    if (newCmd.y !== undefined) newCmd.y -= cy;
    if (newCmd.x1 !== undefined) newCmd.x1 -= cx;
    if (newCmd.y1 !== undefined) newCmd.y1 -= cy;
    if (newCmd.x2 !== undefined) newCmd.x2 -= cx;
    if (newCmd.y2 !== undefined) newCmd.y2 -= cy;
    return newCmd;
  });
}

interface Props {
  onClose: () => void;
}

type TabType = 'focus' | 'interval' | 'engrave' | 'cut';

export const TestsuiteModal: React.FC<Props> = ({ onClose }) => {
  const { t } = useTranslation();
  const settingsState = useStore(settingsStore);
  const [activeTab, setActiveTab] = useState<TabType>('focus');
  const [hoveredHelp, setHoveredHelp] = useState<string>(
    t('testsuite.helpDefault', 'Bewege die Maus über ein Eingabefeld, um eine genaue Erklärung des Parameters anzuzeigen.')
  );

  const [zStart, setZStart] = useState(0);
  const [zEnd, setZEnd] = useState(10);
  const [focusSteps, setFocusSteps] = useState(21);
  const [focusLineLength, setFocusLineLength] = useState(40);
  const [focusSpacing, setFocusSpacing] = useState(5);
  const [focusSpeed, setFocusSpeed] = useState(3000);
  const [focusPower, setFocusPower] = useState(80);
  const [focusMotorized, setFocusMotorized] = useState(false);

  const [intMin, setIntMin] = useState(0.15);
  const [intMax, setIntMax] = useState(0.20);
  const [intSteps, setIntSteps] = useState(6);
  const [intBoxSize, setIntBoxSize] = useState(10);
  const [intSpacing, setIntSpacing] = useState(5);
  const [intSpeed, setIntSpeed] = useState(3000);
  const [intPower, setIntPower] = useState(80);

  const [gXCount, setGXCount] = useState(10);
  const [gXMin, setGXMin] = useState(10);
  const [gXMax, setGXMax] = useState(100);
  const [gYCount, setGYCount] = useState(10);
  const [gYMin, setGYMin] = useState(500);
  const [gYMax, setGYMax] = useState(2000);
  const [gBoxWidth, setGBoxWidth] = useState(10);
  const [gBoxHeight, setGBoxHeight] = useState(10);
  const [gSpacing, setGSpacing] = useState(2);
  const [gInterval, setGInterval] = useState(0.15);
  const [gPasses, setGPasses] = useState(1);

  const [cXCount, setCXCount] = useState(5);
  const [cXMin, setCXMin] = useState(1);
  const [cXMax, setCXMax] = useState(5);
  const [cYCount] = useState(5);
  const [cYMin, setCYMin] = useState(100);
  const [cYMax, setCYMax] = useState(1000);
  const [cBoxWidth, setCBoxWidth] = useState(10);
  const [cBoxHeight, setCBoxHeight] = useState(10);
  const [cSpacing, setCSpacing] = useState(2);
  const [cPower, setCPower] = useState(100);

  const handleGenerate = async () => {
    consoleStore.logLine(`🚀 ${t('testsuite.startingGeneration', 'Starte Generierung für Test')}: ${activeTab.toUpperCase()}...`, "info");
    const objects: CanvasObjectData[] = [];
    const settings = settingsStore.get();

    try {
      const resp = await fetch(fontUrl);
      const buffer = await resp.arrayBuffer();
      const font = opentype.parse(buffer);

      if (activeTab === 'focus') {
        const totalHeight = (focusSteps - 1) * focusSpacing;
        const startX = (settings.workingSizeX / 2) - (focusLineLength / 2);
        const startY = (settings.workingSizeY / 2) - (totalHeight / 2);

        for (let i = 0; i < focusSteps; i++) {
          const ratio = focusSteps > 1 ? i / (focusSteps - 1) : 0;
          const currentZ = zStart + (zEnd - zStart) * ratio;
          const yPos = startY + (i * focusSpacing);

          const pauseMessage = !focusMotorized 
            ? `${t('testsuite.setZAxis', 'Bitte Z-Achse auf')} ${currentZ.toFixed(2)} mm ${t('testsuite.pressResume', 'einstellen und Resume (~) drücken.')}` 
            : undefined;

          objects.push({
            type: 'line',
            left: startX,
            top: yPos,
            width: focusLineLength,
            height: 0,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            layerId: 'C00',
            customSpeed: focusSpeed,
            customPower: focusPower,
            customZ: focusMotorized ? currentZ : undefined,
            customPauseMessage: pauseMessage
          });

          const labelText = `${currentZ.toFixed(2)} mm`;
          const fontSize = Math.min(focusSpacing * 0.7, 5);
          const centeredCommands = getCenteredPathCommands(font, labelText, fontSize);
          
          objects.push({
            type: 'path',
            left: startX + focusLineLength + 8,
            top: yPos,
            width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
            path: centeredCommands,
            customSpeed: 6000,
            customPower: 15,
            customPasses: 1
          });
        }

        const titlePath = getCenteredPathCommands(font, t('testsuite.focusTitle', "Focus Test (Z-Axis Calibration)"), 6);
        objects.push({
          type: 'path',
          left: settings.workingSizeX / 2,
          top: startY + totalHeight + 10,
          width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
          path: titlePath,
          customSpeed: 6000,
          customPower: 15,
          customPasses: 1
        });

      } else if (activeTab === 'interval') {
        const totalWidth = (intSteps * intBoxSize) + ((intSteps - 1) * intSpacing);
        const startX = (settings.workingSizeX / 2) - (totalWidth / 2);
        const startY = (settings.workingSizeY / 2) - (intBoxSize / 2);

        for (let i = 0; i < intSteps; i++) {
          const ratio = intSteps > 1 ? i / (intSteps - 1) : 0;
          const currentInterval = intMin + (intMax - intMin) * ratio;
          const xPos = startX + (i * (intBoxSize + intSpacing));

          objects.push({
            type: 'rect',
            left: xPos,
            top: startY,
            width: intBoxSize,
            height: intBoxSize,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            layerId: 'C00',
            customSpeed: intSpeed,
            customPower: intPower,
            customMode: 'Fill',
            customInterval: currentInterval,
            customHatchAngle: 0
          });

          const labelText = `${currentInterval.toFixed(3)} mm`;
          const fontSize = Math.min(intBoxSize * 0.35, 5);
          const centeredCommands = getCenteredPathCommands(font, labelText, fontSize);

          objects.push({
            type: 'path',
            left: xPos + (intBoxSize / 2),
            top: startY + intBoxSize + 4,
            width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
            path: centeredCommands,
            customSpeed: 6000,
            customPower: 15,
            customPasses: 1
          });
        }

        const titlePath = getCenteredPathCommands(font, t('testsuite.intervalTitle', "Interval Test (Engrave Line Density)"), 6);
        objects.push({
          type: 'path',
          left: settings.workingSizeX / 2,
          top: startY + intBoxSize + 14,
          width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
          path: titlePath,
          customSpeed: 6000,
          customPower: 15,
          customPasses: 1
        });

      } else if (activeTab === 'engrave') {
        const totalW = (gXCount * gBoxWidth) + ((gXCount - 1) * gSpacing);
        const totalH = (gYCount * gBoxHeight) + ((gYCount - 1) * gSpacing);
        const startX = (settings.workingSizeX / 2) - (totalW / 2);
        const startY = (settings.workingSizeY / 2) - (totalH / 2);

        const fontSize = Math.min(gBoxWidth, gBoxHeight) * 0.45;

        for (let x = 0; x < gXCount; x++) {
          for (let y = 0; y < gYCount; y++) {
            const xRatio = gXCount > 1 ? x / (gXCount - 1) : 0;
            const yRatio = gYCount > 1 ? y / (gYCount - 1) : 0;

            const pVal = gXMin + (gXMax - gXMin) * xRatio;
            const sVal = gYMin + (gYMax - gYMin) * yRatio;

            objects.push({
              type: 'rect',
              left: startX + (x * (gBoxWidth + gSpacing)),
              top: startY + (y * (gBoxHeight + gSpacing)),
              width: gBoxWidth,
              height: gBoxHeight,
              scaleX: 1,
              scaleY: 1,
              angle: 0,
              layerId: 'C00',
              customMode: 'Fill',
              customSpeed: sVal,
              customPower: pVal,
              customPasses: gPasses,
              customInterval: gInterval,
              customHatchAngle: 0
            });
          }
        }

        const rowLabelX = startX - 16;
        for (let y = 0; y < gYCount; y++) {
          const yRatio = gYCount > 1 ? y / (gYCount - 1) : 0;
          const sVal = gYMin + (gYMax - gYMin) * yRatio;
          const labelText = sVal.toFixed(0);

          const centerY = startY + (y * (gBoxHeight + gSpacing)) + (gBoxHeight / 2);
          const centeredCommands = getCenteredPathCommands(font, labelText, fontSize);

          objects.push({
            type: 'path',
            left: rowLabelX,
            top: centerY,
            width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
            path: centeredCommands,
            customSpeed: 6000,
            customPower: 15,
            customPasses: 1
          });
        }

        const yAxisTitleText = t('testsuite.speedUnit', "Speed (mm/min)");
        const centeredYAxisCommands = getCenteredPathCommands(font, yAxisTitleText, fontSize * 1.25);
        objects.push({
          type: 'path',
          left: startX - 32,
          top: startY + (totalH / 2),
          width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 90, layerId: 'C00',
          path: centeredYAxisCommands,
          customSpeed: 6000,
          customPower: 15,
          customPasses: 1
        });

        for (let x = 0; x < gXCount; x++) {
          const xRatio = gXCount > 1 ? x / (gXCount - 1) : 0;
          const pVal = gXMin + (gXMax - gXMin) * xRatio;
          const labelText = pVal.toFixed(0);

          const centerX = startX + (x * (gBoxWidth + gSpacing)) + (gBoxWidth / 2);
          const centeredCommands = getCenteredPathCommands(font, labelText, fontSize);

          objects.push({
            type: 'path',
            left: centerX,
            top: startY + totalH + fontSize + 4,
            width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
            path: centeredCommands,
            customSpeed: 6000,
            customPower: 15,
            customPasses: 1
          });
        }

        const xAxisTitleText = t('testsuite.powerUnit', "Power (%)");
        const centeredXAxisCommands = getCenteredPathCommands(font, xAxisTitleText, fontSize * 1.25);
        objects.push({
          type: 'path',
          left: startX + (totalW / 2),
          top: startY + totalH + fontSize * 2.5 + 4,
          width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
          path: centeredXAxisCommands,
          customSpeed: 6000,
          customPower: 15,
          customPasses: 1
        });

        const detailsText = `${t('testsuite.interval', 'Interval')}: ${gInterval.toFixed(3)} mm | ${t('testsuite.passes', 'Passes')}: ${gPasses} | ${t('testsuite.engraveLabel', 'Material Gravur Test')}`;
        const centeredDetailsCommands = getCenteredPathCommands(font, detailsText, fontSize * 1.1);
        objects.push({
          type: 'path',
          left: startX + (totalW / 2),
          top: startY + totalH + fontSize * 4 + 4,
          width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
          path: centeredDetailsCommands,
          customSpeed: 6000,
          customPower: 15,
          customPasses: 1
        });

      } else if (activeTab === 'cut') {
        const totalW = (cXCount * cBoxWidth) + ((cXCount - 1) * cSpacing);
        const totalH = (cYCount * cBoxHeight) + ((cYCount - 1) * cSpacing);
        const startX = (settings.workingSizeX / 2) - (totalW / 2);
        const startY = (settings.workingSizeY / 2) - (totalH / 2);

        const fontSize = Math.min(cBoxWidth, cBoxHeight) * 0.45;

        for (let x = 0; x < cXCount; x++) {
          for (let y = 0; y < cYCount; y++) {
            const xRatio = cXCount > 1 ? x / (cXCount - 1) : 0;
            const yRatio = cYCount > 1 ? y / (cYCount - 1) : 0;

            const passesVal = Math.round(cXMin + (cXMax - cXMin) * xRatio);
            const sVal = cYMin + (cYMax - cYMin) * yRatio;

            objects.push({
              type: 'rect',
              left: startX + (x * (cBoxWidth + cSpacing)),
              top: startY + (y * (cBoxHeight + cSpacing)),
              width: cBoxWidth,
              height: cBoxHeight,
              scaleX: 1,
              scaleY: 1,
              angle: 0,
              layerId: 'C00',
              customMode: 'Line',
              customSpeed: sVal,
              customPower: cPower,
              customPasses: passesVal
            });
          }
        }

        const rowLabelX2 = startX - 16;
        for (let y = 0; y < cYCount; y++) {
          const yRatio = cYCount > 1 ? y / (cYCount - 1) : 0;
          const sVal = cYMin + (cYMax - cYMin) * yRatio;
          const labelText = sVal.toFixed(0);

          const centerY = startY + (y * (cBoxHeight + cSpacing)) + (cBoxHeight / 2);
          const centeredCommands = getCenteredPathCommands(font, labelText, fontSize);

          objects.push({
            type: 'path',
            left: rowLabelX2,
            top: centerY,
            width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
            path: centeredCommands,
            customSpeed: 6000,
            customPower: 15,
            customPasses: 1
          });
        }

        const yAxisTitleText2 = t('testsuite.speedUnit', "Speed (mm/min)");
        const centeredYAxisCommands2 = getCenteredPathCommands(font, yAxisTitleText2, fontSize * 1.25);
        objects.push({
          type: 'path',
          left: startX - 32,
          top: startY + (totalH / 2),
          width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 90, layerId: 'C00',
          path: centeredYAxisCommands2,
          customSpeed: 6000,
          customPower: 15,
          customPasses: 1
        });

        for (let x = 0; x < cXCount; x++) {
          const xRatio = cXCount > 1 ? x / (cXCount - 1) : 0;
          const passesVal = Math.round(cXMin + (cXMax - cXMin) * xRatio);
          const labelText = `${passesVal}`;

          const centerX = startX + (x * (cBoxWidth + cSpacing)) + (cBoxWidth / 2);
          const centeredCommands = getCenteredPathCommands(font, labelText, fontSize);

          objects.push({
            type: 'path',
            left: centerX,
            top: startY + totalH + fontSize + 4,
            width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
            path: centeredCommands,
            customSpeed: 6000,
            customPower: 15,
            customPasses: 1
          });
        }

        const xAxisTitleText2 = t('testsuite.passesTitle', "Passes (Durchgänge)");
        const centeredXAxisCommands2 = getCenteredPathCommands(font, xAxisTitleText2, fontSize * 1.25);
        objects.push({
          type: 'path',
          left: startX + (totalW / 2),
          top: startY + totalH + fontSize * 2.5 + 4,
          width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
          path: centeredXAxisCommands2,
          customSpeed: 6000,
          customPower: 15,
          customPasses: 1
        });

        const detailsText2 = `${t('testsuite.power', 'Power')}: ${cPower} % | ${t('testsuite.cutLabel', 'Material Schnitt Test')}`;
        const centeredDetailsCommands2 = getCenteredPathCommands(font, detailsText2, fontSize * 1.1);
        objects.push({
          type: 'path',
          left: startX + (totalW / 2),
          top: startY + totalH + fontSize * 4 + 4,
          width: 0, height: 0, scaleX: 1, scaleY: 1, angle: 0, layerId: 'C00',
          path: centeredDetailsCommands2,
          customSpeed: 6000,
          customPower: 15,
          customPasses: 1
        });
      }

    } catch (e) {
      consoleStore.logLine(`${t('testsuite.errorGeneration', 'Fehler beim Generieren des Testmusters')}: ${e}`, 'error');
    }

    const generator = new GcodeGenerator();
    const gcode = await generator.generate(objects);

    consoleStore.logLine(t('testsuite.sendingToWorkspace', "🚀 Sende Testpattern an Arbeitsbereich..."), "info");
    window.dispatchEvent(new CustomEvent('addTestPattern', { 
      detail: { objects, gcode } 
    }));
    onClose();
  };

  const renderField = (
    label: string, 
    value: number, 
    onChange: (val: number) => void, 
    helpText: string,
    min?: number,
    max?: number,
    step?: number
  ) => {
    return (
      <div 
        style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}
        onMouseEnter={() => setHoveredHelp(helpText)}
        onMouseLeave={() => setHoveredHelp(t('testsuite.helpDefault', 'Bewege die Maus über ein Eingabefeld, um eine genaue Erklärung des Parameters anzuzeigen.'))}
      >
        <label style={{ 
          height: '32px', 
          display: 'flex', 
          alignItems: 'flex-end', 
          fontSize: '11px', 
          fontWeight: '600', 
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          paddingBottom: '2px'
        }}>
          {label}
        </label>
        <input 
          type="number" 
          className="form-input" 
          value={value === 0 ? '' : value} 
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))} 
          style={{ height: '36px' }}
        />
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-content" style={{ width: '1500px', maxWidth: '98vw', display: 'flex', flexDirection: 'column', maxHeight: '90vh', backgroundColor: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel-header)', padding: '12px 20px' }}>
          <div className="brand" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
            🧪 {t('testsuite.title', 'Laser Kalibrierungs- & Testsuite')}
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel-header)' }}>
          {(['focus', 'interval', 'engrave', 'cut'] as TabType[]).map((tab) => {
            const labels = {
              focus: t('testsuite.tabFocus', '1. Fokus-Test (Z-Achse)'),
              interval: t('testsuite.tabInterval', '2. Intervall-Test (Dichte)'),
              engrave: t('testsuite.tabEngrave', '3. Gravur-Test (Matrix)'),
              cut: t('testsuite.tabCut', '4. Schnitt-Test (Matrix)')
            };
            const isActive = activeTab === tab;
            return (
              <button 
                key={tab}
                style={{ 
                  flex: 1, padding: '12px', background: 'transparent', border: 'none', 
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)', 
                  fontWeight: '600', cursor: 'pointer', fontSize: '12px',
                  borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                  backgroundColor: isActive ? 'var(--bg-panel)' : 'transparent',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => setActiveTab(tab)}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        <div className="modal-body" style={{ display: 'flex', gap: '24px', padding: '24px', overflowY: 'auto' }}>
          
          <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {activeTab === 'focus' && (
              <>
                <h4 className="form-label" style={{ color: 'var(--accent-cyan)', margin: 0 }}>{t('testsuite.focusZProfile', 'Z-Achsen Fokus Profil')}</h4>
                <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-input)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {renderField(t('testsuite.startHeight', "Starthöhe (mm)"), zStart, setZStart, t('testsuite.helpStartHeight', "Die Start-Höhe der Z-Achse für den ersten Strich des Tests in mm. Hilft, den perfekten Fokuspunkt zu ermitteln."))}
                  {renderField(t('testsuite.endHeight', "Endhöhe (mm)"), zEnd, setZEnd, t('testsuite.helpEndHeight', "Die End-Höhe der Z-Achse für den letzten Strich des Tests in mm."))}
                  {renderField(t('testsuite.stepsLines', "Schritte (Zeilen)"), focusSteps, setFocusSteps, t('testsuite.helpStepsLines', "Die Anzahl der gezeichneten Testlinien zwischen Start- und Endhöhe."))}
                  <div 
                    style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'flex-end', paddingBottom: '8px' }}
                    onMouseEnter={() => setHoveredHelp(t('testsuite.helpAutoZ', "Aktivieren, wenn dein Laser über eine vom Controller steuerbare, motorisierte Z-Achse verfügt."))}
                    onMouseLeave={() => setHoveredHelp(t('testsuite.helpDefault', 'Bewege die Maus über ein Eingabefeld, um eine genaue Erklärung des Parameters anzuzeigen.'))}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', color: 'var(--text-main)' }}>
                      <input type="checkbox" checked={focusMotorized} onChange={e => setFocusMotorized(e.target.checked)} />
                      {t('testsuite.autoZ', 'Auto Z-Achse')}
                    </label>
                  </div>
                </div>

                <h4 className="form-label" style={{ color: 'var(--accent-cyan)', margin: 0 }}>{t('testsuite.geometryParams', 'Geometrie & Laser-Parameter')}</h4>
                <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-input)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {renderField(t('testsuite.lineLength', "Linienlänge (mm)"), focusLineLength, setFocusLineLength, t('testsuite.helpLineLength', "Länge jeder einzelnen horizontalen Testlinie auf dem Werkstück in mm."))}
                  {renderField(t('testsuite.lineSpacing', "Linienabstand (mm)"), focusSpacing, setFocusSpacing, t('testsuite.helpLineSpacing', "Der vertikale Abstand zwischen den einzelnen Fokus-Testlinien in mm."))}
                  {renderField(t('testsuite.speed', "Speed (mm/min)"), focusSpeed, setFocusSpeed, t('testsuite.helpSpeed', "Die Verfahrgeschwindigkeit des Lasers für den Fokus-Test in mm/min."))}
                  {renderField(t('testsuite.power', "Leistung (%)"), focusPower, setFocusPower, t('testsuite.helpPower', "Die konstante Laserintensität für alle Fokuslinien von 10% bis 100%."))}
                </div>

                <h4 className="form-label" style={{ color: 'var(--accent-cyan)', margin: 0, marginTop: '8px' }}>{t('testsuite.saveResult', 'Ergebnis Sichern')}</h4>
                <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-input)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('testsuite.saveZHeight', 'Perfekte Z-Höhe eintragen (mm)')}</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={settingsState.optimalFocusZ === 0 ? '' : settingsState.optimalFocusZ} 
                      onChange={e => settingsStore.updateSettings({ optimalFocusZ: e.target.value === '' ? 0 : Number(e.target.value) })}
                      style={{ height: '36px' }}
                    />
                  </div>
                  {settingsState.optimalFocusZ > 0 && (
                    <div style={{ padding: '8px 12px', color: 'var(--accent-green)', backgroundColor: 'var(--bg-panel-header)', border: '1px solid var(--accent-green)', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                      ✅ {t('testsuite.saved', 'Gespeichert')} ({settingsState.optimalFocusZ} mm)
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'interval' && (
              <>
                <h4 className="form-label" style={{ color: 'var(--accent-cyan)', margin: 0 }}>{t('testsuite.intervalProfile', 'Intervall Profil (Gravurdichte)')}</h4>
                <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-input)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {renderField(t('testsuite.minInterval', "Min. Intervall (mm)"), intMin, setIntMin, t('testsuite.helpMinInterval', "Der geringste Zeilenabstand beim Rastern in mm. Kleinere Werte ergeben sehr dichte Gravuren."))}
                  {renderField(t('testsuite.maxInterval', "Max. Intervall (mm)"), intMax, setIntMax, t('testsuite.helpMaxInterval', "Der größte Zeilenabstand beim Rastern in mm. Größere Werte lassen Lücken sichtbar werden."))}
                  {renderField(t('testsuite.stepsBoxes', "Schritte (Kacheln)"), intSteps, setIntSteps, t('testsuite.helpStepsBoxes', "Die Anzahl der gezeichneten Testkacheln mit unterschiedlichen Rasterdichten."))}
                </div>

                <h4 className="form-label" style={{ color: 'var(--accent-cyan)', margin: 0 }}>{t('testsuite.geometryParams', 'Geometrie & Laser-Parameter')}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: 'var(--bg-input)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {renderField(t('testsuite.boxSize', "Quadratgröße (mm)"), intBoxSize, setIntBoxSize, t('testsuite.helpBoxSize', "Kantenlänge der quadratischen Testkacheln für den Intervalltest in mm."))}
                  {renderField(t('testsuite.spacing', "Abstand (mm)"), intSpacing, setIntSpacing, t('testsuite.helpSpacing', "Der horizontale Abstand zwischen den Kacheln auf der Arbeitsfläche."))}
                  {renderField(t('testsuite.speed', "Speed (mm/min)"), intSpeed, setIntSpeed, t('testsuite.helpSpeed', "Die Verfahrgeschwindigkeit des Lasers beim Füllen der Quadrate in mm/min."))}
                  {renderField(t('testsuite.power', "Leistung (%)"), intPower, setIntPower, t('testsuite.helpPower', "Die konstante Laserleistung für alle Testquadrate in %."))}
                </div>
              </>
            )}

            {activeTab === 'engrave' && (
              <>
                <h4 className="form-label" style={{ color: 'var(--accent-cyan)', margin: 0 }}>{t('testsuite.engraveMatrix', 'Leistungs- & Geschwindigkeitsmatrix')}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', background: 'var(--bg-input)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {renderField(t('testsuite.colsPower', "Spalten (Power)"), gXCount, setGXCount, t('testsuite.helpColsPower', "Anzahl der Testkacheln auf der horizontalen Achse (Leistungseinstellungen)."))}
                  {renderField(t('testsuite.minPower', "Min. Power (%)"), gXMin, setGXMin, t('testsuite.helpMinPower', "Niedrigste getestete Laserleistung auf der linken Seite des Grids."))}
                  {renderField(t('testsuite.maxPower', "Max. Power (%)"), gXMax, setGXMax, t('testsuite.helpMaxPower', "Höchste getestete Laserleistung auf der rechten Seite des Grids."))}
                  {renderField(t('testsuite.rowsSpeed', "Reihen (Speed)"), gYCount, setGYCount, t('testsuite.helpRowsSpeed', "Anzahl der Testkacheln auf der vertikalen Achse (Geschwindigkeitseinstellungen)."))}
                  {renderField(t('testsuite.minSpeed', "Min. Speed (mm/min)"), gYMin, setGYMin, t('testsuite.helpMinSpeed', "Niedrigste Geschwindigkeit unten auf dem Grid in mm/min."))}
                  {renderField(t('testsuite.maxSpeed', "Max. Speed (mm/min)"), gYMax, setGYMax, t('testsuite.helpMaxSpeed', "Höchste Geschwindigkeit oben auf dem Grid in mm/min."))}
                </div>

                <h4 className="form-label" style={{ color: 'var(--accent-cyan)', margin: 0 }}>{t('testsuite.gridTuning', 'Grid- & Gravur-Feinabstimmung')}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', background: 'var(--bg-input)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {renderField(t('testsuite.width', "Breite (mm)"), gBoxWidth, setGBoxWidth, t('testsuite.helpWidth', "Die Breite jeder einzelnen Testkachel im Grid."))}
                  {renderField(t('testsuite.height', "Höhe (mm)"), gBoxHeight, setGBoxHeight, t('testsuite.helpHeight', "Die Höhe jeder einzelnen Testkachel im Grid."))}
                  {renderField(t('testsuite.spacingXY', "Abstand (mm)"), gSpacing, setGSpacing, t('testsuite.helpSpacingXY', "Der Abstand zwischen den einzelnen Testkacheln."))}
                  {renderField(t('testsuite.interval', "Interval (mm)"), gInterval, setGInterval, t('testsuite.helpInterval', "Der Linienabstand beim Rastern in mm. (Standard: 0.08 für Diodenlaser)."))}
                  {renderField(t('testsuite.passes', "Passes (Durchläufe)"), gPasses, setGPasses, t('testsuite.helpPasses', "Anzahl der Wiederholungen für jede Kachel."))}
                </div>
              </>
            )}

            {activeTab === 'cut' && (
              <>
                <h4 className="form-label" style={{ color: 'var(--accent-cyan)', margin: 0 }}>{t('testsuite.cutMatrix', 'Schnittmatrix (Speed vs Passes)')}</h4>
                <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-input)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {renderField(t('testsuite.colsPasses', "Spalten (Passes)"), cXCount, setCXCount, t('testsuite.helpColsPasses', "Anzahl der Spalten auf der horizontalen Achse (Anzahl Durchgänge)."))}
                  {renderField(t('testsuite.minPasses', "Min. Passes"), cXMin, setCXMin, t('testsuite.helpMinPasses', "Niedrigste Anzahl der Durchgänge auf der linken Seite des Grids."))}
                  {renderField(t('testsuite.maxPasses', "Max. Passes"), cXMax, setCXMax, t('testsuite.helpMaxPasses', "Höchste Anzahl der Durchgänge auf der rechten Seite des Grids."))}
                  {renderField(t('testsuite.rowsSpeed', "Reihen (Speed)"), cYCount, setGYCount, t('testsuite.helpRowsSpeed', "Anzahl der Reihen auf der vertikalen Achse (Geschwindigkeiten)."))}
                  {renderField(t('testsuite.minSpeed', "Min. Speed (mm/min)"), cYMin, setCYMin, t('testsuite.helpMinSpeed', "Niedrigste Geschwindigkeit unten auf dem Grid in mm/min."))}
                  {renderField(t('testsuite.maxSpeed', "Max. Speed (mm/min)"), cYMax, setCYMax, t('testsuite.helpMaxSpeed', "Höchste Geschwindigkeit oben auf dem Grid in mm/min."))}
                </div>

                <h4 className="form-label" style={{ color: 'var(--accent-cyan)', margin: 0 }}>{t('testsuite.cutConstants', 'Grid- & Schnitt-Konstanten')}</h4>
                <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-input)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {renderField(t('testsuite.width', "Breite (mm)"), cBoxWidth, setCBoxWidth, t('testsuite.helpCutWidth', "Breite der einzelnen Schnittkacheln im Grid in mm."))}
                  {renderField(t('testsuite.height', "Höhe (mm)"), cBoxHeight, setCBoxHeight, t('testsuite.helpCutHeight', "Höhe der einzelnen Schnittkacheln im Grid in mm."))}
                  {renderField(t('testsuite.spacing', "Abstand (mm)"), cSpacing, setCSpacing, t('testsuite.helpCutSpacing', "Abstand zwischen den Kacheln im Grid in mm."))}
                  {renderField(t('testsuite.constPower', "Konstante Leistung (%)"), cPower, setCPower, t('testsuite.helpConstPower', "Laserleistung für alle Schnitttests in % (Empfohlen: 100%)."))}
                </div>
              </>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-active)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: '1.45',
              color: 'var(--text-muted)',
              minHeight: '64px',
              marginTop: '4px'
            }}>
              <span style={{ fontSize: '18px', color: 'var(--accent-cyan)' }}>ℹ️</span>
              <span>{hoveredHelp}</span>
            </div>

          </div>

          <div style={{ flex: 1.0, backgroundColor: 'var(--bg-panel-header)', borderRadius: '6px', padding: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              💡 {t('testsuite.sequenceTitle', 'Ablauf-Reihenfolge')}
            </h4>
            <p style={{ fontSize: '11.5px', lineHeight: '1.5', margin: 0, color: 'var(--text-muted)' }}>
              {t('testsuite.sequenceDesc', 'Für perfekte, brandspurfreie Laser-Ergebnisse gehe die Tests am besten Schritt für Schritt durch:')}
            </p>
            
            <ol style={{ fontSize: '11px', paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', color: 'var(--text-muted)' }}>
              <li style={{ color: settingsState.optimalFocusZ > 0 ? 'var(--accent-green)' : (activeTab === 'focus' ? 'var(--text-main)' : 'inherit'), opacity: activeTab === 'focus' || settingsState.optimalFocusZ > 0 ? 1 : 0.75 }}>
                <strong style={{ color: settingsState.optimalFocusZ > 0 ? 'var(--accent-green)' : (activeTab === 'focus' ? 'var(--accent-cyan)' : 'inherit') }}>{settingsState.optimalFocusZ > 0 ? '✅ ' : ''}{t('testsuite.focusStep', '1. Fokus-Test:')}</strong> {t('testsuite.focusDesc', 'Finde die optimale mechanische Höhe. Ein perfekt fokussierter Punkt verbrennt feiner und schneidet tiefer.')}
              </li>
              <li style={{ color: activeTab === 'interval' ? 'var(--text-main)' : 'inherit', opacity: activeTab === 'interval' ? 1 : 0.75 }}>
                <strong style={{ color: activeTab === 'interval' ? 'var(--accent-cyan)' : 'inherit' }}>{t('testsuite.intervalStep', '2. Intervall-Test:')}</strong> {t('testsuite.intervalDesc', 'Finde den optimalen Linienabstand (mm). Zu dicht verbrennt Holz; zu weit hinterlässt Streifen.')}
              </li>
              <li style={{ color: activeTab === 'engrave' ? 'var(--text-main)' : 'inherit', opacity: activeTab === 'engrave' ? 1 : 0.75 }}>
                <strong style={{ color: activeTab === 'engrave' ? 'var(--accent-cyan)' : 'inherit' }}>{t('testsuite.engraveStep', '3. Gravur-Test:')}</strong> {t('testsuite.engraveDesc', 'Ermittle deine Graustufen/Farbtöne über Leistung und Geschwindigkeit im homogenen Raster-Modus.')}
              </li>
              <li style={{ color: activeTab === 'cut' ? 'var(--text-main)' : 'inherit', opacity: activeTab === 'cut' ? 1 : 0.75 }}>
                <strong style={{ color: activeTab === 'cut' ? 'var(--accent-cyan)' : 'inherit' }}>{t('testsuite.cutStep', '4. Schnitt-Test:')}</strong> {t('testsuite.cutDesc', 'Ermittle die optimalen Durchgänge bei konstanter 100% Leistung, um dein Material sauber zu durchtrennen.')}
              </li>
            </ol>
            
            {activeTab === 'focus' && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-input)', padding: '12px', borderRadius: '6px' }}>
                <h5 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '11px', fontWeight: 'bold' }}>{t('testsuite.perfectFocusTitle', 'Woran erkenne ich den perfekten Fokus?')}</h5>
                <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {t('testsuite.perfectFocusDesc', 'Der perfekte Fokus (Punkt A) ist die absolut feinste, dünnste und dunkelste Linie. Wenn der Laser zu hoch oder zu niedrig ist, wird der Punkt breiter und blasser (Punkt B). Wähle die Z-Höhe, die die schärfste Linie erzeugt.')}
                </p>
                <img src="/perfect_laser_focus.png" alt="Laser Focus Diagram" style={{ width: '70%', alignSelf: 'center', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '4px' }} />
              </div>
            )}

            {activeTab === 'interval' && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-input)', padding: '12px', borderRadius: '6px' }}>
                <h5 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '11px', fontWeight: 'bold' }}>{t('testsuite.intervalExplanationTitle', 'Woran erkenne ich das perfekte Intervall?')}</h5>
                <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {t('testsuite.intervalExplanationDesc', 'Der optimale Linienabstand (Intervall) hängt von der tatsächlichen Breite des Laserstrahls (Kerf) ab. Ist der Abstand zu gering, überlappen die Linien stark und verbrennen das Material. Ist der Abstand zu groß, bleiben ungelaserte Lücken (Streifen) sichtbar. Der perfekte Wert sorgt für eine dichte, durchgehend homogene Fläche ohne Überlappung.')}
                </p>
                <img src="/interval_test_diagram.png" alt="Laser Interval Diagram" style={{ width: '70%', alignSelf: 'center', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '4px' }} />
              </div>
            )}

            <div style={{ marginTop: 'auto', padding: '12px', backgroundColor: 'var(--bg-active)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '11px', lineHeight: '1.45', color: 'var(--accent-orange)' }}>
              <h5 style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>⚠️ {t('testsuite.executionTitle', 'Ausführung')}</h5>
              {t('testsuite.executionDesc', 'Nach dem Klick wird das fertige Testmuster geladen und mittig zentriert auf deiner Arbeitsfläche positioniert. Du kannst es direkt ausführen.')}
            </div>
          </div>

        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel-header)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn" onClick={onClose} style={{ padding: '8px 24px', fontSize: '13px' }}>{t('common.cancel', 'Abbrechen')}</button>
          <button 
            className="btn btn-primary" 
            onClick={handleGenerate}
            style={{ 
              padding: '8px 24px', 
              fontSize: '13px', 
              fontWeight: 'bold', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              backgroundColor: 'var(--accent-cyan)',
              color: '#000',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,255,255,0.2)'
            }}
          >
            {t('testsuite.generateBtn', 'Testmuster generieren')}
          </button>
        </div>
      </div>
    </div>
  );
};
