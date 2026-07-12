import { Store } from './store';

export interface VariableTextState {
  csvHeaders: string[];
  csvRows: Record<string, string>[];
  csvFileName: string;
  currentIndex: number;
  
  serialStartValue: number;
  serialCurrentValue: number;
  serialStep: number;
  serialFormat: string;
}

const defaultState: VariableTextState = {
  csvHeaders: [],
  csvRows: [],
  csvFileName: '',
  currentIndex: 0,
  
  serialStartValue: 1,
  serialCurrentValue: 1,
  serialStep: 1,
  serialFormat: '0001'
};

class VariableTextStore extends Store<VariableTextState> {
  constructor() {
    super(defaultState);
  }

  /**
   * Robust CSV Parser that handles comma and semicolon separators.
   */
  public parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    if (!text || text.trim() === '') {
      return { headers: [], rows: [] };
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return { headers: [], rows: [] };

    // Bestimme Trennzeichen (Komma oder Semikolon)
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    // Hilfsfunktion zum Parsen einer CSV-Zeile unter Beachtung von Anführungszeichen
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: Record<string, string> = {};
      
      headers.forEach((header, idx) => {
        row[header] = values[idx] !== undefined ? values[idx] : '';
      });
      
      rows.push(row);
    }

    return { headers, rows };
  }

  /**
   * Lädt eine CSV-Datei und parst ihren Inhalt.
   */
  public loadCSV(text: string, fileName: string) {
    const { headers, rows } = this.parseCSV(text);
    this.update(state => ({
      ...state,
      csvHeaders: headers,
      csvRows: rows,
      csvFileName: fileName,
      currentIndex: 0
    }));
  }

  /**
   * Entfernt die aktuelle CSV-Datei und setzt Spalten zurück.
   */
  public clearCSV() {
    this.update(state => ({
      ...state,
      csvHeaders: [],
      csvRows: [],
      csvFileName: '',
      currentIndex: 0
    }));
  }

  /**
   * Gehe zum nächsten Datensatz/Seriennummer.
   */
  public next() {
    this.update(state => {
      const nextIndex = state.csvRows.length > 0
        ? Math.min(state.csvRows.length - 1, state.currentIndex + 1)
        : state.currentIndex;

      const nextSerial = state.serialCurrentValue + state.serialStep;

      return {
        ...state,
        currentIndex: nextIndex,
        serialCurrentValue: nextSerial
      };
    });
  }

  /**
   * Gehe zum vorherigen Datensatz/Seriennummer.
   */
  public prev() {
    this.update(state => {
      const prevIndex = Math.max(0, state.currentIndex - 1);
      const prevSerial = Math.max(state.serialStartValue, state.serialCurrentValue - state.serialStep);

      return {
        ...state,
        currentIndex: prevIndex,
        serialCurrentValue: prevSerial
      };
    });
  }

  /**
   * Setzt den Index und die Seriennummer auf Startwerte zurück.
   */
  public reset() {
    this.update(state => ({
      ...state,
      currentIndex: 0,
      serialCurrentValue: state.serialStartValue
    }));
  }

  /**
   * Setzt spezifische Seriennummer-Parameter.
   */
  public updateSerialParams(params: { start?: number; step?: number; format?: string }) {
    this.update(state => {
      const start = params.start !== undefined ? params.start : state.serialStartValue;
      const step = params.step !== undefined ? params.step : state.serialStep;
      const format = params.format !== undefined ? params.format : state.serialFormat;

      return {
        ...state,
        serialStartValue: start,
        serialStep: step,
        serialFormat: format,
        // Setze auch aktuellen Wert zurück falls Startwert angepasst wurde
        serialCurrentValue: start
      };
    });
  }

  /**
   * Setzt den aktuellen Datensatz-Index.
   */
  public setCurrentIndex(idx: number) {
    this.update(state => {
      const bounded = state.csvRows.length > 0
        ? Math.max(0, Math.min(state.csvRows.length - 1, idx))
        : 0;
      return {
        ...state,
        currentIndex: bounded
      };
    });
  }
}

export const variableTextStore = new VariableTextStore();
