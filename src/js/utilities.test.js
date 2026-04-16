import { describe, it, expect } from 'vitest';
import { esc, uid } from './utilities.js';

describe('esc()', () => {
  it('returns empty string for falsy input', () => {
    expect(esc('')).toBe('');
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  it('escapes & < >', () => {
    expect(esc('a & b')).toBe('a &amp; b');
    expect(esc('<script>')).toBe('&lt;script&gt;');
    expect(esc('3 > 2 < 4')).toBe('3 &gt; 2 &lt; 4');
  });

  it('leaves safe strings unchanged', () => {
    expect(esc('hello world')).toBe('hello world');
    expect(esc('1234-001')).toBe('1234-001');
  });
});

describe('uid()', () => {
  it('returns a non-empty string', () => {
    expect(typeof uid()).toBe('string');
    expect(uid().length).toBeGreaterThan(0);
  });

  it('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});
