// CSV export: date-range picker modal and CSV file generation.

import { state } from './state.js';
import { today, ymdLocal } from './persistence.js';
import { getBackupHandle } from './backup.js';
import { esc } from './utilities.js';
import { showModal, closeModal } from './modal-infra.js';
import { payPeriodEnd } from './pay-period.js';

export function buildRangeCSV(startISO, endISO, mergedDays, codes) {
  const csvField = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g,'""')}"` : String(v);
  const rows = [];
  Object.keys(mergedDays)
    .filter(d => d >= startISO && d <= endISO)
    .sort()
    .forEach(date => {
      const dayEntry = mergedDays[date];
      const hours    = dayEntry.hours || {};
      const notes    = dayEntry.notes || {};
      codes.filter(c => !c.archived).forEach(cc => {
        const hrs = hours[cc.id] || 0;
        if (!hrs) return;
        rows.push([
          date, cc.program||'', cc.wp||'', cc.name,
          cc.code, cc.nickname||'', hrs.toFixed(1), notes[cc.id]||''
        ].map(csvField).join(','));
      });
    });
  return rows.join('\n');
}

async function buildExportDays() {
  let merged = JSON.parse(JSON.stringify(state.days));
  const handle = await getBackupHandle().catch(() => null);
  if (handle) {
    const perm = await handle.queryPermission({ mode: 'readwrite' }).catch(() => null);
    if (perm === 'granted') {
      try {
        const file   = await handle.getFile();
        const parsed = JSON.parse(await file.text());
        if (parsed && typeof parsed.days === 'object') {
          merged = { ...parsed.days, ...merged };
        }
      } catch (e) { /* unreadable — fall back to localStorage only */ }
    }
  }
  return merged;
}

export async function openExportCSV(defaultStart, defaultEnd) {
  if (!defaultStart || !defaultEnd) {
    const ppEnd   = payPeriodEnd(today());
    const ppStart = new Date(ppEnd);
    ppStart.setDate(ppStart.getDate() - 13);
    defaultStart = ymdLocal(ppStart);
    defaultEnd   = today();
  }

  // Determine source notice
  let sourceNotice = 'Reading from working set only (no backup file linked \u2014 history limited to ~5\u00a0weeks)';
  try {
    const handle = await getBackupHandle().catch(() => null);
    if (handle) {
      const perm = await handle.queryPermission({ mode: 'readwrite' }).catch(() => null);
      if (perm === 'granted') {
        sourceNotice = 'Reading from backup archive + working set';
      }
    }
  } catch (e) { /* ignore */ }

  showModal(`<h2>Export CSV</h2>
    <div class="field">
      <label>Start date</label>
      <input type="date" id="csv-start" value="${defaultStart}">
    </div>
    <div class="field">
      <label>End date</label>
      <input type="date" id="csv-end" value="${defaultEnd}">
    </div>
    <p id="csv-source-notice" style="font-size:11px;color:var(--fg-2);margin:6px 0 10px">${esc(sourceNotice)}</p>
    <p id="csv-range-err" style="font-size:11px;color:var(--red);display:none;margin:0 0 8px">Start date must be before end date</p>
    <div class="modal-actions">
      <button class="tool-btn" onclick="closeModal()">Cancel</button>
      <button class="tool-btn primary" id="csv-export-btn" onclick="doExportCSV()">Export</button>
    </div>`);

  function validateRange() {
    const s = document.getElementById('csv-start').value;
    const e = document.getElementById('csv-end').value;
    const btn = document.getElementById('csv-export-btn');
    const err = document.getElementById('csv-range-err');
    if (!btn) return;
    const invalid = s && e && s > e;
    btn.disabled = invalid;
    if (err) err.style.display = invalid ? '' : 'none';
  }

  setTimeout(() => {
    document.getElementById('csv-start')?.addEventListener('change', validateRange);
    document.getElementById('csv-end')?.addEventListener('change', validateRange);
  }, 0);
}

export async function doExportCSV() {
  const startISO = document.getElementById('csv-start').value;
  const endISO   = document.getElementById('csv-end').value;
  if (!startISO || !endISO || startISO > endISO) return;

  const notice = document.getElementById('csv-source-notice');

  let mergedDays;
  try {
    mergedDays = await buildExportDays();
  } catch (e) {
    mergedDays = JSON.parse(JSON.stringify(state.days));
    if (notice) notice.textContent = 'Archive file unreadable \u2014 showing working set only';
  }

  const csv = buildRangeCSV(startISO, endISO, mergedDays, state.codes);
  if (!csv) {
    if (notice) {
      notice.textContent = 'No hours logged in that date range.';
      notice.style.color = 'var(--red)';
    }
    return;
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `time_tracker_${startISO}_to_${endISO}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  closeModal();
}
