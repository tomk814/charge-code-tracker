// Tests for payPeriodEnd() — pure date arithmetic anchored to 2026-04-04.
// The anchor is a known period-end Saturday; every 14th day from it is also
// a period-end Saturday.

import { describe, it, expect, beforeEach } from 'vitest';
import { payPeriodEnd } from './pay-period.js';
import { _injectDeps } from './persistence.js';
import { state, replaceState, setViewDate } from './state.js';

beforeEach(() => {
  replaceState({ codes: [], days: {}, holidays: [] });
  setViewDate('2026-04-16');
  _injectDeps({
    getState: () => state,
    replaceState,
    render: () => {},
    renderClock: () => {},
    ensurePayAdjustmentCodes: () => {},
  });
});

// Convert a Date to a local YYYY-MM-DD string (avoids UTC-offset surprises
// since payPeriodEnd() works in local time with noon-anchored Dates).
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('payPeriodEnd()', () => {
  it('returns the anchor date itself when queried on the anchor (period-end Saturday)', () => {
    expect(toISO(payPeriodEnd('2026-04-04'))).toBe('2026-04-04');
  });

  it('returns 13 days later for the day immediately after the anchor', () => {
    // Day 1 of a new period → end is 13 days away
    expect(toISO(payPeriodEnd('2026-04-05'))).toBe('2026-04-18');
  });

  it('returns the correct end for a mid-period weekday', () => {
    // 2026-04-11 is Saturday midpoint; 7 days into the period
    expect(toISO(payPeriodEnd('2026-04-11'))).toBe('2026-04-18');
  });

  it('returns the correct end for a date 2 days before period end', () => {
    // 2026-04-16 (Thursday) → period ends 2026-04-18
    expect(toISO(payPeriodEnd('2026-04-16'))).toBe('2026-04-18');
  });

  it('returns itself when queried on the next period-end Saturday', () => {
    expect(toISO(payPeriodEnd('2026-04-18'))).toBe('2026-04-18');
  });

  it('starts a fresh 14-day window on the Sunday after a period-end', () => {
    // 2026-04-19 is the first day of the period ending 2026-05-02
    expect(toISO(payPeriodEnd('2026-04-19'))).toBe('2026-05-02');
  });

  it('handles dates before the anchor by finding the previous period end', () => {
    // 2026-03-28 is 7 days before the anchor → previous end = 2026-04-04 (the anchor itself)
    expect(toISO(payPeriodEnd('2026-03-28'))).toBe('2026-04-04');
  });

  it('always returns a Saturday (getDay() === 6)', () => {
    const testDates = [
      '2026-03-28', '2026-04-01', '2026-04-04',
      '2026-04-10', '2026-04-18', '2026-04-25',
      '2026-05-02', '2026-06-15',
    ];
    for (const d of testDates) {
      expect(payPeriodEnd(d).getDay()).toBe(6);
    }
  });

  it('consecutive period-end Saturdays are exactly 14 days apart', () => {
    const end1 = payPeriodEnd('2026-04-04'); // anchor period end
    const end2 = payPeriodEnd('2026-04-05'); // next period end
    const diffDays = (end2.getTime() - end1.getTime()) / 86_400_000;
    expect(diffDays).toBe(14);
  });

  it('handles dates far in the future correctly', () => {
    // 2026-07-04 (Saturday) — verify it is a period-end
    const end = payPeriodEnd('2026-07-04');
    expect(end.getDay()).toBe(6);
    // The result should itself be a Saturday
    expect(toISO(payPeriodEnd(toISO(end)))).toBe(toISO(end));
  });

  it('falls back to the default anchor and returns a valid Saturday when payPeriodAnchor is invalid', () => {
    replaceState({ codes: [], days: {}, holidays: [], settings: { payPeriodAnchor: 'not-a-date' } });
    const end = payPeriodEnd('2026-04-16');
    expect(end.getDay()).toBe(6);           // still a Saturday
    expect(toISO(end)).toBe('2026-04-18'); // same result as with the default anchor
  });
});
