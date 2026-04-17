// Tests for buildRangeCSV() — the date-range CSV export formatter.
// This is a pure function: takes explicit arguments, no state or DOM access.

import { describe, it, expect } from 'vitest';
import { buildRangeCSV } from './end-of-day.js';

// Minimal CC objects used across tests
const CC_A = { id: 'a1', code: '1234-A', name: 'Alpha Task', program: 'Prog A', wp: 'WP-001', nickname: 'Alpha' };
const CC_B = { id: 'b2', code: '5678-B', name: 'Beta Task',  program: 'Prog B', wp: '',      nickname: '' };

// Archived codes must be excluded; active codes with 0 hours are also excluded.
const CC_ARCHIVED = { id: 'z9', code: 'ARCH', name: 'Gone', program: '', wp: '', nickname: '', archived: true };

describe('buildRangeCSV()', () => {
  // ── empty / no-match cases ────────────────────────────────────────────────

  it('returns an empty string when mergedDays is empty', () => {
    expect(buildRangeCSV('2026-04-01', '2026-04-30', {}, [CC_A])).toBe('');
  });

  it('returns an empty string when no hours are logged in the range', () => {
    const days = { '2026-04-16': { hours: {}, notes: {} } };
    expect(buildRangeCSV('2026-04-01', '2026-04-30', days, [CC_A])).toBe('');
  });

  it('returns an empty string when the date is outside the requested range', () => {
    const days = { '2026-03-01': { hours: { a1: 4.0 }, notes: {} } };
    expect(buildRangeCSV('2026-04-01', '2026-04-30', days, [CC_A])).toBe('');
  });

  // ── single row output ─────────────────────────────────────────────────────

  it('produces one CSV row for a single CC with hours on one day', () => {
    const days = { '2026-04-16': { hours: { a1: 3.0 }, notes: {} } };
    const csv = buildRangeCSV('2026-04-01', '2026-04-30', days, [CC_A]);
    expect(csv).toBe('2026-04-16,Prog A,WP-001,Alpha Task,1234-A,Alpha,3.0,');
  });

  it('includes a saved note when present', () => {
    const days = { '2026-04-16': { hours: { a1: 4.0 }, notes: { a1: 'Design review' } } };
    const csv = buildRangeCSV('2026-04-01', '2026-04-30', days, [CC_A]);
    expect(csv).toContain('Design review');
  });

  it('formats hours to one decimal place', () => {
    const days = { '2026-04-16': { hours: { a1: 8 }, notes: {} } };
    const csv = buildRangeCSV('2026-04-01', '2026-04-30', days, [CC_A]);
    expect(csv).toContain('8.0');
  });

  // ── multi-row output ──────────────────────────────────────────────────────

  it('produces two rows for two CCs on the same day', () => {
    const days = { '2026-04-16': { hours: { a1: 3.0, b2: 5.0 }, notes: {} } };
    const csv = buildRangeCSV('2026-04-01', '2026-04-30', days, [CC_A, CC_B]);
    const rows = csv.split('\n');
    expect(rows).toHaveLength(2);
  });

  it('produces rows sorted by date ascending', () => {
    const days = {
      '2026-04-18': { hours: { a1: 2.0 }, notes: {} },
      '2026-04-16': { hours: { a1: 4.0 }, notes: {} },
    };
    const csv = buildRangeCSV('2026-04-01', '2026-04-30', days, [CC_A]);
    const rows = csv.split('\n');
    expect(rows[0]).toMatch(/^2026-04-16,/);
    expect(rows[1]).toMatch(/^2026-04-18,/);
  });

  it('includes only dates within [startISO, endISO] inclusive', () => {
    const days = {
      '2026-03-31': { hours: { a1: 1.0 }, notes: {} }, // before start
      '2026-04-01': { hours: { a1: 2.0 }, notes: {} }, // start (inclusive)
      '2026-04-30': { hours: { a1: 3.0 }, notes: {} }, // end (inclusive)
      '2026-05-01': { hours: { a1: 4.0 }, notes: {} }, // after end
    };
    const csv = buildRangeCSV('2026-04-01', '2026-04-30', days, [CC_A]);
    const rows = csv.split('\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(/^2026-04-01,/);
    expect(rows[1]).toMatch(/^2026-04-30,/);
  });

  // ── archived codes ────────────────────────────────────────────────────────

  it('excludes archived codes from output', () => {
    const days = { '2026-04-16': { hours: { a1: 3.0, z9: 5.0 }, notes: {} } };
    const csv = buildRangeCSV('2026-04-01', '2026-04-30', days, [CC_A, CC_ARCHIVED]);
    const rows = csv.split('\n');
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toContain('ARCH');
  });

  // ── CSV quoting ───────────────────────────────────────────────────────────

  it('wraps field values containing commas in double quotes', () => {
    const ccComma = { id: 'c1', code: 'X', name: 'Task, Extra', program: '', wp: '', nickname: '' };
    const days = { '2026-04-16': { hours: { c1: 1.0 }, notes: {} } };
    const csv = buildRangeCSV('2026-04-01', '2026-04-30', days, [ccComma]);
    expect(csv).toContain('"Task, Extra"');
  });

  it('wraps field values containing double quotes and escapes them', () => {
    const ccQuote = { id: 'd1', code: 'Y', name: 'He said "hi"', program: '', wp: '', nickname: '' };
    const days = { '2026-04-16': { hours: { d1: 1.0 }, notes: {} } };
    const csv = buildRangeCSV('2026-04-01', '2026-04-30', days, [ccQuote]);
    expect(csv).toContain('"He said ""hi"""');
  });

  // ── optional fields ───────────────────────────────────────────────────────

  it('uses empty string for missing program, wp, and nickname fields', () => {
    const minimal = { id: 'm1', code: 'MIN', name: 'Minimal', program: '', wp: '', nickname: '' };
    const days = { '2026-04-16': { hours: { m1: 2.0 }, notes: {} } };
    const csv = buildRangeCSV('2026-04-01', '2026-04-30', days, [minimal]);
    // date,program,wp,name,code,nickname,hours,note  → ,,,, for empty program/wp/nickname/note
    expect(csv).toBe('2026-04-16,,,Minimal,MIN,,2.0,');
  });
});
