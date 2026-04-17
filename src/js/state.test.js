// Tests for the state module's mutable bindings and initialisation.
// state.js runs load() on import, which reads from localStorage (mocked in test-setup.js).

import { describe, it, expect, beforeEach } from 'vitest';
import { state, viewDate, replaceState, setViewDate } from './state.js';
import { PREDEFINED_PA_CODES, load } from './persistence.js';

// Reset to a known baseline before each test so tests don't bleed into each other.
beforeEach(() => {
  replaceState({ codes: [], days: {}, holidays: [] });
  setViewDate('2026-04-16');
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe('initial state (empty localStorage)', () => {
  it('loads with all PREDEFINED_PA_CODES when localStorage is empty', () => {
    // localStorage is cleared before each test by test-setup.js beforeEach.
    const loaded = load();
    expect(loaded.codes).toHaveLength(PREDEFINED_PA_CODES.length);
    expect(loaded.codes.map(c => c.id)).toEqual(PREDEFINED_PA_CODES.map(c => c.id));
  });

  it('has an empty days object by default', () => {
    const loaded = load();
    expect(loaded.days).toEqual({});
  });
});

// ── replaceState() ────────────────────────────────────────────────────────────

describe('replaceState()', () => {
  it('updates the state live binding', () => {
    const newState = { codes: [{ id: 'x1', code: 'XYZ', name: 'Test CC' }], days: {}, holidays: [] };
    replaceState(newState);
    expect(state).toBe(newState);
  });

  it('subsequent reads reflect the replaced state', () => {
    replaceState({ codes: [], days: { '2026-01-01': { hours: {}, clock: { sessions: [] } } }, holidays: [] });
    expect(Object.keys(state.days)).toContain('2026-01-01');
  });

  it('replacing with a new object does not retain fields from the old one', () => {
    replaceState({ codes: [{ id: 'a' }], days: {}, holidays: [] });
    replaceState({ codes: [], days: {}, holidays: [] });
    expect(state.codes).toHaveLength(0);
  });
});

// ── setViewDate() ─────────────────────────────────────────────────────────────

describe('setViewDate()', () => {
  it('updates the viewDate live binding', () => {
    setViewDate('2026-01-15');
    expect(viewDate).toBe('2026-01-15');
  });

  it('returns a different value after being changed', () => {
    expect(viewDate).toBe('2026-04-16'); // set in beforeEach
    setViewDate('2026-12-31');
    expect(viewDate).toBe('2026-12-31');
  });

  it('accepts any ISO date string', () => {
    const dates = ['2025-01-01', '2026-04-16', '2026-12-31'];
    for (const d of dates) {
      setViewDate(d);
      expect(viewDate).toBe(d);
    }
  });
});
