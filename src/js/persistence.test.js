// Tests for pure-logic functions in persistence.js.
// DOM-dependent functions (save, exportJSON, backup file) are not tested here.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  _injectDeps,
  ymdLocal,
  load,
  save,
  getSetting,
  DEFAULT_SETTINGS,
  PREDEFINED_PA_CODES,
  ensurePayAdjustmentCodes,
  dayData,
  getHolidays,
  isHoliday,
  applyHolidayPrePopulate,
  validateImport,
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

// ── getSetting() ─────────────────────────────────────────────────────────────

describe('getSetting()', () => {
  it('returns the state value when it is valid', () => {
    replaceState({ codes: [], days: {}, holidays: [], settings: { payPeriodAnchor: '2025-12-20' } });
    expect(getSetting('payPeriodAnchor')).toBe('2025-12-20');
  });

  it('returns DEFAULT_SETTINGS.payPeriodAnchor when state has no settings', () => {
    replaceState({ codes: [], days: {}, holidays: [] });
    expect(getSetting('payPeriodAnchor')).toBe(DEFAULT_SETTINGS.payPeriodAnchor);
  });

  it('falls back to default when payPeriodAnchor is not a string', () => {
    replaceState({ codes: [], days: {}, holidays: [], settings: { payPeriodAnchor: 20260404 } });
    expect(getSetting('payPeriodAnchor')).toBe(DEFAULT_SETTINGS.payPeriodAnchor);
  });

  it('falls back to default when payPeriodAnchor has wrong format', () => {
    replaceState({ codes: [], days: {}, holidays: [], settings: { payPeriodAnchor: '4/4/2026' } });
    expect(getSetting('payPeriodAnchor')).toBe(DEFAULT_SETTINGS.payPeriodAnchor);
  });

  it('falls back to default when payPeriodAnchor is an impossible calendar date', () => {
    replaceState({ codes: [], days: {}, holidays: [], settings: { payPeriodAnchor: '2026-02-30' } });
    expect(getSetting('payPeriodAnchor')).toBe(DEFAULT_SETTINGS.payPeriodAnchor);
  });

  it('falls back to default when payPeriodAnchor is an empty string', () => {
    replaceState({ codes: [], days: {}, holidays: [], settings: { payPeriodAnchor: '' } });
    expect(getSetting('payPeriodAnchor')).toBe(DEFAULT_SETTINGS.payPeriodAnchor);
  });

  it('does not apply payPeriodAnchor validation to other keys', () => {
    replaceState({ codes: [], days: {}, holidays: [], settings: { localRetentionDays: 14 } });
    expect(getSetting('localRetentionDays')).toBe(14);
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

// ── validateImport() ──────────────────────────────────────────────────────────

const VALID_CODE = { id: 'abc123', code: '1234-001', name: 'Prog A — design' };

describe('validateImport()', () => {
  // ── valid inputs ────────────────────────────────────────────────────────────

  it('returns null for a minimal valid object with an empty codes array', () => {
    expect(validateImport({ codes: [] })).toBeNull();
  });

  it('returns null for a valid object with a well-formed code entry', () => {
    expect(validateImport({ codes: [VALID_CODE] })).toBeNull();
  });

  it('returns null when the optional days field is absent', () => {
    expect(validateImport({ codes: [VALID_CODE] })).toBeNull();
  });

  it('returns null when days is a valid object', () => {
    expect(validateImport({ codes: [VALID_CODE], days: { '2026-04-16': { hours: {} } } })).toBeNull();
  });

  it('returns null for a full valid export (codes + days + holidays)', () => {
    const data = { codes: [VALID_CODE], days: {}, holidays: [] };
    expect(validateImport(data)).toBeNull();
  });

  // ── top-level type errors ───────────────────────────────────────────────────

  it('returns an error string for null', () => {
    expect(validateImport(null)).toMatch(/Top-level value must be a JSON object/);
  });

  it('returns an error string for an array', () => {
    const msg = validateImport([]);
    expect(msg).toMatch(/Top-level value must be a JSON object/);
    expect(msg).toMatch(/array/);
  });

  it('returns an error string for a number', () => {
    expect(validateImport(42)).toMatch(/Top-level value must be a JSON object/);
  });

  it('returns an error string for a string', () => {
    expect(validateImport('hello')).toMatch(/Top-level value must be a JSON object/);
  });

  // ── missing / wrong-type codes field ───────────────────────────────────────

  it('returns an error when the codes field is missing', () => {
    expect(validateImport({})).toMatch(/Missing required "codes" field/);
  });

  it('returns an error when codes is not an array (object)', () => {
    expect(validateImport({ codes: {} })).toMatch(/"codes" must be an array/);
  });

  it('returns an error when codes is not an array (string)', () => {
    expect(validateImport({ codes: 'bad' })).toMatch(/"codes" must be an array/);
  });

  // ── per-entry validation errors ─────────────────────────────────────────────

  it('returns an error when a codes entry is null', () => {
    expect(validateImport({ codes: [null] })).toMatch(/codes\[0\] must be an object/);
  });

  it('returns an error when a codes entry is missing "id"', () => {
    expect(validateImport({ codes: [{ code: 'X', name: 'Y' }] })).toMatch(/codes\[0\] is missing "id"/);
  });

  it('returns an error when "id" is not a string', () => {
    expect(validateImport({ codes: [{ id: 99, code: 'X', name: 'Y' }] })).toMatch(/has invalid "id"/);
  });

  it('returns an error when a codes entry is missing "code"', () => {
    expect(validateImport({ codes: [{ id: 'abc', name: 'Y' }] })).toMatch(/is missing "code"/);
  });

  it('returns an error when "code" is not a string', () => {
    expect(validateImport({ codes: [{ id: 'abc', code: 123, name: 'Y' }] })).toMatch(/has invalid "code"/);
  });

  it('returns an error when a codes entry is missing "name"', () => {
    expect(validateImport({ codes: [{ id: 'abc', code: 'X' }] })).toMatch(/is missing "name"/);
  });

  it('returns an error when "name" is not a string', () => {
    expect(validateImport({ codes: [{ id: 'abc', code: 'X', name: true }] })).toMatch(/has invalid "name"/);
  });

  it('reports the correct index for the first invalid entry', () => {
    const codes = [VALID_CODE, { code: 'Y', name: 'Z' }]; // second entry missing id
    expect(validateImport({ codes })).toMatch(/codes\[1\]/);
  });

  // ── days field validation ───────────────────────────────────────────────────

  it('returns an error when days is null', () => {
    expect(validateImport({ codes: [], days: null })).toMatch(/"days" must be an object/);
  });

  it('returns an error when days is an array', () => {
    const msg = validateImport({ codes: [], days: [] });
    expect(msg).toMatch(/"days" must be an object/);
    expect(msg).toMatch(/array/);
  });

  it('returns an error when days is a non-object primitive', () => {
    expect(validateImport({ codes: [], days: 'bad' })).toMatch(/"days" must be an object/);
  });

  // ── settings field validation ───────────────────────────────────────────────

  it('returns null when settings is absent', () => {
    expect(validateImport({ codes: [] })).toBeNull();
  });

  it('returns null for a valid settings object with both known keys', () => {
    expect(validateImport({ codes: [], settings: { localRetentionDays: 35, payPeriodAnchor: '2026-04-04' } })).toBeNull();
  });

  it('returns null when settings is an empty object', () => {
    expect(validateImport({ codes: [], settings: {} })).toBeNull();
  });

  it('returns an error when settings is null', () => {
    expect(validateImport({ codes: [], settings: null })).toMatch(/"settings" must be an object/);
  });

  it('returns an error when settings is an array', () => {
    const msg = validateImport({ codes: [], settings: [] });
    expect(msg).toMatch(/"settings" must be an object/);
    expect(msg).toMatch(/array/);
  });

  it('returns an error when settings is a string', () => {
    expect(validateImport({ codes: [], settings: 'bad' })).toMatch(/"settings" must be an object/);
  });

  // localRetentionDays
  it('returns null when localRetentionDays is 0 (minimum valid)', () => {
    expect(validateImport({ codes: [], settings: { localRetentionDays: 0 } })).toBeNull();
  });

  it('returns an error when localRetentionDays is negative', () => {
    const msg = validateImport({ codes: [], settings: { localRetentionDays: -1 } });
    expect(msg).toMatch(/localRetentionDays/);
    expect(msg).toMatch(/finite non-negative integer/);
  });

  it('returns an error when localRetentionDays is a float', () => {
    expect(validateImport({ codes: [], settings: { localRetentionDays: 1.5 } })).toMatch(/localRetentionDays/);
  });

  it('returns an error when localRetentionDays is Infinity', () => {
    expect(validateImport({ codes: [], settings: { localRetentionDays: Infinity } })).toMatch(/localRetentionDays/);
  });

  it('returns an error when localRetentionDays is NaN', () => {
    expect(validateImport({ codes: [], settings: { localRetentionDays: NaN } })).toMatch(/localRetentionDays/);
  });

  it('returns an error when localRetentionDays is a string', () => {
    expect(validateImport({ codes: [], settings: { localRetentionDays: '35' } })).toMatch(/localRetentionDays/);
  });

  // payPeriodAnchor
  it('returns null for a valid payPeriodAnchor', () => {
    expect(validateImport({ codes: [], settings: { payPeriodAnchor: '2026-04-04' } })).toBeNull();
  });

  it('returns an error when payPeriodAnchor is not a string', () => {
    expect(validateImport({ codes: [], settings: { payPeriodAnchor: 20260404 } })).toMatch(/payPeriodAnchor/);
  });

  it('returns an error when payPeriodAnchor has wrong format', () => {
    expect(validateImport({ codes: [], settings: { payPeriodAnchor: '4/4/2026' } })).toMatch(/payPeriodAnchor/);
  });

  it('returns an error when payPeriodAnchor is an impossible calendar date', () => {
    expect(validateImport({ codes: [], settings: { payPeriodAnchor: '2026-02-30' } })).toMatch(/payPeriodAnchor/);
  });

  it('returns an error when payPeriodAnchor is an empty string', () => {
    expect(validateImport({ codes: [], settings: { payPeriodAnchor: '' } })).toMatch(/payPeriodAnchor/);
  });
});

// ── save() — retentionDays clamping ───────────────────────────────────────────

function makeState(retentionDays, dayKeys) {
  const days = {};
  for (const k of dayKeys) days[k] = { hours: {}, clock: { sessions: [] } };
  return { codes: [], days, holidays: [], settings: { localRetentionDays: retentionDays } };
}

describe('save() retentionDays clamping', () => {
  it('prunes oldest days when count exceeds a valid retentionDays', () => {
    const s = makeState(2, ['2026-01-01', '2026-01-02', '2026-01-03']);
    save(s);
    expect(Object.keys(s.days)).toEqual(['2026-01-02', '2026-01-03']);
  });

  it('does not prune when day count equals retentionDays', () => {
    const s = makeState(3, ['2026-01-01', '2026-01-02', '2026-01-03']);
    save(s);
    expect(Object.keys(s.days)).toHaveLength(3);
  });

  it('falls back to DEFAULT_SETTINGS.localRetentionDays when retentionDays is negative', () => {
    const dayKeys = Array.from({ length: DEFAULT_SETTINGS.localRetentionDays + 2 }, (_, i) => {
      const d = new Date(2026, 0, i + 1);
      return `2026-01-${String(i + 1).padStart(2, '0')}`;
    });
    const s = makeState(-1, dayKeys);
    save(s); // must not hang; days pruned to DEFAULT value
    expect(Object.keys(s.days).length).toBeLessThanOrEqual(DEFAULT_SETTINGS.localRetentionDays);
  });

  it('falls back to DEFAULT_SETTINGS.localRetentionDays when retentionDays is Infinity', () => {
    const s = makeState(Infinity, ['2026-01-01', '2026-01-02']);
    save(s);
    expect(Object.keys(s.days)).toHaveLength(2);
  });

  it('falls back to DEFAULT_SETTINGS.localRetentionDays when retentionDays is NaN', () => {
    const s = makeState(NaN, ['2026-01-01', '2026-01-02']);
    save(s);
    expect(Object.keys(s.days)).toHaveLength(2);
  });

  it('accepts 0 as a valid retentionDays and prunes all days', () => {
    const s = makeState(0, ['2026-01-01', '2026-01-02']);
    save(s);
    expect(Object.keys(s.days)).toHaveLength(0);
  });

  it('floors a fractional retentionDays (1.9 → keep 1)', () => {
    const s = makeState(1.9, ['2026-01-01', '2026-01-02', '2026-01-03']);
    save(s);
    expect(Object.keys(s.days)).toHaveLength(1);
  });
});
