// Tests for pure-logic functions in cc-modals.js.
// DOM-dependent functions (openAddCC, openManage, etc.) are not tested here.

import { describe, it, expect } from 'vitest';
import { isProtectedCC } from './cc-modals.js';

// ── isProtectedCC() ───────────────────────────────────────────────────────────

describe('isProtectedCC()', () => {
  // ── predefined PA codes pa0001–pa0009 (protected) ──────────────────────────

  it('returns true for pa0001', () => {
    expect(isProtectedCC('pa0001')).toBe(true);
  });

  it('returns true for pa0002', () => {
    expect(isProtectedCC('pa0002')).toBe(true);
  });

  it('returns true for pa0006 (HOL)', () => {
    expect(isProtectedCC('pa0006')).toBe(true);
  });

  it('returns true for all nine predefined IDs pa0001–pa0009', () => {
    for (let i = 1; i <= 9; i++) {
      expect(isProtectedCC(`pa000${i}`), `pa000${i}`).toBe(true);
    }
  });

  // ── regular user-created charge code IDs (not protected) ───────────────────

  it('returns false for a typical short random ID', () => {
    expect(isProtectedCC('abc123')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isProtectedCC('')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isProtectedCC(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isProtectedCC(null)).toBe(false);
  });

  // ── boundary: IDs that look like PA codes but are not in range ──────────────

  it('returns false for pa0000 (out of range — predefined range is 1–9)', () => {
    expect(isProtectedCC('pa0000')).toBe(false);
  });

  it('returns false for pa0010 (two-digit suffix — out of range)', () => {
    expect(isProtectedCC('pa0010')).toBe(false);
  });

  it('returns false for PA0001 (wrong case)', () => {
    expect(isProtectedCC('PA0001')).toBe(false);
  });

  it('returns false for a string with leading/trailing whitespace', () => {
    expect(isProtectedCC(' pa0001')).toBe(false);
    expect(isProtectedCC('pa0001 ')).toBe(false);
  });

  it('returns false for a numeric argument', () => {
    expect(isProtectedCC(1)).toBe(false);
  });
});
