// Tests for computeSpread() — the proportional distribution algorithm.
// computeSpread is a pure function: no state access, no DOM, no side effects.

import { describe, it, expect } from 'vitest';
import { computeSpread } from './spread-hours.js';

// Helper: build a minimal CC object accepted by computeSpread
const cc = (id, name = id) => ({ id, name });

describe('computeSpread()', () => {
  // ── null / edge cases ───────────────────────────────────────────────────────

  it('returns null when unallocTenths is 0', () => {
    expect(computeSpread([cc('a')], { a: 2.0 }, 0)).toBeNull();
  });

  it('returns null when unallocTenths is negative', () => {
    expect(computeSpread([cc('a')], { a: 2.0 }, -5)).toBeNull();
  });

  it('returns null when all selected CCs have 0 hours (selectedTenths === 0)', () => {
    expect(computeSpread([cc('a'), cc('b')], { a: 0, b: 0 }, 5)).toBeNull();
  });

  it('returns null when activeCCs is empty', () => {
    expect(computeSpread([], {}, 3)).toBeNull();
  });

  // ── single CC ───────────────────────────────────────────────────────────────

  it('assigns all unallocated tenths to a single CC', () => {
    const result = computeSpread([cc('a')], { a: 2.0 }, 4);
    // 4 tenths = 0.4 h
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'a', before: 2.0, add: 0.4, after: 2.4 });
  });

  // ── equal split ─────────────────────────────────────────────────────────────

  it('splits evenly across CCs with equal hours', () => {
    // 2 CCs × 4.0 h each, 2 unallocated tenths → 1 tenth each
    const result = computeSpread([cc('a'), cc('b')], { a: 4.0, b: 4.0 }, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'a', before: 4.0, add: 0.1, after: 4.1 });
    expect(result[1]).toMatchObject({ id: 'b', before: 4.0, add: 0.1, after: 4.1 });
  });

  // ── proportional split with remainder ───────────────────────────────────────

  it('distributes proportionally and gives remainder to the largest fractional share', () => {
    // CC a: 6.0 h (60t), CC b: 4.0 h (40t), 3 unallocated tenths
    // exact: [1.8, 1.2] → floors: [1, 1] → remainder 1 → a gets +1 → [2, 1]
    const result = computeSpread([cc('a'), cc('b')], { a: 6.0, b: 4.0 }, 3);
    expect(result[0]).toMatchObject({ id: 'a', before: 6.0, add: 0.2, after: 6.2 });
    expect(result[1]).toMatchObject({ id: 'b', before: 4.0, add: 0.1, after: 4.1 });
  });

  it('total allocated equals unallocTenths exactly (no float drift)', () => {
    const activeCCs = [cc('a'), cc('b'), cc('c')];
    const dayHours  = { a: 3.0, b: 2.0, c: 5.0 };
    const unallocTenths = 7;
    const result = computeSpread(activeCCs, dayHours, unallocTenths);
    const totalAdded = result.reduce((s, r) => s + Math.round(r.add * 10), 0);
    expect(totalAdded).toBe(unallocTenths);
  });

  it('result entries have correct before/after relationship (after = before + add)', () => {
    const result = computeSpread([cc('a'), cc('b')], { a: 3.0, b: 7.0 }, 5);
    for (const r of result) {
      expect(parseFloat((r.before + r.add).toFixed(1))).toBe(r.after);
    }
  });

  // ── CC with 0 hours among selected ─────────────────────────────────────────

  it('a CC with 0 hours among selected gets 0 added (proportional share is 0)', () => {
    // a has 2 h, b has 0 h; only a should receive spread
    const result = computeSpread([cc('a'), cc('b')], { a: 2.0, b: 0 }, 3);
    expect(result[0]).toMatchObject({ id: 'a', add: 0.3, after: 2.3 });
    expect(result[1]).toMatchObject({ id: 'b', add: 0.0, after: 0.0 });
  });

  // ── large allocation ─────────────────────────────────────────────────────────

  it('handles a large number of tenths without overflow', () => {
    const result = computeSpread([cc('a'), cc('b')], { a: 4.0, b: 4.0 }, 80);
    const total = result.reduce((s, r) => s + Math.round(r.add * 10), 0);
    expect(total).toBe(80);
  });
});
