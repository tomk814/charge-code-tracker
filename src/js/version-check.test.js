// Tests for version-check.js: parseVersion, isNewer, and checkForUpdates.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseVersion, isNewer, checkForUpdates, dismissUpdateBanner } from './version-check.js';

// ── Mock persistence.getSetting ───────────────────────────────────────────────
// Default: all update settings off (feature enabled, no skipping).
const mockGetSetting = vi.fn(key => ({
  disableUpdateCheck: false,
  skipPatchUpdates:   false,
  skipMinorUpdates:   false,
}[key] ?? false));

vi.mock('./persistence.js', () => ({
  getSetting: (...args) => mockGetSetting(...args),
  setSetting: vi.fn(),
}));

// ── Mock esc() ────────────────────────────────────────────────────────────────
vi.mock('./utilities.js', () => ({
  esc: s => String(s),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(tagName, { ok = true, assetUrl = null } = {}) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve({
        tag_name: tagName,
        html_url: `https://github.com/tomk814/charge-code-tracker/releases/tag/${tagName}`,
        assets: assetUrl ? [{ browser_download_url: assetUrl }] : [],
      }),
    }),
  );
}

// Track banner mutations via a fake element.
// Includes a mock querySelector so tests can inspect the link href set via DOM property.
function makeBannerEl() {
  const link = { href: '' };
  return {
    innerHTML: '',
    style: { display: 'none' },
    querySelector: (sel) => sel === '#update-banner-link' ? link : null,
    _link: link,
  };
}

