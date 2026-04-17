import { describe, it, expect, vi, afterEach } from 'vitest';
import { esc, uid } from './utilities.js';

// ── esc() ─────────────────────────────────────────────────────────────────────

describe('esc()', () => {
  it('returns empty string for empty input', () => {
    expect(esc('')).toBe('');
  });

  it('returns empty string for null (falsy coercion)', () => {
    expect(esc(null)).toBe('');
  });

  it('returns empty string for undefined (falsy coercion)', () => {
    expect(esc(undefined)).toBe('');
  });

  it('escapes ampersands', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than signs', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater-than signs', () => {
    expect(esc('3 > 2 < 4')).toBe('3 &gt; 2 &lt; 4');
  });

  it('escapes all three HTML special characters together', () => {
    expect(esc('<b>Hello & World</b>')).toBe('&lt;b&gt;Hello &amp; World&lt;/b&gt;');
  });

  it('escapes multiple occurrences of the same character', () => {
    expect(esc('a & b & c')).toBe('a &amp; b &amp; c');
  });

  it('leaves plain text unchanged', () => {
    expect(esc('hello world')).toBe('hello world');
    expect(esc('1234-001')).toBe('1234-001');
  });

  it('converts numbers to strings before escaping', () => {
    expect(esc(42)).toBe('42');
  });

  it('converts boolean true to string', () => {
    expect(esc(true)).toBe('true');
  });

  it('handles strings with only special characters', () => {
    expect(esc('<>&')).toBe('&lt;&gt;&amp;');
  });
});

// ── uid() ─────────────────────────────────────────────────────────────────────

describe('uid()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a string', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(typeof uid()).toBe('string');
  });

  it('returns a non-empty string for typical Math.random() values', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789012345);
    expect(uid().length).toBeGreaterThan(0);
  });

  it('returns at most 6 characters (slice(2,8) of base-36 float)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789012345);
    expect(uid().length).toBeLessThanOrEqual(6);
  });

  it('contains only lowercase base-36 characters [0-9a-z]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.987654321);
    expect(uid()).toMatch(/^[0-9a-z]+$/);
  });

  it('generates distinct IDs for distinct Math.random() inputs', () => {
    let counter = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => (counter++ + 1) / 200);
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});
