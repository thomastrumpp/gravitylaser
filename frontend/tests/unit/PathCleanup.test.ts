import { describe, it, expect } from 'vitest';
import { PathCleanupService } from '../../src/lib/services/PathCleanupService';

describe('PathCleanupService', () => {
  describe('Tiny Line Removal', () => {
    it('removes line segments shorter than threshold', () => {
      const path = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 0.05, y: 0 },    // tiny: 0.05 < 0.1
        { type: 'L', x: 10, y: 0 },       // long: kept
        { type: 'L', x: 10, y: 10 },      // long: kept
      ];

      const cleaned = PathCleanupService.cleanPath(path, 0.1, 100);
      
      // The tiny L should be removed
      const lineCommands = cleaned.filter(c => c.type === 'L');
      expect(lineCommands).toHaveLength(2);
      expect(lineCommands[0].x).toBe(10);
      expect(lineCommands[1].x).toBe(10);
    });

    it('keeps all segments that are above threshold', () => {
      const path = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 5, y: 0 },
        { type: 'L', x: 5, y: 5 },
        { type: 'L', x: 0, y: 5 },
        { type: 'Z' },
      ];

      const cleaned = PathCleanupService.cleanPath(path, 0.1, 100);
      expect(cleaned).toHaveLength(5); // M, L, L, L, Z
    });
  });

  describe('Auto-Close Paths', () => {
    it('auto-closes a path whose end is within closeThreshold of start', () => {
      const path = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 10, y: 0 },
        { type: 'L', x: 10, y: 10 },
        { type: 'L', x: 0, y: 0.3 },  // 0.3 away from start
      ];

      const cleaned = PathCleanupService.cleanPath(path, 0.1, 0.5);
      const lastCmd = cleaned[cleaned.length - 1];
      expect(lastCmd.type).toBe('Z');
    });

    it('does not auto-close when end is far from start', () => {
      const path = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 10, y: 0 },
        { type: 'L', x: 10, y: 10 },
        { type: 'L', x: 5, y: 5 },  // 7+ away from start
      ];

      const cleaned = PathCleanupService.cleanPath(path, 0.1, 0.5);
      const lastCmd = cleaned[cleaned.length - 1];
      expect(lastCmd.type).not.toBe('Z');
    });

    it('does not double-close an already closed path', () => {
      const path = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 10, y: 0 },
        { type: 'L', x: 10, y: 10 },
        { type: 'Z' },
      ];

      const cleaned = PathCleanupService.cleanPath(path, 0.1, 0.5);
      const zCount = cleaned.filter(c => c.type === 'Z').length;
      expect(zCount).toBe(1);
    });
  });

  describe('Orphaned Move Removal', () => {
    it('removes M commands not followed by drawing commands', () => {
      const path = [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 10, y: 0 },
        { type: 'M', x: 20, y: 20 },  // orphaned: nothing follows
      ];

      const cleaned = PathCleanupService.cleanPath(path, 0.1, 100);
      const moveCommands = cleaned.filter(c => c.type === 'M');
      expect(moveCommands).toHaveLength(1);
      expect(moveCommands[0].x).toBe(0);
    });
  });

  describe('Duplicate Point Deduplication', () => {
    it('removes consecutive duplicate points', () => {
      const points: [number, number][] = [
        [0, 0],
        [0, 0.0001],  // duplicate within threshold
        [5, 5],
        [5.0001, 5],  // duplicate within threshold
        [10, 10],
      ];

      const deduped = PathCleanupService.deduplicatePoints(points, 0.001);
      expect(deduped).toHaveLength(3);
      expect(deduped[0]).toEqual([0, 0]);
      expect(deduped[1]).toEqual([5, 5]);
      expect(deduped[2]).toEqual([10, 10]);
    });

    it('keeps all points when none are duplicates', () => {
      const points: [number, number][] = [
        [0, 0],
        [1, 1],
        [2, 2],
      ];

      const deduped = PathCleanupService.deduplicatePoints(points, 0.001);
      expect(deduped).toHaveLength(3);
    });
  });
});
