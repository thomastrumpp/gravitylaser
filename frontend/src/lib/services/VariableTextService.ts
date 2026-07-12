/**
 * VariableTextService — Lexer & Parser für variables Template-Schnittstellen
 * 
 * Unterstützte Syntax:
 * - `{date:Format}` (z.B. `{date:dd.MM.yyyy}`, `{date:yyyy-MM-dd}`)
 * - `{time:Format}` (z.B. `{time:HH:mm:ss}`, `{time:HH:mm}`)
 * - `{serial:Format}` (z.B. `{serial:0001}`, `{serial:000}`)
 * - `{week}` (ISO-8601 Kalenderwoche)
 * - `{csv:Spaltenname}` (Wert aus der aktuellen Zeile des CSV-Imports)
 */

export class VariableTextService {

  /**
   * Berechnet die ISO-8601 Kalenderwoche für ein bestimmtes Datum.
   */
  public static getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Formatiert ein Datum/Uhrzeit anhand von Token-Ersetzungen.
   */
  public static formatDate(date: Date, format: string): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const replacements: Record<string, string> = {
      'yyyy': date.getFullYear().toString(),
      'yy': date.getFullYear().toString().slice(-2),
      'MM': pad(date.getMonth() + 1),
      'M': (date.getMonth() + 1).toString(),
      'dd': pad(date.getDate()),
      'd': date.getDate().toString(),
      'HH': pad(date.getHours()),
      'H': date.getHours().toString(),
      'mm': pad(date.getMinutes()),
      'm': date.getMinutes().toString(),
      'ss': pad(date.getSeconds()),
      's': date.getSeconds().toString()
    };

    let result = format;
    // Sortiere Token nach Länge absteigend, um Teil-Token Ersetzungen zu vermeiden (z.B. yyyy vor yy)
    const tokens = Object.keys(replacements).sort((a, b) => b.length - a.length);
    for (const token of tokens) {
      result = result.replace(new RegExp(token, 'g'), replacements[token]);
    }
    return result;
  }

  /**
   * Formatiert eine fortlaufende Seriennummer.
   * Beispiel: formatSerial(42, '0000') -> '0042'
   */
  public static formatSerial(value: number, format: string): string {
    const paddingLength = format.length;
    // Wenn das Format aus Nullen besteht (z.B. '0001'), füllen wir auf.
    // Ansonsten geben wir den Wert unverändert aus.
    if (/^[0-9]+$/.test(format)) {
      return value.toString().padStart(paddingLength, '0');
    }
    return value.toString();
  }

  /**
   * Löst alle Variablen-Templates in einem String auf.
   * 
   * @param template Der Ausgangs-String mit Templates (z.B. "Teil #{serial:0001}")
   * @param context Zusätzlicher Kontext (Seriennummer, CSV-Zeile)
   * @returns Der vollständig aufgelöste String
   */
  public static resolve(
    template: string,
    context: {
      serialValue?: number;
      csvRow?: Record<string, string>;
      date?: Date;
    } = {}
  ): string {
    if (!template) return '';
    
    const now = context.date || new Date();
    const regex = /\{(\w+)(?::([^}]+))?\}/g;

    return template.replace(regex, (match, type, format) => {
      const lowerType = type.toLowerCase();
      
      switch (lowerType) {
        case 'date':
          return VariableTextService.formatDate(now, format || 'dd.MM.yyyy');
          
        case 'time':
          return VariableTextService.formatDate(now, format || 'HH:mm');
          
        case 'week':
          return VariableTextService.getISOWeek(now).toString().padStart(2, '0');
          
        case 'serial':
          const serialNum = context.serialValue !== undefined ? context.serialValue : 1;
          return VariableTextService.formatSerial(serialNum, format || '0001');
          
        case 'csv':
          if (context.csvRow && format) {
            // Unterstützt case-insensitive Spaltennamen-Suche
            const key = Object.keys(context.csvRow).find(
              k => k.toLowerCase() === format.toLowerCase()
            );
            return key ? context.csvRow[key] : '';
          }
          return '';
          
        default:
          return match; // Unbekanntes Template unverändert lassen
      }
    });
  }
}
