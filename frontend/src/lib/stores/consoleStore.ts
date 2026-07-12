import { Store } from './store';

export interface ConsoleLine {
  id: string;
  text: string;
  type: 'user' | 'laser' | 'error' | 'info';
  timestamp: Date;
}

export interface ConsoleState {
  lines: ConsoleLine[];
  history: string[];
  isCollapsed: boolean;
}

const initialConsoleState: ConsoleState = {
  lines: [],
  history: [],
  isCollapsed: true,
};

const MAX_LINES = 200;

class ConsoleStore extends Store<ConsoleState> {
  constructor() {
    super(initialConsoleState);
  }

  /**
   * Fügt eine neue Zeile zum Konsolenlog hinzu
   */
  public logLine(text: string, type: ConsoleLine['type'] = 'info') {
    const newLine: ConsoleLine = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      type,
      timestamp: new Date(),
    };

    this.update((state) => {
      let nextLines = [...state.lines, newLine];
      if (nextLines.length > MAX_LINES) {
        nextLines = nextLines.slice(nextLines.length - MAX_LINES);
      }
      return {
        ...state,
        lines: nextLines,
      };
    });
  }

  /**
   * Speichert eine Benutzereingabe in der Historie
   */
  public addToHistory(cmd: string) {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    this.update((state) => {
      // Entferne Duplikate, falls derselbe Befehl bereits in der Historie ist
      const filteredHistory = state.history.filter((h) => h !== trimmed);
      return {
        ...state,
        history: [...filteredHistory, trimmed],
      };
    });
  }

  /**
   * Löscht das Konsolenfenster
   */
  public clear() {
    this.update((state) => ({
      ...state,
      lines: [],
    }));
  }

  /**
   * Setzt den Einklappzustand der Konsole
   */
  public setCollapsed(collapsed: boolean) {
    this.update((state) => ({
      ...state,
      isCollapsed: collapsed,
    }));
    // Trigger window resize so Fabric canvas resizes immediately
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }
}

export const consoleStore = new ConsoleStore();
