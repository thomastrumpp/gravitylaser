export class WebSerialConnection {
  private port: any | null = null;
  private reader: any | null = null;
  private writer: any | null = null;
  private keepReading = false;
  private onLineReceivedCallback: ((line: string) => void) | null = null;
  private onConnectionStateChangeCallback: ((connected: boolean) => void) | null = null;

  public isSupported(): boolean {
    return 'serial' in navigator;
  }

  constructor() {
    if (this.isSupported()) {
      (navigator as any).serial.addEventListener('connect', async () => {
        console.log("Neues USB-Gerät erkannt, versuche Auto-Connect...");
        // Wenn noch nicht verbunden, versuche Auto-Connect
        if (!this.port) {
          // Kurze Verzögerung, da das Gerät noch beim OS registriert wird
          setTimeout(() => this.autoConnect(), 500);
        }
      });
      
      (navigator as any).serial.addEventListener('disconnect', (e: any) => {
        console.log("USB-Gerät getrennt (physisch)!");
        import('../stores/systemLogStore').then(({ systemLogStore }) => {
          systemLogStore.addLog('SYSTEM', 'warn', 'USB-Gerät wurde physisch getrennt.');
        });
        if (this.port === e.target || !this.port) {
          this.disconnect(true);
        }
      });

      // Initiale Prüfung, ob schon was freigegebenes da ist
      setTimeout(() => this.autoConnect(), 1000);

      // Beim Neuladen/Schließen der Seite versuchen, den Port sauber freizugeben
      window.addEventListener('beforeunload', () => {
        if (this.port) {
          try {
             this.keepReading = false;
             if (this.reader) {
               this.reader.cancel();
             }
          } catch(e) {}
        }
      });
    }
  }

  public registerCallbacks(
    onLineReceived: (line: string) => void,
    onConnectionStateChange: (connected: boolean) => void
  ) {
    this.onLineReceivedCallback = onLineReceived;
    this.onConnectionStateChangeCallback = onConnectionStateChange;
  }

  /**
   * Fordert vom Benutzer Zugriff auf den seriellen Port an und öffnet die Verbindung
   */
  public async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error("Web Serial API wird von diesem Browser nicht unterstützt. Bitte nutze Google Chrome oder MS Edge.");
    }

    try {
      // 115200 Baud für TwoTrees TTS-10 PRO
      // CH340 Vendor ID: 0x1a86 (optional für Filter)
      this.port = await (navigator as any).serial.requestPort({
        filters: [{ usbVendorId: 0x1a86 }] // Filtert nach CH340 Chips
      });

      return await this.openActivePort();
    } catch (error) {
      console.error("WebSerial Verbindungsfehler:", error);
      this.disconnect();
      return false;
    }
  }

  /**
   * Versucht sich automatisch mit einem bereits freigegebenen Port zu verbinden
   */
  public async autoConnect(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const ports = await (navigator as any).serial.getPorts();
      for (const p of ports) {
        try {
          this.port = p;
          const success = await this.openActivePort();
          if (success) return true;
        } catch (e) {
          console.warn("Auto-connect auf Port fehlgeschlagen", e);
        }
      }
    } catch (e) {
      console.warn("Fehler beim Abrufen der freigegebenen Ports", e);
    }
    return false;
  }

  /**
   * Helferfunktion um den zugewiesenen Port zu öffnen
   */
  private async openActivePort(): Promise<boolean> {
    if (!this.port) return false;
    try {
      await this.port.open({ baudRate: 115200, bufferSize: 255 });
      this.keepReading = true;
      this.startReading();

      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(true);
      }
      return true;
    } catch (error) {
      console.error("Fehler beim Öffnen des Ports:", error);
      this.disconnect();
      return false;
    }
  }

  /**
   * Schließt die serielle Schnittstelle
   */
  public async disconnect(force = false): Promise<void> {
    this.keepReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        console.warn("Reader cancel error:", e);
      }
      this.reader = null;
    }

    if (this.writer) {
      try {
        if (force) {
          await this.writer.abort();
        } else {
          this.writer.releaseLock();
        }
      } catch (e) {
        console.warn("Writer close error:", e);
      }
      this.writer = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        console.warn("Port close error:", e);
      }
      this.port = null;
    }

    if (this.onConnectionStateChangeCallback) {
      this.onConnectionStateChangeCallback(false);
    }
  }

  private sendQueue: Uint8Array[] = [];
  private isSending = false;

  /**
   * Sendet eine Zeile G-Code an den Laser (gepuffert)
   */
  public async send(line: string): Promise<void> {
    if (!this.port || !this.port.writable) {
      throw new Error("Keine aktive serielle Verbindung.");
    }

    const encoder = new TextEncoder();
    // GRBL erwartet ein Newline am Ende jeder Zeile
    const formattedLine = line.endsWith('\n') ? line : line + '\n';
    
    import('../stores/systemLogStore').then(({ systemLogStore }) => {
      systemLogStore.addLog('USB-TX', 'info', formattedLine.trim());
    });

    const data = encoder.encode(formattedLine);

    this.sendQueue.push(data);
    this.processSendQueue();
  }

  /**
   * Sendet Echtzeitbefehle an den Laser (ungepuffert, ohne Newline)
   */
  public async sendRealtime(char: string): Promise<void> {
    if (!this.port || !this.port.writable) return;
    
    import('../stores/systemLogStore').then(({ systemLogStore }) => {
      systemLogStore.addLog('USB-TX', 'info', char);
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(char);
    
    // Für Echtzeitbefehle setzen wir es an den Anfang der Queue und triggern sie
    this.sendQueue.unshift(data);
    this.processSendQueue();
  }

  private async processSendQueue() {
    if (this.isSending || this.sendQueue.length === 0 || !this.port || !this.port.writable) {
      return;
    }

    this.isSending = true;
    let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    
    try {
      writer = this.port.writable.getWriter();
      while (this.sendQueue.length > 0) {
        const data = this.sendQueue.shift();
        if (data) {
        if (writer) {
          await writer.write(data);
        }
        }
      }
    } catch (e) {
      console.error("Fehler beim Senden in der Queue:", e);
    } finally {
      if (writer) {
        writer.releaseLock();
      }
      this.isSending = false;
      
      // Falls in der Zwischenzeit was reinkam
      if (this.sendQueue.length > 0) {
        setTimeout(() => this.processSendQueue(), 0);
      }
    }
  }

  /**
   * Asynchroner Leseloop zur zeilenweisen Verarbeitung der Antworten des Lasers
   */
  private async startReading() {
    const decoder = new TextDecoder();
    while (this.port && this.port.readable && this.keepReading) {
      try {
        this.reader = this.port.readable.getReader();
        let buffer = '';

        while (this.keepReading) {
          const { value, done } = await this.reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              import('../stores/systemLogStore').then(({ systemLogStore }) => {
                systemLogStore.addLog('USB-RX', 'info', trimmed);
              });
              if (this.onLineReceivedCallback) {
                this.onLineReceivedCallback(trimmed);
              }
            }
          }
        }
      } catch (error) {
        console.error("Fehler im WebSerial Leseloop:", error);
        if (this.keepReading) {
          this.disconnect(true);
        }
        break;
      } finally {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch (e) {}
          this.reader = null;
        }
      }
    }
  }
}

export const serialConn = new WebSerialConnection();
