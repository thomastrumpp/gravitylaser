import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from './lib/stores/store';
import { connectionStore } from './lib/stores/connectionStore';
import { uiStore } from './lib/stores/uiStore';
import { gcodeStreamer } from './lib/gcode/GcodeStreamer';
import { canvasStore } from './lib/stores/canvasStore';
import { consoleStore } from './lib/stores/consoleStore';
import { GcodeProjectService } from './lib/services/GcodeProjectService';
import { gcodeGen } from './lib/gcode/GcodeGenerator';
import { PrintAndCutService } from './lib/services/PrintAndCutService';

// Importiere Komponenten
import { CanvasToolbar } from './lib/canvas/CanvasToolbar';
import { LaserCanvas } from './lib/canvas/LaserCanvas';
import { Console } from './lib/panels/Console';
import { TopToolbar } from './lib/panels/TopToolbar';
import { LayerPanel } from './lib/panels/LayerPanel';
import { MachineControl } from './lib/panels/MachineControl';
import { PropertiesPanel } from './lib/panels/PropertiesPanel';
import { MachineSettingsModal } from './lib/panels/MachineSettingsModal';
import { GcodeSimulatorModal } from './lib/panels/GcodeSimulatorModal';
import { PersistentJobPanel } from './lib/panels/PersistentJobPanel';
import { TimelinePanel } from './lib/panels/TimelinePanel';
import { BarcodeModal } from './lib/panels/BarcodeModal';
import { BatchProductionModal } from './lib/panels/BatchProductionModal';
import { PrintAndCutWizard } from './lib/panels/PrintAndCutWizard';
import { CameraAlignmentWizard } from './lib/panels/CameraAlignmentWizard';
import { NestingModal } from './lib/panels/NestingModal';
import { MacroPanel } from './lib/panels/MacroPanel';
import { WebToolImporterModal } from './lib/panels/WebToolImporterModal';
import { TestsuiteModal } from './lib/panels/TestsuiteModal';
import { LanguageSwitcher } from './lib/ui/LanguageSwitcher';

