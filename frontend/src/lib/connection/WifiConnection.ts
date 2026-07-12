export class WifiConnection {
  private socket: WebSocket | null = null;
  private onLineReceivedCallback: ((line: string) => void) | null = null;
  private onConnectionStateChangeCallback: ((connected: boolean) => void) | null = null;
  private isFluidNc: boolean = true;

  public registerCallbacks(
    onLineReceived: (line: string) => void,
    onConnectionStateChange: (connected: boolean) => void
  ) {
    this.onLineReceivedCallback = onLineReceived;
    this.onConnectionStateChangeCallback = onConnectionStateChange;
  }

  /**
   * Verbindet sich über WLAN mit dem Laser
   * @param ip IP-Adresse des Lasers im Heimnetzwerk
   * @param isFluidNc Ob FluidNC-Firmware verwendet wird (direktes WebSocket) oder MKS (TCP-Brücke über Backend)
   */
  public async connect(ip: string, isFluidNc: boolean = true): Promise<boolean> {

    this.isFluidNc = isFluidNc;

    return new Promise((resolve) => {
      try {
        let wsUrl = '';
        if (this.isFluidNc) {
          // FluidNC nutzt standardmäßig Port 81 für WebSocket-Verbindungen
          wsUrl = `ws://${ip}:81`;
        } else {
          // MKS nutzt rohes TCP auf Port 23. Der Browser kann kein rohes TCP,
          // daher verbinden wir uns mit der TCP-zu-WebSocket-Brücke im Backend.
          const backendHost = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
          wsUrl = `ws://${backendHost}/ws/wifi-bridge?target=${ip}&port=23`;
        }

        console.log(`Verbinde mit WLAN-Laser unter ${wsUrl}...`);
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log("WLAN-Laser-WebSocket geöffnet!");
          if (this.onConnectionStateChangeCallback) {
            this.onConnectionStateChangeCallback(true);
          }
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          if (typeof event.data === 'string') {
            const lines = event.data.split(/\r?\n/);
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed && this.onLineReceivedCallback) {
                this.onLineReceivedCallback(trimmed);
              }
            }
          }
        };

        this.socket.onerror = (error) => {
          console.error("WLAN-Laser-WebSocket Fehler:", error);
          resolve(false);
        };

        this.socket.onclose = () => {
          console.log("WLAN-Laser-WebSocket geschlossen!");
          if (this.onConnectionStateChangeCallback) {
            this.onConnectionStateChangeCallback(false);
          }
          this.socket = null;
          resolve(false);
        };
      } catch (err) {
        console.error("Fehler beim Erstellen der WebSocket-Verbindung:", err);
        resolve(false);
      }
    });
  }

  /**
   * Schließt die WLAN-Verbindung
   */
  public async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Sendet eine Zeile G-Code an den Laser
   */
  public send(line: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Keine aktive WLAN-Verbindung zum Laser.");
    }

    const formattedLine = line.endsWith('\n') ? line : line + '\n';
    this.socket.send(formattedLine);
  }
}

export const wifiConn = new WifiConnection();
