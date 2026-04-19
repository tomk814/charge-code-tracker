// Checks GitHub releases for a newer version and shows a banner if one exists.
// Reads disableUpdateCheck, skipPatchUpdates, skipMinorUpdates from settings.
// Fails silently if offline or the API is unavailable.

import { getSetting } from './persistence.js';
import { esc } from './utilities.js';

const REPO = 'tomk814/charge-code-tracker';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';

// Set by showUpdateBanner(); consumed by selfUpdate().
let _pendingHtmlUrl = null;

export function initVersionFooter() {
  const el = document.getElementById('footer-version-label');
  if (el) el.textContent = APP_VERSION;
}

// Exported for unit tests only.
export function parseVersion(v) {
  const m = String(v).replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

// Exported for unit tests only.
export function isNewer(current, latest) {
  for (let i = 0; i < 3; i++) {
    if (latest[i] > current[i]) return true;
    if (latest[i] < current[i]) return false;
  }
  return false;
}

export function dismissUpdateBanner() {
  const el = document.getElementById('update-banner');
  if (el) el.style.display = 'none';
}

// Fetches the latest release HTML and writes it to disk via the File System
// Access API, then prompts to reload. Falls back to a direct download anchor
// when the API is unavailable (e.g. opened via file:// on older Chromium).
export async function selfUpdate() {
  if (!_pendingHtmlUrl) return;

  const btn = document.getElementById('update-self-btn');

  if (!('showSaveFilePicker' in globalThis)) {
    const a = document.createElement('a');
    a.href = _pendingHtmlUrl;
    a.download = 'time_tracker.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Downloading…'; }

  try {
    const resp = await fetch(_pendingHtmlUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();

    const fh = await globalThis.showSaveFilePicker({
      suggestedName: 'time_tracker.html',
      types: [{ description: 'HTML file', accept: { 'text/html': ['.html'] } }],
    });
    const writable = await fh.createWritable();
    await writable.write(text);
    await writable.close();

    if (globalThis.confirm('time_tracker.html saved. Reload now to run the new version?')) {
      globalThis.location.reload();
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      if (btn) { btn.disabled = false; btn.textContent = 'Update'; }
      return;
    }
    const bannerEl = document.getElementById('update-banner');
    if (bannerEl) {
      const span = document.createElement('span');
      span.style.color = 'var(--red)';
      span.textContent = ' (download failed)';
      bannerEl.appendChild(span);
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Update'; }
  }
}

// _versionOverride is used by unit tests to bypass the APP_VERSION module constant.
export async function checkForUpdates({ _versionOverride } = {}) {
  if (getSetting('disableUpdateCheck')) return;
  const version = _versionOverride ?? APP_VERSION;
  if (version === 'dev') return;

  const current = parseVersion(version);
  if (!current) return;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!resp.ok) return;

    const data = await resp.json();
    const latest = parseVersion(data.tag_name);
    if (!latest || !isNewer(current, latest)) return;

    const [curMaj, curMin] = current;
    const [latMaj, latMin] = latest;
    const isMajor = latMaj > curMaj;
    const isMinor = !isMajor && latMin > curMin;
    const isPatch = !isMajor && !isMinor;

    if (isPatch && getSetting('skipPatchUpdates')) return;
    if (isMinor && getSetting('skipMinorUpdates')) return;

    const tag = data.tag_name;
    const htmlUrl = `https://github.com/${REPO}/releases/download/${tag}/time_tracker.html`;
    showUpdateBanner(tag, htmlUrl);
  } catch {
    // fail silently — offline or API unavailable
  }
}

function showUpdateBanner(version, htmlUrl) {
  _pendingHtmlUrl = htmlUrl;
  const el = document.getElementById('update-banner');
  if (!el) return;
  el.innerHTML =
    `Update available: <strong>${esc(version)}</strong> &larr; ${esc(APP_VERSION)} &mdash; ` +
    `<button id="update-self-btn" class="update-banner-btn" onclick="selfUpdate()">Update</button>` +
    `<button class="update-banner-dismiss" onclick="dismissUpdateBanner()" ` +
    `title="Dismiss">&#10005;</button>`;
  el.style.display = '';
}
