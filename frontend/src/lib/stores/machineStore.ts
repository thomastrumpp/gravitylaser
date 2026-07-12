import { Store } from './store';
import { grbl, type GrblStatus } from '../connection/GrblClient';
import { consoleStore } from './consoleStore';
import { gcodeStreamer } from '../gcode/GcodeStreamer';
import i18n from '../../i18n';

const initialMachineState: GrblStatus = {
  state: 'Disconnected',
  mpos: { x: 0, y: 0, z: 0 },
  wpos: { x: 0, y: 0, z: 0 },
  wco: { x: 0, y: 0, z: 0 },
  feedRate: 0,
  spindleSpeed: 0,
  airAssist: false,
  raw: '',
};

class MachineStore extends Store<GrblStatus> {
  private pollIntervalId: any = null;
  private sendFn: ((line: string) => void) | null = null;
  private sendRealtimeFn: ((char: string) => void) | null = null;

  constructor() {
    super(initialMachineState);
  }

  public registerSendFunction(sendFn: (line: string) => void) {
    this.sendFn = sendFn;
  }

  public registerRealtimeSendFunction(sendRealtimeFn: (char: string) => void) {
    this.sendRealtimeFn = sendRealtimeFn;
  }

  /**
   * Parst eine vom Laser empfangene Zeile
   */
  public parseLine(line: string) {
    const current = this.get();
    const trimmed = line.trim().toLowerCase();
    
    // An Konsolen-Log weiterleiten (außer reine Statusabfragen, um Scroll-Spam zu vermeiden)
    if (trimmed !== 'ok' && !line.startsWith('<')) {
      consoleStore.logLine(line, 'laser');
    }

    if (line.startsWith('<')) {
      const nextStatus = grbl.parseStatus(line, current);
      this.set(nextStatus);
      // Synchronisiere den Status asynchron mit dem Backend (für den MCP-Server)
      this.syncStatusWithBackend(nextStatus);
    } else if (trimmed === 'ok') {
      gcodeStreamer.handleOkReceived();
    } else if (line.startsWith('error:')) {
      const errorCode = parseInt(line.split(':')[1]);
      const msg = grbl.getErrorMessage(errorCode, i18n.language);
      consoleStore.logLine(`Fehler [Code ${errorCode}]: ${msg}`, 'error');
      // Fehler zählt auch als Zeilen-Verarbeitung für Flusskontrolle
      gcodeStreamer.handleOkReceived();
    } else if (line.startsWith('ALARM:')) {
      const alarmCode = parseInt(line.split(':')[1]);
      const msg = grbl.getAlarmMessage(alarmCode, i18n.language);
      consoleStore.logLine(`ALARM [Code ${alarmCode}]: ${msg}`, 'error');
      this.update((s) => ({ ...s, state: 'Alarm' }));
      // Alarm bricht das Streaming ab
      gcodeStreamer.cancel();
    }
  }

  /**
   * Synchronisiert den Status mit dem lokalen Backend (falls dieses läuft)
   */
  private async syncStatusWithBackend(status: GrblStatus) {
    try {
      fetch('http://localhost:8000/api/mcp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: status.state,
          x: status.wpos.x,
          y: status.wpos.y
        })
      }).catch(() => {}); // Ignoriere Fehler, wenn kein Backend aktiv ist
    } catch (e) {
      // Stumm fangen
    }
  }

  /**
   * Setzt den Status auf "Disconnected" und stoppt das Polling
   */
  public setDisconnected() {
    this.stopPolling();
    this.set(initialMachineState);
  }

  /**
   * Startet das Polling mit dem '?'-Echtzeitbefehl (alle 250ms)
   */
  public startPolling() {
    this.stopPolling();
    // '?' ist ein Echtzeit-Steuerbefehl und benötigt kein Newline bei manchen Firmwares,
    // wir senden es aber direkt als einzelnen Charakter.
    this.pollIntervalId = setInterval(() => {
      this.sendRealtime('?');
    }, 250);
  }

  public stopPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  /**
   * Sendet G-Code
   */
  public sendCommand(line: string) {
    if (this.sendFn) {
      consoleStore.logLine(line, 'user');
      this.sendFn(line);
    }
  }

  /**
   * Sendet ein Echtzeitzeichen (ohne Loggen und ohne Newline)
   */
  public sendRealtime(char: string) {
    if (this.sendRealtimeFn) {
      this.sendRealtimeFn(char);
    } else if (this.sendFn) {
      this.sendFn(char);
    }
  }

  /* --- Komfortfunktionen für Maschinenbefehle --- */

  public home() {
    this.sendCommand('$H');
  }

  public unlock() {
    this.sendCommand('$X');
  }

  public reset() {
    // Echtzeit Reset Command: Ctrl+X (ASCII 24)
    this.sendRealtime('\x18');
    consoleStore.logLine("Echtzeit-Not-Reset gesendet (Ctrl+X)!", "error");
  }

  /**
   * Jog-Befehl ausführen (relative Bewegung)
   * @param axis 'X' | 'Y' | 'Z'
   * @param distance Distanz in mm (kann negativ sein)
   * @param feed Rate/Geschwindigkeit in mm/min
   */
  public jog(axis: 'X' | 'Y' | 'Z', distance: number, feed: number) {
    // GRBL Jogging-Syntax: $J=G91 G21 X[dist] F[feed] (G91=Relativ, G21=Metrisch)
    const cmd = `$J=G91 G21 ${axis}${distance} F${feed}`;
    this.sendCommand(cmd);
  }

  /**
   * Fährt an eine absolute Position
   */
  public moveTo(x: number, y: number, feed: number) {
    const cmd = `G90 G0 X${x} Y${y} F${feed}`;
    this.sendCommand(cmd);
  }
}

export const machineStore = new MachineStore();
