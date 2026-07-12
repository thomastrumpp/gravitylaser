import { describe, it, expect } from 'vitest';
import { VariableTextService } from '../../src/lib/services/VariableTextService';
import { variableTextStore } from '../../src/lib/stores/variableTextStore';
import { gcodeGen } from '../../src/lib/gcode/GcodeGenerator';

describe('Variable Text Engine (REQ-DYN-01 + REQ-DYN-02)', () => {
  describe('VariableTextService', () => {
    const testDate = new Date(2026, 6, 6, 14, 30, 15); // July 6, 2026, 14:30:15

    it('resolves date formatting tokens', () => {
      const template = 'Date: {date:yyyy-MM-dd}';
      const resolved = VariableTextService.resolve(template, { date: testDate });
      expect(resolved).toBe('Date: 2026-07-06');
    });

    it('resolves time formatting tokens', () => {
      const template = 'Time: {time:HH:mm:ss}';
      const resolved = VariableTextService.resolve(template, { date: testDate });
      expect(resolved).toBe('Time: 14:30:15');
    });

    it('resolves calendar week', () => {
      const template = 'CW: {week}';
      const resolved = VariableTextService.resolve(template, { date: testDate });
      // July 6, 2026 is week 28
      expect(resolved).toBe('CW: 28');
    });

    it('resolves padded serial numbers', () => {
      const template = 'Serial: {serial:0000}';
      const resolved = VariableTextService.resolve(template, { serialValue: 42 });
      expect(resolved).toBe('Serial: 0042');
    });

    it('resolves CSV column values case-insensitively', () => {
      const template = 'Hello {csv:Firstname} {csv:LASTNAME}';
      const csvRow = { Firstname: 'Thomas', Lastname: 'Mueller' };
      const resolved = VariableTextService.resolve(template, { csvRow });
      expect(resolved).toBe('Hello Thomas Mueller');
    });

    it('bypasses unknown variables', () => {
      const template = 'Keep {unknown}';
      const resolved = VariableTextService.resolve(template);
      expect(resolved).toBe('Keep {unknown}');
    });
  });

  describe('variableTextStore', () => {
    it('parses CSV strings correctly', () => {
      const csvText = 'Name,Age,Job\nAlice,30,Developer\nBob,25,Designer';
      variableTextStore.loadCSV(csvText, 'test.csv');
      
      const state = variableTextStore.get();
      expect(state.csvHeaders).toEqual(['Name', 'Age', 'Job']);
      expect(state.csvRows).toHaveLength(2);
      expect(state.csvRows[0]).toEqual({ Name: 'Alice', Age: '30', Job: 'Developer' });
      expect(state.csvRows[1]).toEqual({ Name: 'Bob', Age: '25', Job: 'Designer' });
      expect(state.csvFileName).toBe('test.csv');
      expect(state.currentIndex).toBe(0);
    });

    it('increments index and serial on next()', () => {
      variableTextStore.reset();
      variableTextStore.updateSerialParams({ start: 100, step: 5 });
      
      expect(variableTextStore.get().currentIndex).toBe(0);
      expect(variableTextStore.get().serialCurrentValue).toBe(100);

      variableTextStore.next();
      expect(variableTextStore.get().currentIndex).toBe(1);
      expect(variableTextStore.get().serialCurrentValue).toBe(105);
    });
  });
});
