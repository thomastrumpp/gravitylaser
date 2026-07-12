import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { gcodeGen } from '../../src/lib/gcode/GcodeGenerator';
import { settingsStore } from '../../src/lib/stores/settingsStore';

describe('Backlash Compensation (REQ-OPT-03)', () => {
  beforeEach(() => {
    // Reset backlash values
    settingsStore.updateSettings({
      backlashX: 0,
      backlashY: 0
    });
  });

  afterEach(() => {
    settingsStore.updateSettings({
      backlashX: 0,
      backlashY: 0
    });
  });

  it('does not generate backlash lead-in when backlash is 0', () => {
    const lineObj = {
      id: 'line1',
      type: 'line',
      left: 10,
      top: 10,
      width: 50,
      height: 0, // horizontal line
      scaleX: 1,
      scaleY: 1
    };

    const layer = {
      id: 'C00',
      name: 'Black',
      color: '#000000',
      mode: 'line' as const,
      speed: 1000,
      power: 80,
      passes: 1,
      airAssist: false,
      output: true,
      visible: true
    };

    const gcode = gcodeGen.generate([lineObj]);
    expect(gcode).not.toContain('Backlash Compensation Lead-In');
  });

  it('generates correct backlash lead-in for horizontal line when backlash is active', () => {
    settingsStore.updateSettings({
      backlashX: 2.0,
      backlashY: 1.0
    });

    const lineObj = {
      id: 'line1',
      type: 'line',
      left: 50,
      top: 50,
      width: 50,
      height: 0, // Horizontal line, direction is +X: dx=50, dy=0
      scaleX: 1,
      scaleY: 1
    };

    const layer = {
      id: 'C00',
      name: 'Black',
      color: '#000000',
      mode: 'line' as const,
      speed: 1000,
      power: 80,
      passes: 1,
      airAssist: false,
      output: true,
      visible: true
    };

    const gcode = gcodeGen.generate([lineObj]);
    
    // Should contain lead-in comment
    expect(gcode).toContain('Backlash Compensation Lead-In');

    // Direction is +X (unit vector ux=1, uy=0)
    // start point: X=50, Y=250 (mapped start coordinates: 300 - 50 = 250)
    // lead-in start: startX - ux*blX = 50 - 1*2 = 48
    // lead-in Y: startY - uy*blY = 250 - 0*1 = 250
    // So we expect: G0 X48.000 Y250.000 followed by G1 X50.000 Y250.000 S0
    expect(gcode).toContain('G0 X48.000 Y250.000');
    expect(gcode).toContain('G1 X50.000 Y250.000 S0');
  });
});
