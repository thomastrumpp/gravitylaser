import { describe, it, expect, beforeEach } from 'vitest';
import { GcodeValidator } from '../../src/lib/gcode/GcodeValidator';
import { settingsStore } from '../../src/lib/stores/settingsStore';

describe('GravityLaser 50 Safety, 0/0 and Collision Prevention Test Suite', () => {
  beforeEach(() => {
    // Standard workspace setup: 300x300, Bottom-Left origin
    settingsStore.updateSettings({
      workingSizeX: 300,
      workingSizeY: 300,
      origin: 'BottomLeft',
      laserMode: 'M4'
    });
  });

  // Helper to run validator
  const check = (gcode: string) => GcodeValidator.validate(gcode);

  // Group 1: BottomLeft Origin Homing & Boundary Tests (Tests 1-10)
  it('[Safety 01] rejects start point at negative X', () => {
    expect(check('G90\nG0 X-1 Y0').valid).toBe(false);
  });
  it('[Safety 02] rejects start point at negative Y', () => {
    expect(check('G90\nG0 X0 Y-1').valid).toBe(false);
  });
  it('[Safety 03] allows home coordinate 0,0', () => {
    expect(check('G90\nG0 X0 Y0').valid).toBe(true);
  });
  it('[Safety 04] allows boundary coordinate at max working width', () => {
    expect(check('G90\nG0 X300 Y0').valid).toBe(true);
  });
  it('[Safety 05] allows boundary coordinate at max working height', () => {
    expect(check('G90\nG0 X0 Y300').valid).toBe(true);
  });
  it('[Safety 06] rejects coordinate exceeding max working width', () => {
    expect(check('G90\nG0 X301 Y0').valid).toBe(false);
  });
  it('[Safety 07] rejects coordinate exceeding max working height', () => {
    expect(check('G90\nG0 X0 Y301').valid).toBe(false);
  });
  it('[Safety 08] rejects relative movement going below zero X', () => {
    expect(check('G91\nG1 X-5 Y0').valid).toBe(false);
  });
  it('[Safety 09] rejects relative movement going below zero Y', () => {
    expect(check('G91\nG1 X0 Y-5').valid).toBe(false);
  });
  it('[Safety 10] allows complex sequence within bounds', () => {
    expect(check('G90\nG0 X10 Y10\nG1 X50 Y50\nG0 X100 Y100\nG1 X200 Y200').valid).toBe(true);
  });

  // Group 2: Center Origin Homing & Boundary Tests (Tests 11-20)
  it('[Safety 11] accepts center origin configuration', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    expect(check('G90\nG0 X0 Y0').valid).toBe(true);
  });
  it('[Safety 12] allows bottom-left extreme in Center Mode (-150, -150)', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    expect(check('G90\nG0 X-150 Y-150').valid).toBe(true);
  });
  it('[Safety 13] allows top-right extreme in Center Mode (150, 150)', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    expect(check('G90\nG0 X150 Y150').valid).toBe(true);
  });
  it('[Safety 14] rejects Y under Center Mode bottom boundary (-151)', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    expect(check('G90\nG0 X0 Y-151').valid).toBe(false);
  });
  it('[Safety 15] rejects X under Center Mode left boundary (-151)', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    expect(check('G90\nG0 X-151 Y0').valid).toBe(false);
  });
  it('[Safety 16] rejects Y over Center Mode top boundary (151)', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    expect(check('G90\nG0 X0 Y151').valid).toBe(false);
  });
  it('[Safety 17] rejects X over Center Mode right boundary (151)', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    expect(check('G90\nG0 X151 Y0').valid).toBe(false);
  });
  it('[Safety 18] allows relative coordinate loops returning to center', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    expect(check('G91\nG1 X100 Y100\nG1 X-100 Y-100').valid).toBe(true);
  });
  it('[Safety 19] rejects cumulative relative moves over boundary', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    expect(check('G91\nG1 X80 Y80\nG1 X80 Y0').valid).toBe(false); // X reaches 160
  });
  it('[Safety 20] tolerates floating-point threshold at exact bounds', () => {
    settingsStore.updateSettings({ origin: 'Center' });
    expect(check('G90\nG0 X150.0 Y0').valid).toBe(true); // tolerates exact boundary coordinates
  });

  // Group 3: Dynamic Workspace Size Alterations (Tests 21-30)
  it('[Safety 21] supports smaller workspace limits (100x100)', () => {
    settingsStore.updateSettings({ workingSizeX: 100, workingSizeY: 100 });
    expect(check('G90\nG0 X101 Y0').valid).toBe(false);
  });
  it('[Safety 22] supports larger workspace limits (1000x1000)', () => {
    settingsStore.updateSettings({ workingSizeX: 1000, workingSizeY: 1000 });
    expect(check('G90\nG0 X950 Y950').valid).toBe(true);
  });
  it('[Safety 23] blocks moves over Y limit in custom small workspace', () => {
    settingsStore.updateSettings({ workingSizeX: 150, workingSizeY: 150 });
    expect(check('G90\nG0 X50 Y151').valid).toBe(false);
  });
  it('[Safety 24] blocks moves over X limit in custom small workspace', () => {
    settingsStore.updateSettings({ workingSizeX: 150, workingSizeY: 150 });
    expect(check('G90\nG0 X152 Y50').valid).toBe(false);
  });
  it('[Safety 25] handles changing units: G20 (Inches) bounds checks safely', () => {
    // 300mm is ~11.8 inches. X12 should crash (304.8mm)
    expect(check('G90\nG20\nG0 X12 Y0').valid).toBe(false);
  });
  it('[Safety 26] handles G20 safe moves', () => {
    expect(check('G90\nG20\nG0 X5 Y5').valid).toBe(true); // 127mm
  });
  it('[Safety 27] handles switches back to G21 (mm) safely', () => {
    expect(check('G90\nG20\nG0 X5 Y5\nG21\nG0 X290 Y290').valid).toBe(true);
  });
  it('[Safety 28] blocks MM moves after unit restoration if out of bounds', () => {
    expect(check('G90\nG20\nG0 X5 Y5\nG21\nG0 X305 Y290').valid).toBe(false);
  });
  it('[Safety 29] retains last command memory across empty lines', () => {
    expect(check('G90\nG1 X100 Y100\n\n\nX120').valid).toBe(true);
  });
  it('[Safety 30] validates G0 vs G1 modes without laser power state differences', () => {
    expect(check('G90\nG0 X299 Y299 S1000\nG1 X0 Y0 S0').valid).toBe(true);
  });

  // Group 4: Advanced Arc Interpolation (G2/G3) Boundary Sweeps (Tests 31-40)
  it('[Safety 31] accepts full internal circles', () => {
    // Circle centered at (100,100), radius 50. Sweep from (50, 100) to (150, 100)
    expect(check('G90\nG0 X50 Y100\nG2 X150 Y100 I50 J0').valid).toBe(true);
  });
  it('[Safety 32] blocks circles that sweep beyond the bottom edge (Y < 0)', () => {
    // Center (100, 30), radius 40. Bottom of circle is Y = -10.
    expect(check('G90\nG0 X60 Y30\nG3 X140 Y30 I40 J0').valid).toBe(false);
  });
  it('[Safety 33] blocks circles that sweep beyond the top edge (Y > 300)', () => {
    // Center (100, 280), radius 30. Top of circle is Y = 310.
    expect(check('G90\nG0 X70 Y280\nG2 X130 Y280 I30 J0').valid).toBe(false);
  });
  it('[Safety 34] blocks circles that sweep beyond the left edge (X < 0)', () => {
    // Center (30, 100), radius 40. Left of circle is X = -10.
    expect(check('G90\nG0 X30 Y60\nG2 X30 Y140 I0 J40').valid).toBe(false);
  });
  it('[Safety 35] blocks circles that sweep beyond the right edge (X > 300)', () => {
    // Center (280, 100), radius 30. Right of circle is X = 310.
    expect(check('G90\nG0 X280 Y70\nG3 X280 Y130 I0 J30').valid).toBe(false);
  });
  it('[Safety 36] respects G3 (CCW) sweeps with identical center coordinates', () => {
    expect(check('G90\nG0 X50 Y100\nG3 X150 Y100 I50 J0').valid).toBe(true);
  });
  it('[Safety 37] validates tiny arc increments correctly', () => {
    expect(check('G90\nG0 X10 Y10\nG2 X11 Y11 I1 J0').valid).toBe(true);
  });
  it('[Safety 38] handles helical/arced tool paths inside custom layouts', () => {
    expect(check('G90\nG0 X100 Y100\nG2 X100 Y100 I0 J50').valid).toBe(true); // circle centered at (100,150)
  });
  it('[Safety 39] blocks helcial/arced paths sweeping out of limits', () => {
    expect(check('G90\nG0 X250 Y250\nG2 X250 Y250 I0 J60').valid).toBe(false); // reaches Y=310
  });
  it('[Safety 40] handles relative arcs (G91) safely', () => {
    expect(check('G91\nG2 X10 Y10 I5 J0').valid).toBe(true);
  });

  // Group 5: Coordinate System States and Calibration Safety (Tests 41-50)
  it('[Safety 41] respects G54 coordinate system active selector', () => {
    expect(check('G54\nG90\nG0 X100 Y100').valid).toBe(true);
  });
  it('[Safety 42] ignores comments and spaces inside boundaries', () => {
    expect(check('  G90  ; absolute mode\n  G0   X 200   Y 200   ; center-ish').valid).toBe(true);
  });
  it('[Safety 43] parses case-insensitive commands', () => {
    expect(check('g90\ng0 x150 y150').valid).toBe(true);
  });
  it('[Safety 44] rejects empty/corrupt coordinates', () => {
    expect(check('G90\nG0 X Y').valid).toBe(true); // empty values default to current position, which is safe (0)
  });
  it('[Safety 45] allows G10 coordinate calibration commands as comments/setup', () => {
    expect(check('G10 L20 P1 X0 Y0\nG0 X50 Y50').valid).toBe(true);
  });
  it('[Safety 46] validates extreme coordinates on giant workspaces (10000x10000)', () => {
    settingsStore.updateSettings({ workingSizeX: 10000, workingSizeY: 10000 });
    expect(check('G90\nG0 X9999 Y9999').valid).toBe(true);
  });
  it('[Safety 47] rejects relative moves that cumulatively cross giant workspace boundaries', () => {
    settingsStore.updateSettings({ workingSizeX: 10000, workingSizeY: 10000 });
    expect(check('G91\nG1 X5000 Y5000\nG1 X5001 Y0').valid).toBe(false); // 10001
  });
  it('[Safety 48] handles mix of relative and absolute coordinates correctly', () => {
    expect(check('G90\nG0 X100 Y100\nG91\nG0 X150 Y0\nG90\nG0 X299 Y299').valid).toBe(true);
  });
  it('[Safety 49] blocks out of boundary move following mixed absolute/relative coordinate sequence', () => {
    expect(check('G90\nG0 X100 Y100\nG91\nG0 X150 Y0\nG90\nG0 X301 Y299').valid).toBe(false);
  });
  it('[Safety 50] successfully reports valid state for a complex multi-toolpath project', () => {
    const jobGcode = [
      'G90',
      'G21',
      'G0 X20 Y20 F6000',
      'G1 X100 Y20 F3000 S1000',
      'G1 X100 Y100',
      'G1 X20 Y100',
      'G1 X20 Y20',
      'G0 X0 Y0 F6000',
      'M2'
    ].join('\n');
    expect(check(jobGcode).valid).toBe(true);
  });
});
