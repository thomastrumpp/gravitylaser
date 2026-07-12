import { Store } from './store';
import { serialConn } from '../connection/WebSerialConnection';
import { wifiConn } from '../connection/WifiConnection';

import { machineStore } from './machineStore';

export interface ConnectionState {
  type: 'usb' | 'wifi';
  connected: boolean;
  port: string;
  ip: string;
  isFluidNc: boolean;
  statusText: string;
}

const initialConnectionState: ConnectionState = {
  type: 'usb',
  connected: false,
  port: '',
  ip: '192.168.4.1', // Standard TwoTrees AP IP
  isFluidNc: true,
  statusText: 'Disconnected',
};

class ConnectionStore extends Store<ConnectionState> {
  constructor() {
    super(initialConnectionState);

    // Sende-Funktion im machineStore registrieren, um zirkuläre Importe zu vermeiden
    machineStore.registerSendFunction((line) => this.send(line));
    machineStore.registerRealtimeSendFunction((char) => this.sendRealtime(char));

    // Callbacks für serielle USB-Verbindung registrieren
    serialConn.registerCallbacks(
      (line) => this.handleIncomingLine(line),
      (connected) => {
        if (connected) {
          this.update(s => ({ ...s, type: 'usb' }));
        }
        this.handleConnectionStateChange(connected);
      }
    );

    // Callbacks für WLAN-Verbindung registrieren
    wifiConn.registerCallbacks(
      (line) => this.handleIncomingLine(line),
      (connected) => this.handleConnectionStateChange(connected)
    );
  }

  private handleIncomingLine(line: string) {
    // G-Code an den machineStore weitergeben zwecks Parsen
    machineStore.parseLine(line);
  }

  private handleConnectionStateChange(connected: boolean) {
    this.update((state) => ({
      ...state,
      connected,
      statusText: connected ? 'Connected' : 'Disconnected',
    }));

    if (connected) {
      machineStore.startPolling();
    } else {
      machineStore.setDisconnected();
    }
  }

  /**
   * Verbindungsaufbau starten
   */
  public async connect(): Promise<boolean> {
    const state = this.get();
    this.update((s) => ({ ...s, statusText: 'Connecting...' }));

    if (state.type === 'usb') {
      return await serialConn.connect();
    } else {
      return await wifiConn.connect(state.ip, state.isFluidNc);
    }
  }

  /**
   * Verbindung trennen
   */
  public async disconnect(): Promise<void> {
    const state = this.get();
    if (state.type === 'usb') {
      await serialConn.disconnect();
    } else {
      await wifiConn.disconnect();
    }
  }

  /**
   * Sendet eine Zeile G-Code an das aktive Verbindungsmedium
   */
  public send(line: string) {
    const state = this.get();
    if (!state.connected) {
      throw new Error("Nicht mit dem Laser verbunden.");
    }

    if (state.type === 'usb') {
      serialConn.send(line);
    } else {
      wifiConn.send(line);
    }
  }

  /**
   * Sendet ein Realtime-Zeichen an das aktive Verbindungsmedium
   */
  public sendRealtime(char: string) {
    const state = this.get();
    if (!state.connected) {
      throw new Error("Nicht mit dem Laser verbunden.");
    }

    if (state.type === 'usb') {
      serialConn.sendRealtime(char);
    } else {
      wifiConn.send(char);
    }
  }
}

export const connectionStore = new ConnectionStore();
if (typeof window !== 'undefined') {
  (window as any).connectionStore = connectionStore;
}
