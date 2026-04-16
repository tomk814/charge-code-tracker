// Tests for pure-logic functions in persistence.js.
// DOM-dependent functions (save, exportJSON, backup file) are not tested here.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  _injectDeps,
  ymdLocal,
  load,
  PREDEFINED_PA_CODES,
  ensurePayAdjustmentCodes,
  dayData,
  getHolidays,
  isHoliday,
  applyHolidayPrePopulate,
} from './persistence.js';
import { state, replaceState, setViewDate } from './state.js';

// Wire persistence.js's _state() to the live ESM binding from state.js.
// () => state evaluates the live binding at call time, so replaceState() updates
// are immediately visible inside persistence functions.
beforeEach(() => {
  replaceState({ codes: [], days: {}, holidays: [] });
  setViewDate('2026-04-16');
  _injectDeps({
    getState:                () => state,
    replaceState,
    render:                  vi.fn(),
    renderClock:             vi.fn(),
    ensurePayAdjustmentCodes: vi.fn(),
  });
});

// ── ymdLocal() ────────────────────────────────────────────────────────────────

describe('ymdLocal()', () => {
  it('formats April 16 2026 correctly', () => {
    expect(ymdLocal(new Date(2026, 3, 16))).toBe('2026-04-16'); // month is 0-indexed
  });

  it('pads single-digit month and day with leading zero', () => {
    expect(ymdLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('handles December 31', () => {
    expect(ymdLocal(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  it('handles the turn of the year', () => {
    expect(ymdLocal(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

// ── load() ────────────────────────────────────────────────────────────────────

describe('load()', () => {
  it('returns default state with all PREDEFINED_PA_CODES when localStorage is empty', () => {
    // localStorage is cleared in test-setup.js beforeEach
    const result = load();
    expect(result.codes).toHaveLength(PREDEFINED_PA_CODES.length);
    expect(result.codes.map(c => c.id)).toEqual(PREDEFINED_PA_CODES.map(c => c.id));
    expect(result.days).toEqual({});
  });

  it('parses and returns stored JSON from localStorage', () => {
    const stored = { codes: [{ id: 'abc', code: 'X', name: 'Test' }], days: {}, holidays: [] };
    localStorage.setItem('cc_tracker_v3', JSON.stringify(stored));
    const result = load();
    expect(result.codes).toHaveLength(1);
    expect(result.codes[0].id).toBe('abc');
  });
});

// ── PREDEFINED_PA_CODES ───────────────────────────────────────────────────────

describe('PREDEFINED_PA_CODES', () => {
  it('has exactly 9 codes', () => {
    expect(PREDEFINED_PA_CODES).toHaveLength(9);
  });

  it('each code has the Pay Adjustment program', () => {
    for (const c of PREDEFINED_PA_CODES) {
      expect(c.program).toBe('Pay Adjustment');
    }
  });

  it('includes HOL (pa0006) at index 5', () => {
    expect(PREDEFINED_PA_CODES[5].id).toBe('pa0006');
    expect(PREDEFINED_PA_CODES[5].code).toBe('HOL');
  });

  it('includes PTO (pa0001) as the first code', () => {
    expect(PREDEFINED_PA_CODES[0].id).toBe('pa0001');
    expect(PREDEFINED_PA_CODES[0].code).toBe('PTO');
  });
});

// ── ensurePayAdjustmentCodes() ────────────────────────────────────────────────

describe('ensurePayAdjustmentCodes()', () => {
  it('adds all PA codes when state.codes is empty, returns true', () => {
    replaceState({ codes: [], days: {}, holidays: [] });
    const changed = ensurePayAdjustmentCodes();
    expect(changed).toBe(true);
    expect(state.codes).toHaveLength(PREDEFINED_PA_CODES.length);
  });

  it('inserts PA codes in canonical order (pa0001 first, pa0006 sixth)', () => {
    replaceState({ codes: [], days: {}, holidays: [] });
    ensurePayAdjustmentCodes();
    expect(state.codes[0].id).toBe('pa0001');
    expect(state.codes[5].id).toBe('pa0006');
  });

  it('returns false when all PA codes are already present', () => {
    replaceState({
      codes: PREDEFINED_PA_CODES.map(c => ({ ...c })),
      days: {},
      holidays: [],
    });
    expect(ensurePayAdjustmentCodes()).toBe(false);
  });

  it('inserts a missing PA code after its nearest preceding sibling', () => {
    // Remove pa0006 (HOL), keep everything else
    const without = PREDEFINED_PA_CODES.filter(c => c.id !== 'pa0006').map(c => ({ ...c }));
    replaceState({ codes: without, days: {}, holidays: [] });
    ensurePayAdjustmentCodes();
    const idx5 = state.codes.findIndex(c => c.id === 'pa0005');
    const idx6 = state.codes.findIndex(c => c.id === 'pa0006');
    expect(idx6).toBe(idx5 + 1);
  });

  it('does not duplicate codes that are already present', () => {
    replaceState({
      codes: PREDEFINED_PA_CODES.map(c => ({ ...c })),
      days: {},
      holidays: [],
    });
    ensurePayAdjustmentCodes();
    const ids = state.codes.map(c => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ── dayData() ─────────────────────────────────────────────────────────────────

describe('dayData()', () => {
  it('creates and returns a new day entry when none exists', () => {
    replaceState({ codes: [], days: {}, holidays: [] });
    const day = dayData('2026-04-16');
    expect(day).toEqual({ hours: {}, clock: { sessions: [] } });
  });

  it('stores the new entry in state.days', () => {
    replaceState({ codes: [], days: {}, holidays: [] });
    dayData('2026-04-16');
    expect(state.days['2026-04-16']).toBeDefined();
  });

  it('returns the existing entry without overwriting it', () => {
    const existing = { hours: { pa0001: 4.0 }, clock: { sessions: [] } };
    replaceState({ codes: [], days: { '2026-04-16': existing }, holidays: [] });
    const day = dayData('2026-04-16');
    expect(day).toBe(existing);
    expect(day.hours.pa0001).toBe(4.0);
  });

  it('adds a missing clock property to a legacy day entry', () => {
    const legacy = { hours: {} }; // no clock field
    replaceState({ codes: [], days: { '2026-04-16': legacy }, holidays: [] });
    const day = dayData('2026-04-16');
    expect(day.clock).toEqual({ sessions: [] });
  });
});

// ── getHolidays() ─────────────────────────────────────────────────────────────

describe('getHolidays()', () => {
  it('returns an empty array when holidays is []', () => {
    replaceState({ codes: [], days: {}, holidays: [] });
    expect(getHolidays()).toEqual([]);
  });

  it('returns the same array reference stored in state', () => {
    const holidays = ['2026-07-04', '2026-12-25'];
    replaceState({ codes: [], days: {}, holidays });
    expect(getHolidays()).toBe(holidays);
  });

  it('initialises state.holidays to [] when it is missing or null', () => {
    replaceState({ codes: [], days: {}, holidays: null });
    expect(getHolidays()).toEqual([]);
    expect(Array.isArray(state.holidays)).toBe(true);
  });
});

// ── isHoliday() ───────────────────────────────────────────────────────────────

describe('isHoliday()', () => {
  it('returns false for dates not in the holidays list', () => {
    replaceState({ codes: [], days: {}, holidays: ['2026-07-04'] });
    expect(isHoliday('2026-04-16')).toBe(false);
  });

  it('returns true for a date that is in the holidays list', () => {
    replaceState({ codes: [], days: {}, holidays: ['2026-07-04', '2026-12-25'] });
    expect(isHoliday('2026-07-04')).toBe(true);
    expect(isHoliday('2026-12-25')).toBe(true);
  });

  it('returns false when the holidays list is empty', () => {
    replaceState({ codes: [], days: {}, holidays: [] });
    expect(isHoliday('2026-04-16')).toBe(false);
  });
});

// ── applyHolidayPrePopulate() ─────────────────────────────────────────────────

const HOL_CODE = { id: 'pa0006', code: 'HOL', name: 'Holiday', program: 'Pay Adjustment' };

describe('applyHolidayPrePopulate()', () => {
  it('returns false for a non-holiday date', () => {
    replaceState({ codes: [HOL_CODE], days: {}, holidays: [] });
    expect(applyHolidayPrePopulate('2026-04-16')).toBe(false);
  });

  it('sets 8 h of HOL time and marks day as populated for a holiday', () => {
    replaceState({ codes: [HOL_CODE], days: {}, holidays: ['2026-04-17'] });
    const result = applyHolidayPrePopulate('2026-04-17');
    expect(result).toBe(true);
    expect(state.days['2026-04-17'].hours['pa0006']).toBe(8.0);
    expect(state.days['2026-04-17'].holidayPopulated).toBe(true);
  });

  it('returns false on a second call (already populated)', () => {
    replaceState({
      codes: [HOL_CODE],
      days: { '2026-04-17': { hours: { 'pa0006': 8.0 }, clock: { sessions: [] }, holidayPopulated: true } },
      holidays: ['2026-04-17'],
    });
    expect(applyHolidayPrePopulate('2026-04-17')).toBe(false);
  });

  it('does not overwrite existing non-zero HOL hours', () => {
    // User may have manually set 4 h; pre-populate should not clobber it
    replaceState({
      codes: [HOL_CODE],
      days: { '2026-04-17': { hours: { 'pa0006': 4.0 }, clock: { sessions: [] } } },
      holidays: ['2026-04-17'],
    });
    applyHolidayPrePopulate('2026-04-17');
    expect(state.days['2026-04-17'].hours['pa0006']).toBe(4.0);
  });

  it('returns false when the HOL code is archived', () => {
    replaceState({
      codes: [{ ...HOL_CODE, archived: true }],
      days: {},
      holidays: ['2026-04-17'],
    });
    expect(applyHolidayPrePopulate('2026-04-17')).toBe(false);
  });

  it('returns false when the HOL code is absent from state.codes', () => {
    replaceState({ codes: [], days: {}, holidays: ['2026-04-17'] });
    expect(applyHolidayPrePopulate('2026-04-17')).toBe(false);
  });
});
