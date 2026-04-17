import { describe, it, expect } from 'vitest';
import initJson from '../data/init.json';

describe('src/data/init.json', () => {
  it('has exactly the expected top-level keys', () => {
    expect(Object.keys(initJson).sort()).toEqual(
      ['codes', 'days', 'holidays', 'settings', 'showIncrements'].sort()
    );
  });

  it('codes is an empty array', () => {
    expect(Array.isArray(initJson.codes)).toBe(true);
    expect(initJson.codes).toHaveLength(0);
  });

  it('days is an empty object', () => {
    expect(initJson.days).toBeTruthy();
    expect(typeof initJson.days).toBe('object');
    expect(Array.isArray(initJson.days)).toBe(false);
    expect(Object.keys(initJson.days)).toHaveLength(0);
  });

  it('holidays is an empty array', () => {
    expect(Array.isArray(initJson.holidays)).toBe(true);
    expect(initJson.holidays).toHaveLength(0);
  });

  it('showIncrements is false', () => {
    expect(initJson.showIncrements).toBe(false);
  });

  it('settings has the expected default keys and values', () => {
    expect(typeof initJson.settings).toBe('object');
    expect(initJson.settings.localRetentionDays).toBe(35);
    expect(initJson.settings.payPeriodAnchor).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
