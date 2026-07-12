import { Store } from './store';
import { machineStore } from './machineStore';

export interface Macro {
  id: string;
  name: string;
  gcode: string;
  hotkey?: string; // Optional key like 'Ctrl+H'
}

export interface MacroState {
  macros: Macro[];
  selectedMacroId: string | null;
}

const defaultMacros: Macro[] = [
  { id: 'home', name: '🏠 Home (Referenzfahrt)', gcode: '$H' },
  { id: 'unlock', name: '🔓 Unlock (Entsperren)', gcode: '$X' },
  { id: 'air-on', name: '💨 Air Assist AN', gcode: 'M8' },
  { id: 'air-off', name: '🛑 Air Assist AUS', gcode: 'M9' },
  { id: 'laser-test', name: '🔥 Laser Test (1s @ 2%)', gcode: 'M4 S20\nG4 P1\nM5' },
];

const STORAGE_KEY = 'gravity_macros';

class MacroStore extends Store<MacroState> {
  constructor() {
    let initial = { macros: defaultMacros, selectedMacroId: null };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        initial = { macros: JSON.parse(saved), selectedMacroId: null };
      }
    } catch (e) {
      console.warn('Failed to load G-code macros', e);
    }
    super(initial);

    // Register hotkey listener
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.get().macros));
    } catch (e) {
      console.error('Failed to save G-code macros', e);
    }
  }

  public selectMacro(id: string | null) {
    this.update(s => ({ ...s, selectedMacroId: id }));
  }

  public addMacro(macro: Omit<Macro, 'id'>) {
    const newMacro: Macro = {
      ...macro,
      id: Math.random().toString(36).substring(2, 9)
    };
    this.update(s => {
      s.macros.push(newMacro);
      return { ...s };
    });
    this.save();
  }

  public updateMacro(id: string, updated: Partial<Macro>) {
    this.update(s => {
      s.macros = s.macros.map(m => m.id === id ? { ...m, ...updated } : m);
      return { ...s };
    });
    this.save();
  }

  public deleteMacro(id: string) {
    this.update(s => {
      s.macros = s.macros.filter(m => m.id !== id);
      if (s.selectedMacroId === id) {
        s.selectedMacroId = null;
      }
      return { ...s };
    });
    this.save();
  }

  public executeMacro(id: string) {
    const macro = this.get().macros.find(m => m.id === id);
    if (!macro) return;

    console.log(`Executing macro: ${macro.name}`);
    const lines = macro.gcode.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    lines.forEach(line => {
      machineStore.sendCommand(line);
    });
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Ignore input focus
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) {
      return;
    }

    // Build hotkey string representation, e.g. "Ctrl+H", "Shift+A", "U"
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    
    // Normalize letter keys
    const key = e.key.toUpperCase();
    if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt') {
      return; // modifier only
    }
    parts.push(key);
    const hotkeyStr = parts.join('+');

    // Find macro matching this hotkey
    const match = this.get().macros.find(m => m.hotkey === hotkeyStr);
    if (match) {
      e.preventDefault();
      this.executeMacro(match.id);
    }
  }
}

export const macroStore = new MacroStore();
export { defaultMacros };