const App: React.FC = () => {
  const { t } = useTranslation();
  const connState = useStore(connectionStore);
  const { activeSidebarTab, theme } = useStore(uiStore);
  const { isCollapsed: isConsoleCollapsed } = useStore(consoleStore);

  // Modal Steuerung
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'verbindung' | 'general' | 'materials' | 'wlan' | 'kamera'>('verbindung');
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isPrintCutOpen, setIsPrintCutOpen] = useState(false);
  const [isCameraAlignOpen, setIsCameraAlignOpen] = useState(false);
  const [isNestingOpen, setIsNestingOpen] = useState(false);
  const [isWebImportOpen, setIsWebImportOpen] = useState(false);
  const [isTestsuiteOpen, setIsTestsuiteOpen] = useState(false);
  
  // Gcode Simulator Modal State
  const [simulatorGcode, setSimulatorGcode] = useState<string | null>(null);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    uiStore.setTheme(newTheme);
    canvasStore.setBackgroundMode(newTheme === 'dark' ? 'darkGrid' : 'white');
  };



  // Globaler Hook für den Simulator (wird in MachineControl aufgerufen)
  useEffect(() => {
    (window as any).gcodeSimulator = {
      simulate: (gcode: string) => {
        if (!gcode || gcode.trim().length === 0) {
          alert("Kein G-Code zum Simulieren vorhanden.");
          return;
        }
        setSimulatorGcode(gcode);
      }
    };
    (window as any).gcodeGen = gcodeGen;
    return () => {
      delete (window as any).gcodeSimulator;
      delete (window as any).gcodeGen;
    };
  }, []);

  // Global event listener for modal triggers
  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { modal } = customEvent.detail;
      if (modal === 'batch') setIsBatchOpen(true);
      if (modal === 'barcode') setIsBarcodeOpen(true);
      if (modal === 'printcut') setIsPrintCutOpen(true);
      if (modal === 'camera-align') setIsCameraAlignOpen(true);
      if (modal === 'nesting') setIsNestingOpen(true);
      if (modal === 'web-import') setIsWebImportOpen(true);
    };
    window.addEventListener('openModal', handleOpenModal);
    return () => window.removeEventListener('openModal', handleOpenModal);
  }, []);

  // File Loading Handlers
  const handleLoadProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = (window as any).fabricCanvas;
    if (!canvas) {
      alert("Fehler: Leinwand nicht bereit.");
      return;
    }
    try {
      await GcodeProjectService.loadProject(canvas, file);
      alert(
        "✅ Projekt erfolgreich geladen!\n\n" +
        "⚠️ WICHTIG: Die Laserposition (0/0) wird durch das Laden NICHT verändert.\n" +
        "→ Bitte sicherstellen, dass der Laserkopf an der gewünschten Startposition steht.\n" +
        "→ Falls nicht, manuell dorthin fahren und 'Set Zero' drücken."
      );
    } catch (err: any) {
      alert("Fehler beim Laden des Projekts: " + err.message);
    }
    e.target.value = ''; // Reset
  };

  const handleLoadConfigFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await GcodeProjectService.loadConfiguration(file);
      alert("Konfiguration erfolgreich geladen!");
    } catch (err: any) {
      alert("Fehler beim Laden der Konfiguration: " + err.message);
    }
    e.target.value = ''; // Reset
  };

  const handleLoadBundleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await GcodeProjectService.loadBundle(file);
      alert("User-Bundle erfolgreich geladen!");
    } catch (err: any) {
      alert("Fehler beim Laden des Bundles: " + err.message);
    }
    e.target.value = ''; // Reset
  };

  // Close File Menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.file-menu-container')) {
        setIsFileMenuOpen(false);
      }
      if (!target.closest('.settings-menu-container')) {
        setIsSettingsMenuOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Zustand für ausstehende KI-Sicherheitsfreigaben (MCP)
  const [pendingAction, setPendingAction] = useState<{ action_id: string; gcode: string } | null>(null);

  // WebSocket-Verbindung für MCP-Sicherheitsfreigaben aufbauen
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectMcpWs = () => {
      ws = new WebSocket('ws://localhost:8000/ws/mcp-actions');

      ws.onopen = () => {
        console.log("Verbunden mit FastAPI MCP-Aktionskanal.");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'action_request') {
            setPendingAction({
              action_id: data.action_id,
              gcode: data.gcode
            });
          }
        } catch (e) {
          console.error("Fehler beim Parsen der MCP-Aktion:", e);
        }
      };

      ws.onclose = () => {
        console.log("FastAPI MCP-Aktionskanal geschlossen. Reconnect in 5s...");
        reconnectTimeout = setTimeout(connectMcpWs, 5000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    // Nur versuchen zu verbinden, wenn wir im Browser auf localhost laufen (Entwicklungsbetrieb)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      connectMcpWs();
    }

    return () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleResolveAction = async (approved: boolean) => {
    if (!pendingAction) return;

    try {
      await fetch('http://localhost:8000/api/mcp/action-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: pendingAction.action_id,
          approved
        })
      });
    } catch (e) {
      console.error("Fehler beim Senden der Freigabe-Antwort:", e);
    } finally {
      setPendingAction(null);
    }
  };

  // Globaler Keyboard Listener für Software Not-Aus (ESC-Taste)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerEmergencyStop();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const triggerEmergencyStop = () => {
    console.log("Not-Aus ausgelöst!");

    // Stoppe den G-Code Streamer – dieser sendet:
    //   1. GRBL Real-Time Reset (\x18) – alle Bewegungen stoppen sofort
    //   2. Unlock ($X) – GRBL aus dem Alarm-Zustand holen
    //   3. M5 – Laser aus
    //   KEINE automatische Fahrt! Position ist nach Reset unbekannt.
    gcodeStreamer.cancel();

    alert(
      "⛔ NOT-AUS AKTIVIERT!\n\n" +
      "Der Laser wurde sofort gestoppt.\n\n" +
      "⚠️ WICHTIG: Die Position ist nach dem Reset unbekannt!\n" +
      "→ Bitte den Laserkopf manuell mit den Jog-Buttons auf die Startposition (0/0) fahren.\n" +
      "→ Dann 'Set Zero' drücken um den Nullpunkt neu zu kalibrieren."
    );
  };

  return (
    <div className="app-container">
      {/* Versteckte Dateieingaben */}
      <input 
        type="file" 
        id="project-file-input" 
        style={{ display: 'none' }} 
        accept=".gravity" 
        onChange={handleLoadProjectFile} 
      />
      <input 
        type="file" 
        id="config-file-input" 
        style={{ display: 'none' }} 
        accept=".gravity-config" 
        onChange={handleLoadConfigFile} 
      />
      <input 
        type="file" 
        id="bundle-file-input" 
        style={{ display: 'none' }} 
        accept=".gravity-bundle" 
        onChange={handleLoadBundleFile} 
      />

      {/* 1. Obere Navigationsleiste */}
      <header className="top-nav">
        <div className="top-nav-left">
          <div className="brand">
            <span className="brand-laser">☄</span> GravityLaser
          </div>
          <div className="menu-items">
            {/* Datei Dropdown Menü */}
            <div className="file-menu-container" style={{ position: 'relative' }}>
              <button 
                className={`menu-button ${isFileMenuOpen ? 'active' : ''}`}
                title={t('nav.tooltip_file', { defaultValue: 'Datei-Aktionen' })}
                onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {t('nav.file')}
              </button>
              {isFileMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 1000,
                  minWidth: '220px',
                  padding: '4px 0',
                  marginTop: '4px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <button className="dropdown-item" onClick={async () => {
                    setIsFileMenuOpen(false);
                    const canvas = (window as any).fabricCanvas;
                    const getObjects = (window as any).getCanvasObjectsForGcode;
                    if (canvas && getObjects) {
                      const objects = getObjects();
                      const gcode = await gcodeGen.generate(objects);
                      GcodeProjectService.saveProject(canvas, gcode);
                    } else {
                      alert("Fehler: Leinwand nicht bereit.");
                    }
                  }}>
                    💾 {t('nav.project_save')}
                  </button>
                  <button className="dropdown-item" onClick={() => {
                    setIsFileMenuOpen(false);
                    document.getElementById('project-file-input')?.click();
                  }}>
                    📂 {t('nav.project_load')}
                  </button>
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                  <button className="dropdown-item" onClick={() => {
                    setIsFileMenuOpen(false);
                    GcodeProjectService.saveConfiguration();
                  }}>
                    ⚙️ {t('nav.config_save')}
                  </button>
                  <button className="dropdown-item" onClick={() => {
                    setIsFileMenuOpen(false);
                    document.getElementById('config-file-input')?.click();
                  }}>
                    ⚙️ {t('nav.config_load')}
                  </button>
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                  <button className="dropdown-item" onClick={() => {
                    setIsFileMenuOpen(false);
                    GcodeProjectService.saveBundle();
                  }}>
                    📦 {t('nav.bundle_export')}
                  </button>
                  <button className="dropdown-item" onClick={() => {
                    setIsFileMenuOpen(false);
                    document.getElementById('bundle-file-input')?.click();
                  }}>
                    📦 {t('nav.bundle_import')}
                  </button>
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                  <button className="dropdown-item" onClick={async () => {
                    setIsFileMenuOpen(false);
                    const getObjects = (window as any).getCanvasObjectsForGcode;
                    if (!getObjects) return;
                    const objects = getObjects();
                    if (objects.length === 0) {
                      alert(t('nav.error_no_export', 'Keine Objekte zum Exportieren.'));
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
                  }}>
                    📤 {t('nav.gcode_export')}
                  </button>
                </div>
              )}
            </div>

            <div className="settings-menu-container" style={{ position: 'relative', marginLeft: '12px' }}>
              <button 
                className={`menu-button ${isSettingsMenuOpen ? 'active' : ''}`}
                title={t('nav.tooltip_settings', { defaultValue: 'Einstellungen öffnen' })}
                onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {t('nav.settings')}
              </button>
              {isSettingsMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 1000,
                  minWidth: '220px',
                  padding: '4px 0',
                  marginTop: '4px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <button className="dropdown-item" onClick={() => { setIsSettingsMenuOpen(false); setActiveSettingsTab('verbindung'); setIsSettingsOpen(true); }}>
                    🔌 {t('nav.settings_connection', 'Verbindung')}
                  </button>
                  <button className="dropdown-item" onClick={() => { setIsSettingsMenuOpen(false); setActiveSettingsTab('general'); setIsSettingsOpen(true); }}>
                    ⚙️ {t('nav.settings_general', 'Einstellungen')}
                  </button>
                  <button className="dropdown-item" onClick={() => { setIsSettingsMenuOpen(false); setActiveSettingsTab('materials'); setIsSettingsOpen(true); }}>
                    🪵 {t('nav.settings_materials', 'Materialien')}
                  </button>
                  <button className="dropdown-item" onClick={() => { setIsSettingsMenuOpen(false); setActiveSettingsTab('wlan'); setIsSettingsOpen(true); }}>
                    📶 {t('nav.settings_wifi', 'WLAN-Assistent')}
                  </button>
                  <button className="dropdown-item" onClick={() => { setIsSettingsMenuOpen(false); setActiveSettingsTab('kamera'); setIsSettingsOpen(true); }}>
                    📸 {t('nav.settings_camera', 'Kamera')}
                  </button>
                  <button className="dropdown-item" onClick={() => { setIsSettingsMenuOpen(false); setIsPrintCutOpen(true); }}>
                    🎯 {t('nav.print_cut', 'Print & Cut')}
                  </button>
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                  <button className="dropdown-item" onClick={() => { setIsSettingsMenuOpen(false); setIsTestsuiteOpen(true); }}>
                    🧪 {t('nav.testsuite')}
                  </button>
                </div>
              )}
            </div>

            {PrintAndCutService.isEnabled() && (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  marginLeft: '12px', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(52, 199, 89, 0.15)', 
                  border: '1px solid var(--accent-green)', 
                  color: 'var(--accent-green)',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  height: '24px'
                }}
                title={t('nav.tooltip_print_cut_active', { defaultValue: 'Print & Cut Registrierung ist aktiv. G-Code Koordinaten werden automatisch transformiert.' })}
              >
                🎯 Print & Cut {t('common.active', 'Aktiv')}
              </div>
            )}
          </div>
        </div>

          <div className="top-nav-right">
          {/* Theme-Umschalter */}
          <button 
            className="menu-button" 
            onClick={toggleTheme}
            title={t('nav.tooltip_theme', { defaultValue: theme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren' })}
            style={{ padding: '4px 8px', fontSize: '14px', marginRight: '8px', cursor: 'pointer' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Sprachumschalter */}
          <div style={{ marginRight: '8px' }}>
            <LanguageSwitcher />
          </div>

          {/* Roter Not-Aus Button */}
          <button className="not-aus-btn" onClick={triggerEmergencyStop} title={t('nav.tooltip_emergency_stop', { defaultValue: 'Software Not-Aus (ESC-Taste)' })}>
            🚨 {t('nav.emergency_stop')}
          </button>
        </div>
      </header>

      {/* 2. Hauptarbeitsbereich */}
      <main className="main-layout" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Neue Top-Toolbar für Aktionen */}
        <TopToolbar />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Linke Werkzeugpalette */}
          <div style={{ flex: '0 0 56px', backgroundColor: 'var(--bg-panel)' }}>
             <CanvasToolbar />
          </div>

          {/* Mittlere Spalte (Canvas, Timeline und Konsole) */}
          <div className={`center-panel ${isConsoleCollapsed ? 'console-collapsed' : ''}`} style={{ flex: 1, overflow: 'hidden' }}>
            <LaserCanvas />
            <TimelinePanel />
            <Console />
          </div>

          {/* Rechte Spalte (Sidebar) - Premium Orca-Slicer Style */}
          <aside className="right-sidebar" style={{ 
              flex: `0 0 ${isRightSidebarOpen ? '340px' : '48px'}`,
              width: isRightSidebarOpen ? '340px' : '48px', 
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
              borderLeft: '1px solid var(--border-color)', 
              backgroundColor: 'var(--bg-panel)',
              display: 'flex',
              overflow: 'hidden'
            }}>
            {!isRightSidebarOpen ? (
              /* Vertikale Tab-Leiste (nur wenn eingeklappt) */
              <div style={{
                width: '48px',
                flex: '0 0 48px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 0',
                gap: '12px',
                backgroundColor: 'var(--bg-panel-header)',
                height: '100%'
              }}>
                {/* Seitenleiste umschalten */}
                <button 
                  className="tab-btn"
                  title={t('nav.tooltip_expand_sidebar', { defaultValue: 'Seitenleiste ausklappen' })}
                  onClick={() => setIsRightSidebarOpen(true)}
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '6px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '14px',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  ◀
                </button>
                
                <div style={{ width: '24px', height: '1px', backgroundColor: 'var(--border-color)' }} />
                
                <button 
                  className="tab-btn"
                  onClick={() => { 
                    uiStore.setActiveTab('control'); 
                    setIsRightSidebarOpen(true);
                  }}
                  title={t('tabs.control')}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)'
                  }}
                >
                  🎮
                </button>
                <button 
                  className="tab-btn"
                  onClick={() => { 
                    uiStore.setActiveTab('layers'); 
                    setIsRightSidebarOpen(true);
                  }}
                  title={t('tabs.layers')}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)'
                  }}
                >
                  🎨
                </button>
                <button 
                  className="tab-btn"
                  onClick={() => { 
                    uiStore.setActiveTab('properties'); 
                    setIsRightSidebarOpen(true);
                  }}
                  title={t('tabs.properties')}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)'
                  }}
                >
                  📏
                </button>
                <button 
                  className="tab-btn"
                  onClick={() => { 
                    uiStore.setActiveTab('macros'); 
                    setIsRightSidebarOpen(true);
                  }}
                  title="Makros"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)'
                  }}
                >
                  ⌨️
                </button>
              </div>
            ) : (
              /* Seitenleiste ausgeklappt (Breite 340px) */
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden'
              }}>
                {/* Horizontaler Premium-Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  height: '48px',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-panel-header)',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Seitenleiste umschalten */}
                    <button 
                      className="tab-btn"
                      title={t('nav.tooltip_collapse_sidebar', { defaultValue: 'Seitenleiste einklappen' })}
                      onClick={() => setIsRightSidebarOpen(false)}
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '6px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '12px',
                        cursor: 'pointer',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-muted)'
                      }}
                    >
                      ▶
                    </button>
                    
                    <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-color)' }} />
                    
                    {/* Horizontal Tabs */}
                    <button 
                      className={`tab-btn ${activeSidebarTab === 'control' ? 'active' : ''}`}
                      onClick={() => uiStore.setActiveTab('control')}
                      title={t('tabs.control')}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        cursor: 'pointer',
                        border: 'none',
                        background: activeSidebarTab === 'control' ? 'var(--bg-active)' : 'transparent',
                        color: activeSidebarTab === 'control' ? 'var(--accent-cyan)' : 'var(--text-muted)'
                      }}
                    >
                      🎮
                    </button>
                    <button 
                      className={`tab-btn ${activeSidebarTab === 'layers' ? 'active' : ''}`}
                      onClick={() => uiStore.setActiveTab('layers')}
                      title={t('tabs.layers')}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        cursor: 'pointer',
                        border: 'none',
                        background: activeSidebarTab === 'layers' ? 'var(--bg-active)' : 'transparent',
                        color: activeSidebarTab === 'layers' ? 'var(--accent-cyan)' : 'var(--text-muted)'
                      }}
                    >
                      🎨
                    </button>
                    <button 
                      className={`tab-btn ${activeSidebarTab === 'properties' ? 'active' : ''}`}
                      onClick={() => uiStore.setActiveTab('properties')}
                      title={t('tabs.properties')}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        cursor: 'pointer',
                        border: 'none',
                        background: activeSidebarTab === 'properties' ? 'var(--bg-active)' : 'transparent',
                        color: activeSidebarTab === 'properties' ? 'var(--accent-cyan)' : 'var(--text-muted)'
                      }}
                    >
                      📏
                    </button>
                    <button 
                      className={`tab-btn ${activeSidebarTab === 'macros' ? 'active' : ''}`}
                      onClick={() => uiStore.setActiveTab('macros')}
                      title="Makros"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        cursor: 'pointer',
                        border: 'none',
                        background: activeSidebarTab === 'macros' ? 'var(--bg-active)' : 'transparent',
                        color: activeSidebarTab === 'macros' ? 'var(--accent-cyan)' : 'var(--text-muted)'
                      }}
                    >
                      ⌨️
                    </button>
                  </div>
                  
                  {/* Right side title & status */}
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {activeSidebarTab === 'control' ? t('control.title') : activeSidebarTab === 'layers' ? t('layers.title') : activeSidebarTab === 'macros' ? t('macros.title', 'Makros') : t('properties.title')}
                    </span>
                    {activeSidebarTab === 'control' && (
                      <span
                        className={`status-dot ${connState.connected ? 'connected' : 'disconnected'}`}
                        title={connState.connected ? t('connection.connected') : t('connection.disconnected')}
                        style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: connState.connected ? 'var(--accent-green)' : 'var(--accent-red)' }}
                      />
                    )}
                  </div>
                </div>
                
                {/* Scrollbarer Content */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {activeSidebarTab === 'control' ? (
                    <MachineControl />
                  ) : activeSidebarTab === 'layers' ? (
                    <LayerPanel />
                  ) : activeSidebarTab === 'macros' ? (
                    <MacroPanel />
                  ) : (
                    <PropertiesPanel />
                  )}
                </div>

                {/* Persistente Auftragssteuerung ganz unten rechts */}
                <PersistentJobPanel />
              </div>
            )}
          </aside>
        </div>
      </main>



      {/* Maschinen-Einstellungen Modal */}
      {isSettingsOpen && (
        <MachineSettingsModal onClose={() => setIsSettingsOpen(false)} initialTab={activeSettingsTab} />
      )}
      
      {/* Simulator Modal */}
      {simulatorGcode !== null && (
        <GcodeSimulatorModal 
          gcode={simulatorGcode} 
          onClose={() => setSimulatorGcode(null)} 
        />
      )}

      {/* Barcode Modal */}
      {isBarcodeOpen && (
        <BarcodeModal onClose={() => setIsBarcodeOpen(false)} />
      )}

      {/* Serienfertigung Modal */}
      {isBatchOpen && (
        <BatchProductionModal onClose={() => setIsBatchOpen(false)} />
      )}

      {/* Print & Cut Assistent Modal */}
      {isPrintCutOpen && (
        <PrintAndCutWizard onClose={() => setIsPrintCutOpen(false)} />
      )}

      {/* Kamera-Ausrichtung Assistent Modal */}
      {isCameraAlignOpen && (
        <CameraAlignmentWizard onClose={() => setIsCameraAlignOpen(false)} />
      )}

      {/* Nesting Modal */}
      {isNestingOpen && (
        <NestingModal onClose={() => setIsNestingOpen(false)} />
      )}

      {/* Testsuite Modal */}
      {isTestsuiteOpen && (
        <TestsuiteModal onClose={() => setIsTestsuiteOpen(false)} />
      )}

      {/* Web Import Modal */}
      {isWebImportOpen && (
        <WebToolImporterModal onClose={() => setIsWebImportOpen(false)} />
      )}



      {/* MCP Sicherheitsfreigabe Modal */}
      {pendingAction && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderColor: 'var(--accent-orange)' }}>
            <div className="modal-header" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--accent-orange)' }}>
                {t('mcp.title', '⚠️ KI-Sicherheitsfreigabe erforderlich')}
              </span>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                {t('mcp.message', 'Dein KI-Agent möchte folgenden Befehl an den Laser senden:')}
              </p>
              <pre style={{ backgroundColor: 'var(--bg-input)', padding: '10px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '12px', border: '1px solid var(--border-color)', color: 'var(--accent-cyan)', overflowX: 'auto' }}>
                {pendingAction.gcode}
              </pre>
              <p style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: 'bold' }}>
                {t('mcp.warning', 'Achtung: Bitte stelle sicher, dass die Maschine frei steht und du eine Schutzbrille trägst, falls der Laser zündet.')}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => handleResolveAction(false)}>
                {t('mcp.decline', 'Ablehnen')}
              </button>
              <button className="btn btn-danger" onClick={() => handleResolveAction(true)}>
                {t('mcp.accept', 'Zustimmen & Ausführen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
