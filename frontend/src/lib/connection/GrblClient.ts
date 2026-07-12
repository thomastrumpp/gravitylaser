export interface GrblStatus {
  state: 'Idle' | 'Run' | 'Hold' | 'Alarm' | 'Home' | 'Door' | 'Check' | 'Connecting' | 'Disconnected';
  mpos: { x: number; y: number; z: number };
  wpos: { x: number; y: number; z: number };
  wco: { x: number; y: number; z: number };
  feedRate: number;
  spindleSpeed: number; // Für Laser = Laserleistung (S-Value)
  airAssist: boolean;
  raw: string;
}

export class GrblClient {
  private lastWco = { x: 0, y: 0, z: 0 };

  /**
   * Parst eine Zeile GRBL-Antwort und gibt ggf. den aktualisierten Status zurück
   */
  public parseStatus(line: string, currentStatus: GrblStatus): GrblStatus {
    const trimmed = line.trim();
    if (!trimmed.startsWith('<') || !trimmed.endsWith('>')) {
      return currentStatus;
    }

    const content = trimmed.substring(1, trimmed.length - 1);
    const parts = content.split('|');
    if (parts.length === 0) return currentStatus;

    const statePart = parts[0].split(':')[0];
    const state = this.mapState(statePart);

    let mpos = { ...currentStatus.mpos };
    let wpos = { ...currentStatus.wpos };
    let wco = { ...this.lastWco };
    let feedRate = currentStatus.feedRate;
    let spindleSpeed = currentStatus.spindleSpeed;
    let airAssist = currentStatus.airAssist;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const [key, val] = part.split(':');
      if (!key || !val) continue;

      if (key === 'MPos') {
        const coords = val.split(',').map(parseFloat);
        if (coords.length >= 3) {
          mpos = { x: coords[0], y: coords[1], z: coords[2] };
        }
      } else if (key === 'WPos') {
        const coords = val.split(',').map(parseFloat);
        if (coords.length >= 3) {
          wpos = { x: coords[0], y: coords[1], z: coords[2] };
        }
      } else if (key === 'WCO') {
        const coords = val.split(',').map(parseFloat);
        if (coords.length >= 3) {
          wco = { x: coords[0], y: coords[1], z: coords[2] };
          this.lastWco = wco;
        }
      } else if (key === 'FS') {
        const speeds = val.split(',').map(parseFloat);
        if (speeds.length >= 2) {
          feedRate = speeds[0];
          spindleSpeed = speeds[1];
        }
      }
    }

    // Wenn nur MPos gesendet wurde, berechne WPos = MPos - WCO
    // Wenn nur WPos gesendet wurde, berechne MPos = WPos + WCO
    const hasMPos = parts.some(p => p.startsWith('MPos:'));
    const hasWPos = parts.some(p => p.startsWith('WPos:'));

    if (hasMPos && !hasWPos) {
      wpos = {
        x: Number((mpos.x - wco.x).toFixed(3)),
        y: Number((mpos.y - wco.y).toFixed(3)),
        z: Number((mpos.z - wco.z).toFixed(3)),
      };
    } else if (hasWPos && !hasMPos) {
      mpos = {
        x: Number((wpos.x + wco.x).toFixed(3)),
        y: Number((wpos.y + wco.y).toFixed(3)),
        z: Number((wpos.z + wco.z).toFixed(3)),
      };
    }

