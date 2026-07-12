import { Store } from './store';

export interface SystemLogLine {
  id: string;
  timestamp: Date;
  source: 'USB-TX' | 'USB-RX' | 'SYSTEM' | 'APP';
  type: 'info' | 'error' | 'warn';
  message: string;
}

export interface SystemLogState {
  lines: SystemLogLine[];
}

const MAX_LINES = 1000;

class SystemLogStore extends Store<SystemLogState> {
  constructor() {
    super({ lines: [] });
  }

  public addLog(source: SystemLogLine['source'], type: SystemLogLine['type'], message: string) {
    // Filtere Telemetrie-Spam heraus (z.B. den 250ms Status-Ping '?' und die '<Idle...>' Antwort)
    if (message.trim() === '?') return;
    if (message.trim().startsWith('<') && message.includes('MPos:')) return;

    this.update((state) => {
      const newLine: SystemLogLine = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        source,
        type,
        message
      };
      
      const newLines = [...state.lines, newLine];
      if (newLines.length > MAX_LINES) {
        newLines.shift();
      }
      
      return { ...state, lines: newLines };
    });
  }

  public clear() {
    this.update((state) => ({ ...state, lines: [] }));
  }
}

export const systemLogStore = new SystemLogStore();
