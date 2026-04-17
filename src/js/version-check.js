// Checks GitHub releases for a newer version and shows a banner if one exists.
// Reads disableUpdateCheck, skipPatchUpdates, skipMinorUpdates from settings.
// Fails silently if offline or the API is unavailable.

import { getSetting } from './persistence.js';
import { esc } from './utilities.js';

const REPO = 'tomk814/charge-code-tracker';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';

export function initVersionFooter() {
  const el = document.getElementById('footer-version-label');
  if (el) el.textContent = APP_VERSION;
}

function parseVersion(v) {
  const m = String(v).replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function isNewer(current, latest) {
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

export async function checkForUpdates() {
  if (getSetting('disableUpdateCheck')) return;
  if (APP_VERSION === 'dev') return;

  const current = parseVersion(APP_VERSION);
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

    const downloadUrl =
      data.assets?.[0]?.browser_download_url ?? data.html_url;
    showUpdateBanner(data.tag_name, downloadUrl);
  } catch {
    // fail silently — offline or API unavailable
  }
}

function showUpdateBanner(version, downloadUrl) {
  const el = document.getElementById('update-banner');
  if (!el) return;
  el.innerHTML =
    `Update available: <strong>${esc(version)}</strong> &mdash; ` +
    `<a href="${esc(downloadUrl)}" target="_blank" rel="noopener noreferrer" ` +
    `style="color:var(--blue);text-decoration:none">Download</a>` +
    `<button class="update-banner-dismiss" onclick="dismissUpdateBanner()" ` +
    `title="Dismiss">&#10005;</button>`;
  el.style.display = '';
}
