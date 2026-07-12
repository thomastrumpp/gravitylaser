import { describe, it, expect, beforeEach } from 'vitest';
import { GcodeValidator } from '../../src/lib/gcode/GcodeValidator';
import { settingsStore } from '../../src/lib/stores/settingsStore';

describe('GcodeValidator Collision Prevention Checks', () => {
  beforeEach(() => {
    // Reset to standard BottomLeft, 300x300mm
    settingsStore.updateSettings({
      workingSizeX: 300,
      workingSizeY: 300,
      origin: 'BottomLeft',
      laserMode: 'M3'
    });
  });

  it('allows safe, within-bounds absolute linear motion', () => {
    const gcode = [
      'G90 ; absolute mode',
      'G21 ; mm units',
      'G0 X10 Y20',
      'G1 X290 Y280 F3000',
      'X50 Y50',
      'M5'
    ].join('\n');

    const result = GcodeValidator.validate(gcode);
    expect(result.valid).toBe(true);
    expect(result.maxReachedX).toBe(290);
    expect(result.maxReachedY).toBe(280);
    expect(result.minReachedX).toBe(0);
    expect(result.minReachedY).toBe(0);
  });

  it('blocks out-of-bounds absolute linear motion on X axis', () => {
    const gcode = [
      'G90',
      'G0 X305 Y100'
    ].join('\n');

    const result = GcodeValidator.validate(gcode);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Kollision bei linearer Bewegung zu (X: 305.000, Y: 100.000)');
  });

  it('blocks out-of-bounds absolute linear motion on Y axis', () => {
    const gcode = [
      'G90',
      'G0 X100 Y-5'
    ].join('\n');

    const result = GcodeValidator.validate(gcode);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Kollision bei linearer Bewegung zu (X: 100.000, Y: -5.000)');
  });

  it('supports modal coordinate reuse correctly', () => {
    const gcode = [
      'G90',
      'G1 X100 Y100',
      'X120', // reuses G1 and Y=100
      'Y320'  // goes out of bounds (Y=320)
    ].join('\n');

    const result = GcodeValidator.validate(gcode);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Y: 320.000');
  });

  it('allows safe, within-bounds relative linear motion', () => {
    const gcode = [
      'G91 ; relative mode',
      'G1 X50 Y50',
      'X100 Y100',
      'X-50 Y-50'
    ].join('\n');

    const result = GcodeValidator.validate(gcode);
    expect(result.valid).toBe(true);
    expect(result.maxReachedX).toBe(150);
    expect(result.maxReachedY).toBe(150);
  });

  it('blocks relative linear motion when accumulated value goes out-of-bounds', () => {
    const gcode = [
      'G91',
      'G1 X150 Y150',
      'X200 Y0' // 150 + 200 = 350 -> out of bounds!
    ].join('\n');

    const result = GcodeValidator.validate(gcode);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('X: 350.000');
  });

  it('allows a safe arc (G2/G3) that stays in-bounds', () => {
    // Circle at X=150, Y=150, radius=50
    // Start at (100, 150), move to (200, 150) with center offset (50, 0)
    const gcode = [
      'G90',
      'G0 X100 Y150',
      'G2 X200 Y150 I50 J0'
    ].join('\n');

    const result = GcodeValidator.validate(gcode);
    expect(result.valid).toBe(true);
    expect(result.maxReachedX).toBe(200);
    expect(result.maxReachedY).toBe(200); // arc sweeps through (150, 200) at top
    expect(result.minReachedX).toBe(0); // since start is 0,0 and we haven't tracked min below 0
    expect(result.minReachedY).toBe(0);
  });

  it('blocks an arc that sweeps out-of-bounds, even if endpoints are safe', () => {
    // Bed is 300x300.
    // Let's draw an arc starting at (280, 150) and ending at (280, 160)
    // with center offset (30, 5) -> center is at (310, 155), radius = 30.4
    // Using G3 (counter-clockwise) will sweep through the East side (X = 340.4) -> out of bounds!
    const gcode = [
      'G90',
      'G0 X280 Y150',
      'G3 X280 Y160 I30 J5'
    ].join('\n');

    const result = GcodeValidator.validate(gcode);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Kollision bei Kreisbogen-Bewegung');
  });

  it('validates limits correctly with Center origin', () => {
    settingsStore.updateSettings({
      workingSizeX: 300,
      workingSizeY: 300,
      origin: 'Center'
    });

    // Center bounds are X [-150, 150], Y [-150, 150]
    // A point at (0, 0) is safe.
    // A point at (149, -149) is safe.
    // A point at (151, 0) is out of bounds.
    let gcode = 'G90\nG0 X149 Y-149';
    expect(GcodeValidator.validate(gcode).valid).toBe(true);

    gcode = 'G90\nG0 X151 Y0';
    const result = GcodeValidator.validate(gcode);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Limits: X [-150, 150], Y [-150, 150]');
  });
});
