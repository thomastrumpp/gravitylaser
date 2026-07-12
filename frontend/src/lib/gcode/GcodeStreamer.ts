import { consoleStore } from '../stores/consoleStore';
import { GcodeValidator } from './GcodeValidator';

const getConnectionStore = () => {
  return (window as any).connectionStore;
};

export type StreamState = 'Idle' | 'Streaming' | 'Paused';

export class GcodeStreamer {
  private queue: string[] = [];
  private sendIdx = 0;
  private bufferBytes = 0;
  private sentLineLengths: number[] = [];
  private state: StreamState = 'Idle';
  private wakeLock: any = null;
  public estimatedTotalTimeSeconds: number = 0;

  // Callbacks für Fortschrittsanzeige
  private onProgressCallback: ((sent: number, total: number) => void) | null = null;
  private onStateChangeCallback: ((state: StreamState) => void) | null = null;

  public registerCallbacks(
    onProgress: (sent: number, total: number) => void,
    onStateChange: (state: StreamState) => void
  ) {
    this.onProgressCallback = onProgress;
    this.onStateChangeCallback = onStateChange;
  }

  public getState(): StreamState {
    return this.state;
  }

  private setState(state: StreamState) {
    this.state = state;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }

  /**
   * Startet das Streaming einer Liste von G-Code-Befehlen
   */
  public async start(gcode: string) {
    if (this.state !== 'Idle') {
      throw new Error("Ein Auftrag läuft bereits.");
    }

    // Sicherheitsprüfung auf Verfahrgrenzen und Kollisionen
    const validation = GcodeValidator.validate(gcode);
    if (!validation.valid) {
      const errorMsg = validation.error || "Kollisionsschutz-Fehler: Verfahrweg außerhalb der Grenzen.";
      consoleStore.logLine(`❌ Kollisionsschutz: ${errorMsg}`, "error");
      alert(`⚠️ Kollisionsschutz-Fehler:\n\n${errorMsg}\n\nDer Job wurde aus Sicherheitsgründen blockiert.`);
      throw new Error(errorMsg);
    }

    // G-Code in einzelne Zeilen aufteilen und bereinigen
    this.queue = gcode
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith(';')); // Kommentare filtern

    this.sendIdx = 0;
    this.bufferBytes = 0;
    this.sentLineLengths = [];
    
    if (this.queue.length === 0) {
      consoleStore.logLine("G-Code Warteschlange ist leer.", "info");
      return;
    }

    this.setState('Streaming');
    
    // Berechne die geschätzte Dauer
    const { gcodeGen } = await import('./GcodeGenerator');
    this.estimatedTotalTimeSeconds = gcodeGen.estimateTime(gcode);
    
    consoleStore.logLine(`Starte G-Code-Streaming: ${this.queue.length} Zeilen... (ca. ${Math.round(this.estimatedTotalTimeSeconds / 60)} Min)`, "info");
    
    // Screen Wake Lock anfordern, damit das Gerät nicht einschläft
    await this.requestWakeLock();

