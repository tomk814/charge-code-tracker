// Tests for getBlocks() and blocksToFlat() in cc-rendering.js.
// These functions read from the state live binding; we use replaceState() to
// control state per test.

import { describe, it, expect, beforeEach } from 'vitest';
import { getBlocks, blocksToFlat } from './cc-rendering.js';
import { replaceState, setViewDate } from './state.js';

// Helper builders for CC objects
const single  = (id, extra = {}) => ({ id, code: id, name: `CC ${id}`, ...extra });
const grouped = (id, program, extra = {}) => ({ id, code: id, name: `CC ${id}`, program, ...extra });

beforeEach(() => {
  replaceState({ codes: [], days: {}, holidays: [] });
  setViewDate('2026-04-16');
});

// ── getBlocks() ───────────────────────────────────────────────────────────────

describe('getBlocks()', () => {
  it('returns an empty array when there are no active codes', () => {
    expect(getBlocks()).toEqual([]);
  });

  it('returns a single block of type "single" for one ungrouped CC', () => {
    replaceState({ codes: [single('a1')], days: {}, holidays: [] });
    const blocks = getBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('single');
    expect(blocks[0].codes[0].id).toBe('a1');
  });

  it('returns one block per ungrouped CC', () => {
    replaceState({ codes: [single('a1'), single('b2'), single('c3')], days: {}, holidays: [] });
    const blocks = getBlocks();
    expect(blocks).toHaveLength(3);
    expect(blocks.every(b => b.type === 'single')).toBe(true);
  });

  it('groups CCs with the same program into a single program block', () => {
    replaceState({
      codes: [grouped('a1', 'Prog A'), grouped('b2', 'Prog A'), grouped('c3', 'Prog A')],
      days: {},
      holidays: [],
    });
    const blocks = getBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('program');
    expect(blocks[0].name).toBe('Prog A');
    expect(blocks[0].codes).toHaveLength(3);
  });

  it('keeps distinct programs in separate blocks', () => {
    replaceState({
      codes: [grouped('a1', 'Prog A'), grouped('b2', 'Prog B')],
      days: {},
      holidays: [],
    });
    const blocks = getBlocks();
    expect(blocks).toHaveLength(2);
    expect(blocks[0].name).toBe('Prog A');
    expect(blocks[1].name).toBe('Prog B');
  });

  it('mixes program blocks and single blocks in display order', () => {
    replaceState({
      codes: [
        grouped('a1', 'Prog A'),
        grouped('b2', 'Prog A'),
        single('c3'),
        grouped('d4', 'Prog B'),
      ],
      days: {},
      holidays: [],
    });
    const blocks = getBlocks();
    expect(blocks).toHaveLength(3); // [Prog A, single c3, Prog B]
    expect(blocks[0].type).toBe('program');
    expect(blocks[1].type).toBe('single');
    expect(blocks[2].type).toBe('program');
  });

  it('excludes archived CCs', () => {
    replaceState({
      codes: [single('a1'), single('b2', { archived: true })],
      days: {},
      holidays: [],
    });
    const blocks = getBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].codes[0].id).toBe('a1');
  });

  it('excludes hidden CCs', () => {
    replaceState({
      codes: [single('a1'), single('b2', { hidden: true })],
      days: {},
      holidays: [],
    });
    const blocks = getBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].codes[0].id).toBe('a1');
  });

  it('preserves the display order from state.codes', () => {
    replaceState({
      codes: [single('z9'), single('a1'), single('m5')],
      days: {},
      holidays: [],
    });
    const ids = getBlocks().map(b => b.codes[0].id);
    expect(ids).toEqual(['z9', 'a1', 'm5']);
  });

  it('trims whitespace from program names for grouping', () => {
    replaceState({
      codes: [grouped('a1', ' Prog A '), grouped('b2', ' Prog A ')],
      days: {},
      holidays: [],
    });
    const blocks = getBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('program');
  });
});

// ── blocksToFlat() ────────────────────────────────────────────────────────────

describe('blocksToFlat()', () => {
  it('returns an empty array for empty blocks', () => {
    expect(blocksToFlat([])).toEqual([]);
  });

  it('flattens single blocks to a flat CC array', () => {
    const ccs = [single('a1'), single('b2')];
    const blocks = [
      { type: 'single', codes: [ccs[0]] },
      { type: 'single', codes: [ccs[1]] },
    ];
    expect(blocksToFlat(blocks)).toEqual([ccs[0], ccs[1]]);
  });

  it('flattens a program block containing multiple CCs', () => {
    const ccs = [grouped('a1', 'P'), grouped('b2', 'P'), grouped('c3', 'P')];
    const blocks = [{ type: 'program', name: 'P', codes: ccs }];
    expect(blocksToFlat(blocks)).toEqual(ccs);
  });

  it('flattens mixed program and single blocks in order', () => {
    const a = grouped('a1', 'P');
    const b = grouped('b2', 'P');
    const c = single('c3');
    const blocks = [
      { type: 'program', name: 'P', codes: [a, b] },
      { type: 'single', codes: [c] },
    ];
    expect(blocksToFlat(blocks)).toEqual([a, b, c]);
  });
});