beforeEach(() => {
  mockGetSetting.mockImplementation(key => ({
    disableUpdateCheck: false,
    skipPatchUpdates:   false,
    skipMinorUpdates:   false,
  }[key] ?? false));

  global.fetch = vi.fn();

  // Default getElementById returns null (from test-setup), good for most tests.
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

// ── parseVersion() ────────────────────────────────────────────────────────────

describe('parseVersion()', () => {
  it('parses a plain semver string', () => {
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
  });

  it('strips a leading v', () => {
    expect(parseVersion('v1.0.0')).toEqual([1, 0, 0]);
  });

  it('ignores prerelease suffix', () => {
    expect(parseVersion('v2.0.0-alpha.1')).toEqual([2, 0, 0]);
    expect(parseVersion('v1.3.0-alpha.12')).toEqual([1, 3, 0]);
  });

  it('parses large version numbers', () => {
    expect(parseVersion('v10.20.30')).toEqual([10, 20, 30]);
  });

  it('returns null for "dev"', () => {
    expect(parseVersion('dev')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseVersion('')).toBeNull();
  });

  it('returns null for an arbitrary string', () => {
    expect(parseVersion('not-a-version')).toBeNull();
  });

  it('returns null for a partial version', () => {
    expect(parseVersion('1.0')).toBeNull();
  });
});

// ── isNewer() ────────────────────────────────────────────────────────────────

describe('isNewer()', () => {
  it('is false when versions are identical', () => {
    expect(isNewer([1, 0, 0], [1, 0, 0])).toBe(false);
  });

  it('is true for a patch bump', () => {
    expect(isNewer([1, 0, 0], [1, 0, 1])).toBe(true);
  });

  it('is true for a minor bump', () => {
    expect(isNewer([1, 0, 0], [1, 1, 0])).toBe(true);
  });

  it('is true for a major bump', () => {
    expect(isNewer([1, 0, 0], [2, 0, 0])).toBe(true);
  });

  it('is false when local is ahead by patch', () => {
    expect(isNewer([1, 0, 1], [1, 0, 0])).toBe(false);
  });

  it('is false when local is ahead by minor', () => {
    expect(isNewer([1, 2, 0], [1, 1, 9])).toBe(false);
  });

  it('is false when local is ahead by major', () => {
    expect(isNewer([2, 0, 0], [1, 9, 9])).toBe(false);
  });

  it('minor bump wins over larger patch on older minor', () => {
    expect(isNewer([1, 1, 5], [1, 2, 0])).toBe(true);
    expect(isNewer([1, 2, 0], [1, 1, 5])).toBe(false);
  });
});

// ── checkForUpdates() ─────────────────────────────────────────────────────────

describe('checkForUpdates()', () => {
  it('does not fetch when disableUpdateCheck is true', async () => {
    mockGetSetting.mockImplementation(key =>
      key === 'disableUpdateCheck' ? true : false,
    );
    await checkForUpdates({ _versionOverride: 'v1.0.0' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not fetch when version is "dev"', async () => {
    mockFetch('v1.1.0');
    await checkForUpdates({ _versionOverride: 'dev' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not fetch when version is unparseable', async () => {
    mockFetch('v1.1.0');
    await checkForUpdates({ _versionOverride: 'garbage' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches the GitHub releases API when a parseable version is provided', async () => {
    mockFetch('v1.0.0'); // same version → no banner
    await checkForUpdates({ _versionOverride: 'v1.0.0' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/tomk814/charge-code-tracker/releases/latest',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('fails silently when fetch throws (offline)', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
    await expect(checkForUpdates({ _versionOverride: 'v1.0.0' })).resolves.toBeUndefined();
  });

  it('fails silently when the API returns a non-ok status', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
    await expect(checkForUpdates({ _versionOverride: 'v1.0.0' })).resolves.toBeUndefined();
  });

  it('does not show a banner when already on the latest version', async () => {
    mockFetch('v1.0.0');
    const el = makeBannerEl();
    vi.spyOn(document, 'getElementById').mockReturnValue(el);
    await checkForUpdates({ _versionOverride: 'v1.0.0' });
    expect(el.style.display).toBe('none');
  });

  it('does not show a banner when already on a newer version', async () => {
    mockFetch('v1.0.0');
    const el = makeBannerEl();
    vi.spyOn(document, 'getElementById').mockReturnValue(el);
    await checkForUpdates({ _versionOverride: 'v1.1.0' });
    expect(el.style.display).toBe('none');
  });

  it('shows the banner when a newer version exists', async () => {
    mockFetch('v1.1.0');
    const el = makeBannerEl();
    vi.spyOn(document, 'getElementById').mockReturnValue(el);
    await checkForUpdates({ _versionOverride: 'v1.0.0' });
    expect(el.style.display).toBe('');
    expect(el.innerHTML).toContain('v1.1.0');
  });

  it('includes a download link in the banner', async () => {
    mockFetch('v1.1.0', { assetUrl: 'https://github.com/tomk814/charge-code-tracker/releases/download/v1.1.0/time_tracker.zip' });
    const el = makeBannerEl();
    vi.spyOn(document, 'getElementById').mockReturnValue(el);
    await checkForUpdates({ _versionOverride: 'v1.0.0' });
    expect(el._link.href).toContain('time_tracker.zip');
  });

  it('falls back to html_url when there are no release assets', async () => {
    mockFetch('v1.1.0', { assetUrl: null });
    const el = makeBannerEl();
    vi.spyOn(document, 'getElementById').mockReturnValue(el);
    await checkForUpdates({ _versionOverride: 'v1.0.0' });
    expect(el._link.href).toContain('/releases/tag/v1.1.0');
  });

  // ── Skip settings ──────────────────────────────────────────────────────────

  it('suppresses patch-only bumps when skipPatchUpdates is true', async () => {
    mockGetSetting.mockImplementation(key =>
      key === 'skipPatchUpdates' ? true : false,
    );
    mockFetch('v1.0.1');
    const el = makeBannerEl();
    vi.spyOn(document, 'getElementById').mockReturnValue(el);
    await checkForUpdates({ _versionOverride: 'v1.0.0' });
    expect(el.style.display).toBe('none');
  });

  it('still shows minor bumps when skipPatchUpdates is true', async () => {
    mockGetSetting.mockImplementation(key =>
      key === 'skipPatchUpdates' ? true : false,
    );
    mockFetch('v1.1.0');
    const el = makeBannerEl();
    vi.spyOn(document, 'getElementById').mockReturnValue(el);
    await checkForUpdates({ _versionOverride: 'v1.0.0' });
    expect(el.style.display).toBe('');
  });

  it('suppresses minor bumps when skipMinorUpdates is true', async () => {
    mockGetSetting.mockImplementation(key =>
      key === 'skipMinorUpdates' ? true : false,
    );
    mockFetch('v1.1.0');
    const el = makeBannerEl();
    vi.spyOn(document, 'getElementById').mockReturnValue(el);
    await checkForUpdates({ _versionOverride: 'v1.0.0' });
    expect(el.style.display).toBe('none');
  });

  it('patch bumps are not suppressed by skipMinorUpdates alone', async () => {
    mockGetSetting.mockImplementation(key =>
      key === 'skipMinorUpdates' ? true : false,
    );
    mockFetch('v1.0.1');
    const el = makeBannerEl();
    vi.spyOn(document, 'getElementById').mockReturnValue(el);
    await checkForUpdates({ _versionOverride: 'v1.0.0' });
    expect(el.style.display).toBe(''); // patch is still shown; only minor is skipped
  });

  it('always shows major bumps even when both patch and minor skips are on', async () => {
    mockGetSetting.mockImplementation(key =>
      key === 'skipPatchUpdates' || key === 'skipMinorUpdates' ? true : false,
    );
    mockFetch('v2.0.0');
    const el = makeBannerEl();
    vi.spyOn(document, 'getElementById').mockReturnValue(el);
    await checkForUpdates({ _versionOverride: 'v1.0.0' });
    expect(el.style.display).toBe('');
    expect(el.innerHTML).toContain('v2.0.0');
  });
});

// ── dismissUpdateBanner() ─────────────────────────────────────────────────────

describe('dismissUpdateBanner()', () => {
  it('hides the banner element', () => {
    const el = { style: { display: '' } };
    vi.spyOn(document, 'getElementById').mockReturnValue(el);
    dismissUpdateBanner();
    expect(el.style.display).toBe('none');
  });

  it('does nothing when the banner element is absent', () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null);
    expect(() => dismissUpdateBanner()).not.toThrow();
  });
});