    return {
      state,
      mpos,
      wpos,
      wco,
      feedRate,
      spindleSpeed,
      airAssist,
      raw: trimmed,
    };
  }

  private mapState(stateStr: string): GrblStatus['state'] {
    const lower = stateStr.toLowerCase();
    if (lower.startsWith('idle')) return 'Idle';
    if (lower.startsWith('run')) return 'Run';
    if (lower.startsWith('hold')) return 'Hold';
    if (lower.startsWith('alarm')) return 'Alarm';
    if (lower.startsWith('home')) return 'Home';
    if (lower.startsWith('door')) return 'Door';
    if (lower.startsWith('check')) return 'Check';
    return 'Idle';
  }

  /**
   * Übersetzt einen GRBL Error-Code in verständlichen Klartext
   */
  public getErrorMessage(errorCode: number, lng: string = 'de'): string {
    const errors: Record<number, Record<string, string>> = {
      1: { de: "G-Code-Wort besteht aus Buchstaben und Werten ohne Ziffer.", en: "G-code words consist of a letter and a value. Letter was not found.", es: "La palabra G-code requiere letra y valor.", ru: "Слово G-кода требует букву и значение.", zh: "G代码词组需要字母和数值。" },
      2: { de: "Numerischer Wert ist ungültig oder fehlt.", en: "Numeric value format is not valid or missing an expected value.", es: "Valor numérico no válido o falta.", ru: "Недопустимое или отсутствующее числовое значение.", zh: "数值格式无效或缺失。" },
      3: { de: "GRBL-Systembefehl ($$) wird nicht unterstützt oder ist ungültig.", en: "Grbl '$' system command was not recognized or supported.", es: "Comando de sistema GRBL '$' no soportado.", ru: "Системная команда GRBL '$' не распознана.", zh: "不支持或无效的 GRBL '$' 系统命令。" },
      4: { de: "Negativer Wert für Achse oder Vorschub übergeben.", en: "Negative value received for an expected positive value.", es: "Se recibió un valor negativo para un valor positivo esperado.", ru: "Получено отрицательное значение вместо ожидаемого положительного.", zh: "收到负值，预期为正值。" },
      5: { de: "Homing-Zyklus ist nicht aktiviert.", en: "Homing cycle is not enabled in settings.", es: "El ciclo de inicio no está habilitado.", ru: "Цикл поиска начала (Homing) не включен.", zh: "归零循环未启用。" },
      6: { de: "Mindestschrittweite für Achse unterschritten.", en: "Minimum step pin pulse offset must be greater than 3 microseconds.", es: "Desplazamiento de pulso del pin de paso demasiado corto.", ru: "Слишком короткий импульс шага.", zh: "步进脉冲宽度过短。" },
      7: { de: "EEPROM-Schreibfehler beim Speichern der Einstellungen.", en: "EEPROM read failed. Reset and restored to default values.", es: "Error de lectura de EEPROM.", ru: "Ошибка чтения EEPROM.", zh: "EEPROM 读取失败。" },
      8: { de: "GRBL-Befehl nur im Ruhezustand (Idle) erlaubt.", en: "Grbl '$' command cannot be used unless machine is idle.", es: "Comando GRBL solo permitido en estado inactivo.", ru: "Команда GRBL '$' разрешена только в режиме ожидания.", zh: "只能在空闲时使用 GRBL '$' 命令。" },
      9: { de: "G-Code gesperrt. Referenzfahrt (Homing) erforderlich!", en: "G-code locked out during alarm or homing state.", es: "G-code bloqueado. ¡Se requiere Homing!", ru: "G-код заблокирован. Требуется поиск начала координат!", zh: "G代码被锁定。需要归零！" },
      10: { de: "Referenzfahrt kann nicht ohne Endschalter ausgeführt werden.", en: "Soft limits cannot be enabled without homing enabled.", es: "No se pueden habilitar los límites por software sin Homing.", ru: "Невозможно включить программные лимиты без Homing.", zh: "没有启用归零则无法启用软限位。" },
      11: { de: "Maximaler Verfahrweg überschritten (Soft Limits).", en: "Max characters per line exceeded. Line was cleared.", es: "Se excedieron los caracteres máximos por línea.", ru: "Превышено максимальное количество символов в строке.", zh: "超出每行最大字符数。" },
      15: { de: "Verfahren außerhalb des Arbeitsbereichs. (Soft Limits / Jog Target).", en: "Jog target exceeds machine travel. Jog command has been ignored.", es: "El objetivo de movimiento supera el recorrido de la máquina.", ru: "Цель перемещения выходит за пределы хода станка.", zh: "点动目标超出机器行程。" },
      20: { de: "Ungültiger G-Code-Befehl im aktuellen Modus.", en: "Unsupported or invalid g-code command found in block.", es: "Comando G-code inválido o no soportado.", ru: "Неподдерживаемая или неверная команда G-кода.", zh: "不支持或无效的 G 代码命令。" },
      22: { de: "Vorschubrate (Feedrate) fehlt oder ist ungültig.", en: "Feed rate has not yet been set or is invalid.", es: "La tasa de avance no se ha establecido o no es válida.", ru: "Скорость подачи не установлена или неверна.", zh: "进给率未设置或无效。" },
    };

    const err = errors[errorCode];
    if (err && err[lng]) return err[lng];
    if (err && err['en']) return err['en'];
    return lng === 'de' ? `Unbekannter Fehler (Code ${errorCode})` : `Unknown Error (Code ${errorCode})`;
  }

  /**
   * Übersetzt einen GRBL Alarm-Code in Klartext
   */
  public getAlarmMessage(alarmCode: number, lng: string = 'de'): string {
    const alarms: Record<number, Record<string, string>> = {
      1: { de: "Hard Limit ausgelöst! Endschalter berührt.", en: "Hard limit triggered. Machine position is likely lost.", es: "Límite físico alcanzado. Posición perdida.", ru: "Сработал аппаратный предел.", zh: "触发硬限位。" },
      2: { de: "Soft Limit ausgelöst! Bewegung außerhalb des Arbeitsbereichs verhindert.", en: "Soft limit alarm. Motion target exceeded machine travel.", es: "Límite por software. Movimiento excedió el recorrido.", ru: "Программный предел. Цель вне рабочей зоны.", zh: "软限位警报。运动目标超出行程。" },
      3: { de: "Not-Halt / Reset während der Fahrt ausgelöst.", en: "Reset occurred during motion. Machine position is lost.", es: "Reset durante movimiento. Posición perdida.", ru: "Сброс во время движения. Позиция потеряна.", zh: "运动中发生重置。机器位置丢失。" },
      4: { de: "Sicherheits-Endschalter (Probe) ausgelöst.", en: "Probe fail. The probe is not in the expected state.", es: "Fallo de sonda (Probe).", ru: "Сбой датчика щупа.", zh: "探针失败。" },
      5: { de: "Referenzfahrt fehlgeschlagen (Suchweg überschritten).", en: "Homing fail. Cycle failed to clear limit switch.", es: "Fallo en Homing.", ru: "Сбой поиска начала координат.", zh: "归零失败。" },
      8: { de: "Kollisions- oder Neigungssensor hat angeschlagen!", en: "Crash or tilt sensor triggered!", es: "¡Sensor de choque o inclinación activado!", ru: "Сработал датчик удара или наклона!", zh: "触发碰撞或倾斜传感器！" }
    };

    const al = alarms[alarmCode];
    if (al && al[lng]) return al[lng];
    if (al && al['en']) return al['en'];
    return lng === 'de' ? `ALARM ${alarmCode} ausgelöst!` : `ALARM ${alarmCode} triggered!`;
  }
}
export const grbl = new GrblClient();
