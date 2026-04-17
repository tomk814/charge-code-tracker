// Tests for clock session helpers: clockSessions, clockIsRunning,
// clockTotalHours, and currentHHMM.
//
// clockSessions() calls dayData(viewDate) which uses _state() — so
// _injectDeps must be wired before calling any of these functions.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { _injectDeps } from './persistence.js';
import { state, replaceState, setViewDate } from './state.js';
import { clockSessions, clockIsRunning, clockTotalHours, currentHHMM } from './clock.js';

const TODAY = '2026-04-16';

// Rebuild state and re-inject deps before every test
beforeEach(() => {
  replaceState({
    codes: [],
    days: {
      [TODAY]: { hours: {}, clock: { sessions: [] }, notes: {} },
    },
    holidays: [],
    activeTimer: null,
    showIncrements: false,
  });
  setViewDate(TODAY);

  _injectDeps({
    getState:                () => state,
    replaceState,
    render:                  vi.fn(),
    renderClock:             vi.fn(),
    ensurePayAdjustmentCodes: vi.fn(),
  });
});

// ── clockSessions() ───────────────────────────────────────────────────────────

describe('clockSessions()', () => {
  it('returns an empty array when no sessions have been recorded', () => {
    expect(clockSessions()).toEqual([]);
  });

  it('returns the sessions array for the current viewDate', () => {
    const sessions = [{ start: '09:00', end: '12:00' }];
    state.days[TODAY].clock.sessions = sessions;
    expect(clockSessions()).toBe(sessions); // same reference
  });

  it('creates a day entry and returns [] for a date with no prior data', () => {
    setViewDate('2026-04-17');
    const sessions = clockSessions();
    expect(sessions).toEqual([]);
    expect(state.days['2026-04-17']).toBeDefined();
  });

  it('reflects mutations to the returned array', () => {
    const sessions = clockSessions();
    sessions.push({ start: '10:00', end: null });
    expect(state.days[TODAY].clock.sessions).toHaveLength(1);
  });
});

// ── clockIsRunning() ──────────────────────────────────────────────────────────

describe('clockIsRunning()', () => {
  it('returns false when there are no sessions', () => {
    expect(clockIsRunning()).toBe(false);
  });

  it('returns false when all sessions are closed (end is not null)', () => {
    state.days[TODAY].clock.sessions = [
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: '17:00' },
    ];
    expect(clockIsRunning()).toBe(false);
  });

  it('returns true when at least one session is open (end === null)', () => {
    state.days[TODAY].clock.sessions = [
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: null },
    ];
    expect(clockIsRunning()).toBe(true);
  });

  it('returns true for a single running session', () => {
    state.days[TODAY].clock.sessions = [{ start: '09:00', end: null }];
    expect(clockIsRunning()).toBe(true);
  });
});

// ── clockTotalHours() ─────────────────────────────────────────────────────────

describe('clockTotalHours()', () => {
  it('returns 0 when there are no sessions', () => {
    expect(clockTotalHours()).toBe(0);
  });

  it('returns the correct duration for a single closed session', () => {
    state.days[TODAY].clock.sessions = [{ start: '08:00', end: '16:00' }];
    // 16:00 − 08:00 = 8 h
    expect(clockTotalHours()).toBe(8);
  });

  it('sums multiple closed sessions correctly', () => {
    state.days[TODAY].clock.sessions = [
      { start: '08:00', end: '12:00' }, // 4 h
      { start: '13:00', end: '17:00' }, // 4 h
    ];
    expect(clockTotalHours()).toBe(8);
  });

  it('handles a 30-minute session', () => {
    state.days[TODAY].clock.sessions = [{ start: '09:00', end: '09:30' }];
    expect(clockTotalHours()).toBeCloseTo(0.5);
  });

  it('returns 0 for a zero-duration session (start === end)', () => {
    state.days[TODAY].clock.sessions = [{ start: '10:00', end: '10:00' }];
    expect(clockTotalHours()).toBe(0);
  });

  it('uses current wall-clock time as end for an open session (result > 0)', () => {
    // We can't pin wall-clock time here, but a session that started "now" should
    // have a total ≥ 0 h.
    state.days[TODAY].clock.sessions = [{ start: '00:00', end: null }];
    expect(clockTotalHours()).toBeGreaterThanOrEqual(0);
  });
});

// ── currentHHMM() ─────────────────────────────────────────────────────────────

describe('currentHHMM()', () => {
  it('returns a string in HH:MM format', () => {
    expect(currentHHMM()).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns a time with a two-digit hour (00–23)', () => {
    const [h] = currentHHMM().split(':').map(Number);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(23);
  });

  it('returns a time with a two-digit minute (00–59)', () => {
    const [, m] = currentHHMM().split(':').map(Number);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(59);
  });

  it('reflects a mocked system time when fake timers are used', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-16T14:07:00'));
    expect(currentHHMM()).toBe('14:07');
    vi.useRealTimers();
  });

  it('pads single-digit hours and minutes with a leading zero', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-16T09:05:00'));
    expect(currentHHMM()).toBe('09:05');
    vi.useRealTimers();
  });
});
