import React, { useState, useEffect, useRef, useMemo } from 'react';
import { settingsStore } from '../stores/settingsStore';
import { layersStore } from '../stores/layersStore';
import { uiStore } from '../stores/uiStore';
import { useStore } from '../stores/store';
import { gcodeGen } from '../gcode/GcodeGenerator';

interface GcodeSimulatorModalProps {
  gcode: string;
  onClose: () => void;
}

interface PathSegment {
  lineIndex: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isLaserOn: boolean;
  color: string;
  speed: number;
  power: number;
}

export const GcodeSimulatorModal: React.FC<GcodeSimulatorModalProps> = ({ gcode, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showTravel, setShowTravel] = useState<boolean>(true);
  const [currentLine, setCurrentLine] = useState<number>(0);
  const playIntervalRef = useRef<number | null>(null);

  const settings = settingsStore.get();
  const machineW = settings.workingSizeX || 300;
  const machineH = settings.workingSizeY || 300;

  // Berechne die geschätzte Gesamtdauer des G-Codes
  const totalTimeSeconds = useMemo(() => {
    return gcodeGen.estimateTime(gcode);
  }, [gcode]);

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const uiState = useStore(uiStore);
  const isLight = uiState.theme === 'light';

  // State für Pan & Zoom
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const zoomSensitivity = 0.002;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(0.1, scale * (1 + delta)), 20);
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = newScale / scale;
      
      setOffset(prev => ({
        x: mouseX - (mouseX - prev.x) * factor,
        y: mouseY - (mouseY - prev.y) * factor
      }));
    }
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // G-Code parsen
  const { segments, lines } = useMemo(() => {
    const lines = gcode.split('\n');
    const segments: PathSegment[] = [];
    let x = 0, y = 0;
    let isLaserOn = false;
    let currentLayerId = 'C00';
    let currentLayerColor = '#00f0ff'; // default cyan
    let currentSpeed = 3000;
    let currentPower = 0;
    let absoluteMode = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line) continue;

      // Layer Kommentare auswerten
      if (line.startsWith(';')) {
        const layerMatch = line.match(/Layer\s+(C\d+)\s+Start/i) || line.match(/Ebene:\s+.*?\((C\d+)\)/i);
        if (layerMatch) {
          currentLayerId = layerMatch[1];
          const layers = layersStore.get();
          if (layers[currentLayerId]) {
            currentLayerColor = layers[currentLayerId].color;
          }
        }
        continue;
      }

      // Modus G90/G91
      if (/\bG90\b/.test(line)) absoluteMode = true;
      if (/\bG91\b/.test(line)) absoluteMode = false;

      // Laser State
      if (line.includes('M4') || line.includes('M3')) {
        isLaserOn = true;
        const sMatch = line.match(/S\s*([\d.]+)/);
        if (sMatch) currentPower = parseFloat(sMatch[1]);
      }
      if (line.includes('M5')) {
        isLaserOn = false;
        currentPower = 0;
      }

      // Koordinaten
      let newX = x;
      let newY = y;
      let moved = false;

      if (line.startsWith('G0') || line.startsWith('G1') || line.startsWith('G2') || line.startsWith('G3')) {
        const isArc = line.startsWith('G2') || line.startsWith('G3');
        const isClockwise = line.startsWith('G2');

        const xMatch = line.match(/X\s*([\d.-]+)/);
        const yMatch = line.match(/Y\s*([\d.-]+)/);
        const iMatch = line.match(/I\s*([\d.-]+)/);
        const jMatch = line.match(/J\s*([\d.-]+)/);
        const fMatch = line.match(/F\s*([\d.]+)/);
        const sMatch = line.match(/S\s*([\d.]+)/);

        if (fMatch) currentSpeed = parseFloat(fMatch[1]);
        if (sMatch) currentPower = parseFloat(sMatch[1]);

        if (xMatch) {
          const xVal = parseFloat(xMatch[1]);
          newX = absoluteMode ? xVal : x + xVal;
        }
        if (yMatch) {
          const yVal = parseFloat(yMatch[1]);
          newY = absoluteMode ? yVal : y + yVal;
        }

        if (isArc && iMatch) {
          const iVal = parseFloat(iMatch[1]);
          const jVal = jMatch ? parseFloat(jMatch[1]) : 0;
          
          const cx = x + iVal;
          const cy = y + jVal;
          const r = Math.sqrt(iVal * iVal + jVal * jVal);
          
          let startAngle = Math.atan2(y - cy, x - cx);
          let endAngle = Math.atan2(newY - cy, newX - cx);
          
          if (isClockwise && endAngle > startAngle) endAngle -= 2 * Math.PI;
          if (!isClockwise && endAngle < startAngle) endAngle += 2 * Math.PI;
          
          // Approx 1 segment per mm, minimum 12 segments
          const numSegments = Math.max(12, Math.floor(Math.abs(endAngle - startAngle) * r));
          
          let lastArcX = x;
          let lastArcY = y;
          for (let step = 1; step <= numSegments; step++) {
            const angle = startAngle + (endAngle - startAngle) * (step / numSegments);
            const segX = cx + r * Math.cos(angle);
            const segY = cy + r * Math.sin(angle);
            
            segments.push({
              lineIndex: i,
              x1: lastArcX,
              y1: lastArcY,
              x2: segX,
              y2: segY,
              isLaserOn: isLaserOn,
              color: currentLayerColor,
              speed: currentSpeed,
              power: currentPower
            });
            lastArcX = segX;
            lastArcY = segY;
          }
          moved = true; // Wir haben die Bewegung bereits als Segmente gepusht
          // Verhindere das erneute pushen des linearen Segments
          newX = x = lastArcX;
          newY = y = lastArcY;
        } else {
          // Normaler linearer Move
          if (newX !== x || newY !== y) {
            moved = true;
          }
        }
      }

      if (moved && (newX !== x || newY !== y)) {
        segments.push({
          lineIndex: i,
          x1: x,
          y1: y,
          x2: newX,
          y2: newY,
          isLaserOn: isLaserOn && !line.startsWith('G0'),
          color: currentLayerColor,
          speed: currentSpeed,
          power: currentPower
        });
        x = newX;
        y = newY;
      }
    }
    return { segments, lines };
  }, [gcode]);

  // Finde das Segment, das dem aktuellen Scrubber-Zustand entspricht
  const activeSegment = useMemo(() => {
    let lastSeg = null;
    for (const seg of segments) {
      if (seg.lineIndex <= currentLine) {
        lastSeg = seg;
      } else {
        break;
      }
    }
    return lastSeg;
  }, [segments, currentLine]);

  // Canvas Zeichen-Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive Canvas
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    // Basisskalierung und Zentrierung berechnen, damit Maschine anfangs komplett sichtbar ist
    const margin = 60; 
    const availableW = canvas.width - margin;
    const availableH = canvas.height - margin;
    const baseScaleX = availableW / machineW;
    const baseScaleY = availableH / machineH;
    const baseScale = Math.min(baseScaleX, baseScaleY);
    
    const centeredOffsetX = margin + (availableW - machineW * baseScale) / 2;
    const centeredOffsetY = margin + (availableH - machineH * baseScale) / 2;

    const finalScale = baseScale * scale;
    const finalOffsetX = centeredOffsetX + offset.x;
    const finalOffsetY = centeredOffsetY + offset.y;

    const transformY = (yMm: number) => {
      let y = machineH - yMm;
      if (settings.origin === 'Center') {
        y = (machineH / 2 - yMm);
      }
      return finalOffsetY + y * finalScale;
    };

    const transformX = (xMm: number) => {
      let x = xMm;
      if (settings.origin === 'Center') {
        x = (machineW / 2 + xMm);
      }
      return finalOffsetX + x * finalScale;
    };

    // Farbschema
    const gridColor = isLight ? '#e2e8f0' : '#1f293d';
    const rulerColor = isLight ? '#475569' : '#00f0ff';
    const machineBgFill = isLight ? '#ffffff' : '#111827';
    const machineBgStroke = isLight ? '#64748b' : '#00f0ff';
    const canvasBg = isLight ? '#f1f5f9' : '#070a13';
    const rulerBg = isLight ? '#e2e8f0' : '#0f172a';

    // Canvas Background
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Machine Background
    ctx.fillStyle = machineBgFill;
    ctx.fillRect(finalOffsetX, finalOffsetY, machineW * finalScale, machineH * finalScale);
    ctx.strokeStyle = machineBgStroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(finalOffsetX, finalOffsetY, machineW * finalScale, machineH * finalScale);

    // Raster Zeichnen
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridSpacing = 10; // alle 10mm ein Strich
    
    let xMin = 0, xMax = machineW, yMin = 0, yMax = machineH;
    if (settings.origin === 'Center') {
      xMin = -machineW / 2; xMax = machineW / 2;
      yMin = -machineH / 2; yMax = machineH / 2;
    }

    for (let xVal = xMin; xVal <= xMax; xVal += gridSpacing) {
      const px = transformX(xVal);
      ctx.moveTo(px, finalOffsetY);
      ctx.lineTo(px, finalOffsetY + machineH * finalScale);
    }
    for (let yVal = yMin; yVal <= yMax; yVal += gridSpacing) {
      const py = transformY(yVal);
      ctx.moveTo(finalOffsetX, py);
      ctx.lineTo(finalOffsetX + machineW * finalScale, py);
    }
    ctx.stroke();

    // Mittellinien bei Center-Origin zeichnen
    if (settings.origin === 'Center') {
      ctx.strokeStyle = isLight ? '#94a3b8' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(transformX(0), finalOffsetY);
      ctx.lineTo(transformX(0), finalOffsetY + machineH * finalScale);
      ctx.moveTo(finalOffsetX, transformY(0));
      ctx.lineTo(finalOffsetX + machineW * finalScale, transformY(0));
      ctx.stroke();
    }

    let lastPxX = transformX(0);
    let lastPxY = transformY(0);

    // Segmente rendern
    for (const seg of segments) {
      if (seg.lineIndex > currentLine) break;

      const px1 = transformX(seg.x1);
      const py1 = transformY(seg.y1);
      const px2 = transformX(seg.x2);
      const py2 = transformY(seg.y2);

      if (seg.isLaserOn && seg.power > 0) {
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        
        // Opazität basierend auf Power berechnen
        const opacity = Math.max(0.05, seg.power / 1000);
        ctx.globalAlpha = opacity;
        
        ctx.strokeStyle = seg.color;
        
        // Dicke skaliert mit der Intensität leicht
        ctx.lineWidth = 1 + (seg.power / 1000) * 1.5; 
        ctx.setLineDash([]);
        ctx.stroke();
        
        // Reset Alpha
        ctx.globalAlpha = 1.0;
      } else if (showTravel) {
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)'; // Faint red for travel
        ctx.lineWidth = 1.0;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
      }

      lastPxX = px2;
      lastPxY = py2;
    }
    ctx.setLineDash([]);

    // Laserpunkt / Kopf zeichnen (Bambu Style)
    const isLaserFiring = activeSegment ? activeSegment.isLaserOn : false;

    // Äußere Ringe des Lasers
    ctx.beginPath();
    ctx.arc(lastPxX, lastPxY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = isLaserFiring ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.1)';
    ctx.fill();
    ctx.strokeStyle = isLaserFiring ? '#0284c7' : '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Zentraler Laserpunkt
    ctx.beginPath();
    ctx.arc(lastPxX, lastPxY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = isLaserFiring ? '#38bdf8' : '#ffffff';
    ctx.fill();
    
    // Kleiner Fadenkreuzindikator
    if (isLaserFiring) {
      ctx.beginPath();
      ctx.moveTo(lastPxX - 12, lastPxY);
      ctx.lineTo(lastPxX + 12, lastPxY);
      ctx.moveTo(lastPxX, lastPxY - 12);
      ctx.lineTo(lastPxX, lastPxY + 12);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Bemaßungen (Rulers)
    ctx.fillStyle = rulerBg;
    ctx.fillRect(0, 0, canvas.width, 24); // Top Ruler
    ctx.fillRect(0, 0, 24, canvas.height); // Left Ruler
    
    ctx.fillStyle = rulerColor;
    ctx.strokeStyle = rulerColor;
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Top Ruler Ticks (X Axis)
    ctx.beginPath();
    for (let xVal = xMin; xVal <= xMax; xVal += gridSpacing) {
      const px = transformX(xVal);
      if (px > 24 && px < canvas.width) {
        ctx.moveTo(px, 24);
        ctx.lineTo(px, 16);
        if (xVal % 50 === 0) {
          ctx.fillText(xVal.toString(), px, 4);
        }
      }
    }
    ctx.stroke();
    
    // Left Ruler Ticks (Y Axis)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.beginPath();
    for (let yVal = yMin; yVal <= yMax; yVal += gridSpacing) {
      const py = transformY(yVal);
      if (py > 24 && py < canvas.height) {
        ctx.moveTo(24, py);
        ctx.lineTo(16, py);
        if (yVal % 50 === 0) {
          ctx.fillText(yVal.toString(), 14, py);
        }
      }
    }
    ctx.stroke();
    
    // Ruler Border Corner
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(canvas.width, 24);
    ctx.moveTo(24, 0);
    ctx.lineTo(24, canvas.height);
    ctx.stroke();

  }, [currentLine, segments, machineW, machineH, showTravel, activeSegment, settings.origin, isLight, scale, offset]);

  // Player Play/Pause Taktgeber
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        setCurrentLine((prev) => {
          if (prev >= lines.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          let next = prev + 1;
          // Überspringe Kommentare und Leerzeilen beim automatischen Abspielen für schnellen Flow
          while (next < lines.length - 1 && (lines[next].trim() === '' || lines[next].trim().startsWith(';'))) {
            next++;
          }
          return next;
        });
      }, 30);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, lines.length]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '95vw', maxWidth: '1400px', height: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
        
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '12px 20px', backgroundColor: 'var(--bg-panel-header)' }}>
          <h3 className="modal-title" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 'bold' }}>
            <span>📊</span> Laser G-Code Simulation
          </h3>
          <button className="modal-close" onClick={onClose} style={{ color: 'var(--text-muted)' }}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden', padding: '16px' }}>
          
          {/* Linke Spalte: Live View und Steuerung */}
          <div style={{ flex: '3', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
            
            {/* Visualizer-HUD */}
            <div 
              style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isLight ? '#f1f5f9' : '#020617', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden', cursor: isDragging.current ? 'grabbing' : 'grab' }} 
              ref={containerRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              
              {/* Telemetrie-Overlay (HUD) */}
              <div style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(4px)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px', zIndex: 10 }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 'bold' }}>Live-HUD</div>
                <div style={{ fontSize: '12px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Position:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    X: {activeSegment ? activeSegment.x2.toFixed(1) : '0.0'} Y: {activeSegment ? activeSegment.y2.toFixed(1) : '0.0'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Vorschub:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#a855f7' }}>
                    {activeSegment ? activeSegment.speed : '0'} mm/min
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Laser:</span>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: 'bold', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    backgroundColor: activeSegment && activeSegment.isLaserOn ? 'rgba(56, 189, 248, 0.15)' : 'rgba(71, 85, 105, 0.2)', 
                    color: activeSegment && activeSegment.isLaserOn ? '#38bdf8' : '#94a3b8' 
                  }}>
                    {activeSegment && activeSegment.isLaserOn ? 'AN (Blue)' : 'AUS'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Leistung:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#e11d48' }}>
                    {activeSegment ? Math.round((activeSegment.power / 1000) * 100) : '0'}% ({activeSegment ? activeSegment.power : '0'})
                  </span>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                <div style={{ fontSize: '12px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dauer:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {formatTime(totalTimeSeconds)}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Restzeit:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)' }}>
                    {formatTime(totalTimeSeconds * (1 - (currentLine / Math.max(1, lines.length - 1))))}
                  </span>
                </div>
              </div>

              {/* Canvas */}
              <canvas ref={canvasRef} style={{ backgroundColor: 'transparent' }} />
            </div>

            {/* Scrubber & Simulation Speed Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-panel-header)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  className={`btn ${isPlaying ? 'btn-cyan' : 'btn-primary'}`} 
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{ width: '44px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>

                <input 
                  type="range" 
                  min={0} 
                  max={lines.length - 1} 
                  value={currentLine} 
                  onChange={(e) => {
                    setCurrentLine(parseInt(e.target.value));
                    setIsPlaying(false);
                  }}
                  style={{ flex: 1, cursor: 'pointer', height: '6px' }}
                />

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '70px', textAlign: 'right' }}>
                  Line {currentLine} / {lines.length - 1}
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '56px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={showTravel} 
                    onChange={(e) => setShowTravel(e.target.checked)} 
                  />
                  Eilgangspfade anzeigen (Rot gestrichelt)
                </label>
              </div>
            </div>

          </div>

          {/* Rechte Spalte: Befehlsliste (G-Code lines) */}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-panel-header)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '12px', overflow: 'hidden' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 'bold' }}>
              G-Code Stream
            </h4>
            
            <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {lines.map((line, idx) => {
                const isActive = idx === currentLine;
                const isComment = line.startsWith(';');
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: '3px 6px', 
                      borderRadius: '4px',
                      backgroundColor: isActive ? 'var(--accent-cyan-fade)' : 'transparent',
                      color: isActive ? 'var(--accent-cyan)' : isComment ? 'var(--text-muted)' : 'var(--text-main)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setCurrentLine(idx);
                      setIsPlaying(false);
                    }}
                    ref={el => {
                      if (isActive && el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                  >
                    <span style={{ color: '#334155', marginRight: '8px', userSelect: 'none' }}>{idx}</span>
                    {line}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
