import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../stores/store';
import { consoleStore } from '../stores/consoleStore';
import { systemLogStore } from '../stores/systemLogStore';
import { machineStore } from '../stores/machineStore';
import { connectionStore } from '../stores/connectionStore';

export const Console: React.FC = () => {
  const { t } = useTranslation();
  const consoleState = useStore(consoleStore);
  const sysLogState = useStore(systemLogStore);
  const connState = useStore(connectionStore);
  const machineState = useStore(machineStore);

  const [inputVal, setInputVal] = useState('');
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'gcode' | 'syslog'>('gcode');

  const outputRef = useRef<HTMLDivElement>(null);

  // Automatisches Herunterscrollen bei neuen Zeilen
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [consoleState.lines, sysLogState.lines, activeTab]);

  const handleSend = () => {
    const cmd = inputVal.trim();
    if (!cmd) return;

    if (!connState.connected) {
      alert("Bitte zuerst mit dem Laser verbinden!");
      return;
    }

    // G-Code an die Maschine senden und in Historie speichern
    machineStore.sendCommand(cmd);
    consoleStore.addToHistory(cmd);
    
    setInputVal('');
    setHistoryIdx(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    } else if (e.key === 'ArrowUp') {
      // Durch den Befehlsverlauf nach oben blättern
      e.preventDefault();
      const history = consoleState.history;
      if (history.length === 0) return;

      let nextIdx = historyIdx === null ? history.length - 1 : historyIdx - 1;
      if (nextIdx < 0) nextIdx = 0;

      setHistoryIdx(nextIdx);
      setInputVal(history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      // Durch den Befehlsverlauf nach unten blättern
      e.preventDefault();
      const history = consoleState.history;
      if (history.length === 0 || historyIdx === null) return;

      let nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(null);
        setInputVal('');
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
      }
    }
  };

  const { isCollapsed } = useStore(consoleStore);

  return (
    <div className={`console-panel ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header mit Steuertasten */}
      <div className="console-header" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: isCollapsed ? '32px' : 'auto', 
        minHeight: '32px',
        padding: '6px 12px',
        boxSizing: 'border-box',
        gap: '6px',
        backgroundColor: 'var(--bg-panel-header)',
        borderBottom: '1px solid var(--border-color)',
        justifyContent: 'center'
      }}>
        <div className="flex-between" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              style={{ 
                padding: '4px 10px', 
                fontSize: '11px', 
                fontWeight: '600',
                borderRadius: '4px',
                backgroundColor: activeTab === 'gcode' ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
                color: activeTab === 'gcode' ? '#00f0ff' : 'var(--text-muted)',
                border: activeTab === 'gcode' ? '1px solid rgba(0, 240, 255, 0.25)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => {
                setActiveTab('gcode');
                if (isCollapsed) consoleStore.setCollapsed(false);
              }}
            >
              {t('console.tab_gcode')}
            </button>
            <button 
              style={{ 
                padding: '4px 10px', 
                fontSize: '11px', 
                fontWeight: '600',
                borderRadius: '4px',
                backgroundColor: activeTab === 'syslog' ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
                color: activeTab === 'syslog' ? '#00f0ff' : 'var(--text-muted)',
                border: activeTab === 'syslog' ? '1px solid rgba(0, 240, 255, 0.25)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => {
                setActiveTab('syslog');
                if (isCollapsed) consoleStore.setCollapsed(false);
              }}
            >
              {t('console.tab_syslog')}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {!isCollapsed && (
              <button
                className="menu-button"
                style={{ padding: '2px 8px', fontSize: '10px' }}
                onClick={() => activeTab === 'gcode' ? consoleStore.clear() : systemLogStore.clear()}
              >
                🧹 {t('console.clear')}
              </button>
            )}
            <button
              className="menu-button"
              style={{ padding: '2px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px' }}
              onClick={() => consoleStore.setCollapsed(!isCollapsed)}
              title={isCollapsed ? t('console.maximize') : t('console.minimize')}
            >
              {isCollapsed ? '▲' : '▼'}
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <div style={{ 
            width: '100%',
            backgroundColor: 'var(--bg-input)', 
            padding: '6px 10px', 
            borderRadius: '4px', 
            border: '1px solid var(--border-color)', 
            fontSize: '11px', 
            fontFamily: 'var(--font-mono)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            color: 'var(--text-main)',
            boxSizing: 'border-box',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontWeight: 'bold', color: connState.connected ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
              {connState.connected ? t('console.connected') : t('console.disconnected')} ({machineState.state})
            </span>
            <span title="Work Position: Die aktuelle Position des Lasers relativ zum von Ihnen gesetzten Werkstück-Nullpunkt (z.B. nach 'Set Origin').">
              📍 {t('console.wpos')} X:{machineState.wpos.x.toFixed(3)} Y:{machineState.wpos.y.toFixed(3)} Z:{machineState.wpos.z.toFixed(3)}
            </span>
            <span title="Machine Position: Die absolute, physikalische Position des Laserkopfs relativ zu den Endschaltern der Maschine (Referenzpunkt).">
              ⚙️ {t('console.mpos')} X:{machineState.mpos.x.toFixed(3)} Y:{machineState.mpos.y.toFixed(3)} Z:{machineState.mpos.z.toFixed(3)}
            </span>
          </div>
        )}
      </div>

      {/* Zeilenausgabe */}
      <div className="console-output" ref={outputRef} style={{ color: 'var(--text-main)' }}>
        {activeTab === 'gcode' ? (
          <>
            {consoleState.lines.map((line) => (
              <div key={line.id} className={`console-line ${line.type}`} style={{ color: 'var(--text-main)' }}>
                <span style={{ color: 'var(--text-muted)', marginRight: '8px', userSelect: 'none' }}>
                  {line.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span>
                  {line.type === 'user' ? '❯ ' : ''}
                  {line.text}
                </span>
              </div>
            ))}
            {consoleState.lines.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                {t('console.empty', 'Konsole leer. Verbinde den Laser...')}
              </div>
            )}
          </>
        ) : (
          <>
            {sysLogState.lines.map((line) => {
              let color = 'var(--text-main)';
              if (line.source === 'USB-TX') color = '#2563eb'; // Gut lesbares Blau
              else if (line.source === 'USB-RX') color = '#16a34a'; // Gut lesbares Grün
              else if (line.type === 'error') color = '#dc2626'; // Rot
              else if (line.type === 'warn') color = '#ea580c'; // Orange
              
              return (
                <div key={line.id} className={`console-line ${line.type}`} style={{ color }}>
                  <span style={{ color: 'var(--text-muted)', marginRight: '8px', userSelect: 'none' }}>
                    {line.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                  </span>
                  <span style={{ fontWeight: 'bold', marginRight: '8px', userSelect: 'none', color: 'var(--text-muted)' }}>
                    [{line.source}]
                  </span>
                  <span style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {line.message}
                  </span>
                </div>
              );
            })}
            {sysLogState.lines.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                {t('console.syslogEmpty', 'System-Log leer.')}
              </div>
            )}
          </>
        )}
      </div>

      {/* Eingabezeile */}
      <div className="console-input-row">
        <input
          type="text"
          className="console-input"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connState.connected ? t('console.placeholder') : t('console.connectionRequired', "Verbindung erforderlich...")}
          disabled={!connState.connected}
        />
        <button
          className="console-send-btn"
          onClick={handleSend}
          disabled={!connState.connected}
        >
          {t('console.send')} ↵
        </button>
      </div>
    </div>
  );
};