    // Stream-Schleife anstoßen
    this.pump();
  }

  /**
   * Pausiert das Streaming
   */
  public pause() {
    if (this.state !== 'Streaming') return;

    this.setState('Paused');
    // Echtzeit-Pause-Befehl an GRBL senden
    getConnectionStore().send('!');
    consoleStore.logLine("Auftrag pausiert (!)", "info");
  }

  /**
   * Setzt einen pausierten Auftrag fort
   */
  public resume() {
    if (this.state !== 'Paused') return;

    this.setState('Streaming');
    // Echtzeit-Fortsetzen-Befehl an GRBL senden
    getConnectionStore().send('~');
    consoleStore.logLine("Auftrag fortgesetzt (~)", "info");
    this.pump();
  }

  /**
   * Bricht den aktuellen Auftrag ab.
   * 
   * SICHERHEITSREGEL: Nach einem GRBL-Reset (\x18) setzt GRBL seinen internen
   * Positionszähler auf (0,0) zurück. Die physische Position ist aber unverändert.
   * Jede automatische Fahrt nach dem Reset ist gefährlich, weil die Koordinaten
   * nicht mehr mit der physischen Position übereinstimmen.
   * 
   * → NIEMALS nach einem Reset automatisch fahren!
   * → Der Benutzer muss manuell auf 0/0 joggen und "Set Zero" drücken.
   */
  public async cancel() {
    this.setState('Idle');
    this.queue = [];
    this.sendIdx = 0;
    this.bufferBytes = 0;
    this.sentLineLengths = [];

    // Dynamischer Import von machineStore zur Vermeidung zirkulärer Importe
    const { machineStore } = await import('../stores/machineStore');

    // GRBL Real-Time Reset senden (Ctrl+X) – stoppt alle Bewegungen sofort
    getConnectionStore().send('\x18');
    consoleStore.logLine(`⛔ Auftrag abgebrochen. GRBL-Reset gesendet.`, "error");
    
    await this.releaseWakeLock();

    // Kurze Verzögerung für den Reset, dann nur entsperren und Laser aus.
    // KEINE Fahrbewegung! Position ist nach Reset unbekannt.
    setTimeout(() => {
      if (getConnectionStore().get().connected) {
        machineStore.unlock();
        machineStore.sendCommand('M5'); // Laser aus
        consoleStore.logLine(
          `⚠️ Position nach Reset unbekannt! Bitte manuell mit Jog-Buttons auf Startposition (0/0) fahren und "Set Zero" drücken.`,
          "error"
        );
      }
    }, 1500);
  }

  /**
   * Wird aufgerufen, wenn vom Laser eine Bestätigung (ok oder error) empfangen wird
   */
  public handleOkReceived() {
    if (this.state !== 'Streaming') return;

    // Ziehe die Länge der ältesten gesendeten Zeile vom Puffer ab
    if (this.sentLineLengths.length > 0) {
      const len = this.sentLineLengths.shift() || 0;
      this.bufferBytes = Math.max(0, this.bufferBytes - len);
    }

    // Melde Fortschritt
    if (this.onProgressCallback) {
      this.onProgressCallback(this.sendIdx, this.queue.length);
    }

    // Weiter senden
    this.pump();
  }

  /**
   * Sendet Zeilen an den Laser, bis der Puffer (127 Bytes) voll ist
   */
  private pump() {
    if (this.state !== 'Streaming') return;

    const maxBufferSize = 127; // GRBL Standard Puffergröße

    while (this.sendIdx < this.queue.length) {
      const line = this.queue[this.sendIdx];
      // Jede Zeile bekommt ein Newline am Ende (\n = 1 Byte)
      const lineLength = line.length + 1;

      // Prüfen, ob die Zeile noch in den GRBL-Empfangspuffer passt
      if (this.bufferBytes + lineLength <= maxBufferSize) {
        try {
          getConnectionStore().send(line);
          
          this.bufferBytes += lineLength;
          this.sentLineLengths.push(lineLength);
          this.sendIdx++;
        } catch (err) {
          console.error("Fehler beim Senden der Stream-Zeile:", err);
          this.cancel();
          break;
        }
      } else {
        // Puffer ist voll, warte auf das nächste 'ok'
        break;
      }
    }

    // Wenn alle Zeilen gesendet wurden und alle bestätigt sind (bufferBytes = 0)
    if (this.sendIdx >= this.queue.length && this.bufferBytes === 0) {
      this.complete();
    }
  }

  private async complete() {
    this.setState('Idle');
    consoleStore.logLine("Auftrag erfolgreich abgeschlossen! 🎉", "info");
    await this.releaseWakeLock();
    window.dispatchEvent(new CustomEvent('laserJobComplete'));
  }

  /* --- Screen Wake Lock API --- */

  private async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log("Screen Wake Lock aktiv (Bildschirm bleibt an).");
      } catch (err) {
        console.warn("Screen Wake Lock fehlgeschlagen:", err);
      }
    }
  }

  private async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log("Screen Wake Lock freigegeben.");
      } catch (err) {
        console.error("Wake Lock release error:", err);
      }
    }
  }
}

export const gcodeStreamer = new GcodeStreamer();
