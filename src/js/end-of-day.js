// End-of-day modal: hours summary, per-CC note inputs, copy/CSV export, and day reset.
// Also: openHolidays/saveHolidays, Export CSV (date-range), and Cold Storage.

import { state, viewDate } from './state.js';
import { dayData, save, today, getHolidays, isHoliday, getBackupHandle, ymdLocal } from './persistence.js';
import { esc } from './utilities.js';
import { showModal, closeModal } from './modal-infra.js';
import { render } from './pay-period.js';
import { renderClock } from './clock.js';
import { payPeriodEnd } from './pay-period.js';

export function openEndOfDay() {
  const viewDt = new Date(viewDate + 'T12:00:00');
  const dateStr = viewDt.toLocaleDateString([], {weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const day = dayData(viewDate);
  const activeCCs = state.codes.filter(c => !c.archived && (day.hours[c.id]||0) > 0);
  const total = parseFloat(state.codes.filter(c => !c.archived).reduce((s,c) => s + (day.hours[c.id]||0), 0).toFixed(1));

  if (!activeCCs.length) {
    showModal(`<h2>End of day</h2>
      <p style="font-size:13px;color:var(--fg-1);margin-bottom:14px">No hours logged for this day.</p>
      <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);
    return;
  }

  const notes = day.notes || {};
  const rows = activeCCs.map(cc => {
    const prog = (cc.program || '').trim();
    const label = prog ? `${prog}: ${cc.nickname || cc.name}` : (cc.nickname || cc.name);
    const savedNote = notes[cc.id] || '';
    return `<div style="padding:5px 0;border-bottom:1px solid var(--bd-2)">
      <div style="display:flex;align-items:baseline;gap:10px">
        <span style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--fg-0)">${esc(label)}</div>
          <div style="font-size:10px;color:var(--fg-2);font-family:var(--font-mono)">${esc(cc.code)}</div>
        </span>
        <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--fg-0);min-width:36px;text-align:right;flex-shrink:0">${(day.hours[cc.id]||0).toFixed(1)}</span>
      </div>
      <input class="eod-note" id="eod-note-${cc.id}" value="${esc(savedNote)}" placeholder="note (optional)" oninput="this.value=this.value.replace(/,/g,'')">
    </div>`;
  }).join('');

  showModal(`<h2>End of day</h2>
    <p style="font-size:11px;color:var(--fg-2);font-family:var(--font-mono);margin-bottom:12px">${dateStr}</p>
    <div style="display:flex;gap:10px;padding:2px 0 5px;font-size:10px;color:var(--fg-2);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--bd-1)">
      <span style="flex:1">Charge code</span>
      <span style="min-width:36px;text-align:right">Hours</span>
    </div>
    ${rows}
    <div style="display:flex;gap:10px;padding:6px 0 2px;font-size:12px;font-family:var(--font-mono)">
      <span style="flex:1;color:var(--fg-2)">Total</span>
      <span style="font-weight:600;color:var(--fg-0);min-width:36px;text-align:right">${total.toFixed(1)}</span>
    </div>
    <div class="modal-actions">
      <button class="tool-btn" onclick="copyEndOfDay()">Copy to clipboard</button>
      <button class="tool-btn" id="eod-csv-btn" onclick="copyEodCSV()">Copy CSV</button>
      <button class="tool-btn" onclick="saveEodNote()">Save</button>
      <button class="tool-btn" onclick="closeModal()">Cancel</button>
    </div>`);
}

function collectEodNotes() {
  const day = dayData(viewDate);
  if (!day.notes) day.notes = {};
  state.codes.forEach(cc => {
    const el = document.getElementById('eod-note-' + cc.id);
    if (!el) return;
    const note = el.value.trim();
    if (note) day.notes[cc.id] = note;
    else delete day.notes[cc.id];
  });
  save(state);
  render();
  renderClock();
}

export function saveEodNote() {
  collectEodNotes();
  closeModal();
}

export function copyEndOfDay() {
  collectEodNotes();
  const viewDt = new Date(viewDate + 'T12:00:00');
  const dateStr = viewDt.toLocaleDateString([], {weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const day = dayData(viewDate);
  const notes = day.notes || {};
  const total = parseFloat(state.codes.filter(c => !c.archived).reduce((s,c) => s + (day.hours[c.id]||0), 0).toFixed(1));
  const lines = [`Time summary — ${dateStr}`, ''];
  state.codes.filter(c => !c.archived).forEach(cc => {
    const hrs = day.hours[cc.id] || 0;
    if (!hrs) return;
    const note = (notes[cc.id] || '').trim();
    lines.push(`${cc.code}  ${cc.nickname || cc.name}`);
    lines.push(`  ${hrs.toFixed(1)} hr`);
    if (note) lines.push(`  ${note}`);
    lines.push('');
  });
  lines.push(`Total: ${total.toFixed(1)} hr`);
  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('#modal-root .primary');
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy to clipboard', 1500); }
  });
}

export function copyEodCSV() {
  const day = dayData(viewDate);
  const notes = Object.assign({}, day.notes || {});
  state.codes.forEach(cc => {
    const el = document.getElementById('eod-note-' + cc.id);
    if (el) { const v = el.value.trim(); if (v) notes[cc.id] = v; else delete notes[cc.id]; }
  });
  const csvField = v => /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v;
  const rows = [];
  state.codes.filter(c => !c.archived).forEach(cc => {
    const hrs = day.hours[cc.id] || 0;
    if (!hrs) return;
    rows.push([viewDate, cc.program||'', cc.wp||'', cc.name, cc.code, cc.nickname||'', hrs.toFixed(1), notes[cc.id]||''].map(csvField).join(','));
  });
  navigator.clipboard.writeText(rows.join('\n')).then(() => {
    const btn = document.getElementById('eod-csv-btn');
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy CSV', 1500); }
  });
}

export function clearEodNotes() {
  const day = dayData(viewDate);
  day.notes = {};
  save(state);
  render();
  renderClock();
  openEndOfDay();
}

export function confirmReset() {
  const viewDt = new Date(viewDate + 'T12:00:00');
  const label = viewDate===today() ? 'today'
    : viewDt.toLocaleDateString([], {weekday:'long',month:'short',day:'numeric'});
  showModal(`<h2>Reset day</h2>
    <p style="font-size:14px;color:var(--color-text-secondary)">This clears all hours, history, and clock sessions for ${label}. Charge codes are kept.</p>
    <p class="reset-warn">This cannot be undone.</p>
    <div class="modal-actions">
      <button class="tool-btn" onclick="closeModal()">Cancel</button>
      <button class="tool-btn" style="color:var(--color-text-danger);border-color:var(--color-border-danger)" onclick="doReset()">Reset</button>
    </div>`);
}

export function doReset() {
  const day = dayData(viewDate);
  state.codes.forEach(c => { day.hours[c.id] = 0; });
  day.clock = {sessions: []};
  day.notes = {};
  delete day.holidayPopulated;
  if (viewDate === today()) state.activeTimer = null;
  save(state);
  closeModal();
  render();
  renderClock();
}


export function openHolidays() {
  const hols = getHolidays();
  // Display as M/D/YYYY for readability
  const lines = hols.map(iso => {
    const [y, m, d] = iso.split('-');
    return `${parseInt(m)}/${parseInt(d)}/${y}`;
  }).join('\n');

  showModal(`<h2>Holidays</h2>
    <p style="font-size:12px;color:var(--fg-2);margin-bottom:10px">
      One date per line (M/D/YYYY). Holiday days auto-fill 8 hours of Holiday time.
    </p>
    <div class="field">
      <label>Holiday dates</label>
      <textarea id="hol-textarea" rows="8" style="width:100%;box-sizing:border-box;background:var(--bg-1);color:var(--fg-0);border:1px solid var(--bd-1);border-radius:4px;padding:8px;font-family:var(--font-mono);font-size:12px;resize:vertical">${esc(lines)}</textarea>
    </div>
    <div class="modal-actions">
      <button class="tool-btn" onclick="closeModal()">Cancel</button>
      <button class="tool-btn primary" onclick="saveHolidays()">Save</button>
    </div>`);
  setTimeout(() => document.getElementById('hol-textarea')?.focus(), 50);
}

export function openHelpAbout() {
  showModal(`<h2>Help / About</h2>
    <div class="help-warning">
      <div class="help-warning-title">Data safety (read first)</div>
      <ul class="help-list" style="margin-bottom:0">
        <li>Your data lives in browser <code>localStorage</code>. It is <strong>not</strong> a file on disk and can be wiped by clearing browsing data, profile resets/reinstalls, or opening this file from a different path/browser.</li>
        <li><strong>Export JSON backup regularly</strong> (minimum: end of each pay period).</li>
        <li>Always open from the <strong>same file path</strong> and the <strong>same browser</strong>.</li>
        <li>Do <strong>not</strong> use "Clear browsing data" without awareness of this risk.</li>
      </ul>
    </div>

    <div class="help-section-title">Keyboard shortcuts</div>
    <table class="help-table">
      <thead><tr><th>Key</th><th>Action</th></tr></thead>
      <tbody>
        <tr><td>Scroll up on a CC card</td><td>+0.1 hr</td></tr>
        <tr><td>Scroll down on a CC card</td><td>−0.1 hr</td></tr>
        <tr><td>Shift + scroll</td><td>±1.0 hr</td></tr>
        <tr><td>Shift + click increment button</td><td>±1.0 hr</td></tr>
        <tr><td>Escape</td><td>Close modal</td></tr>
      </tbody>
    </table>

    <div class="help-section-title">Daily workflow</div>
    <ul class="help-list">
      <li>Morning: click <strong>Start</strong>, set an <strong>Active</strong> CC when you switch tasks.</li>
      <li>End of day: <strong>Stop</strong> → <strong>Spread hours</strong> (if needed) → <strong>End of day</strong> → copy to clipboard.</li>
    </ul>

    <div class="help-section-title">Quick reference</div>
    <ul class="help-list">
      <li>Paste a Dayforce string in Add CC import - fields auto-parse.</li>
      <li><strong>Sessions</strong>: view/edit/add clock sessions manually.</li>
      <li><strong>Spread hours</strong>: proportionally distributes unallocated clock time across logged CCs.</li>
      <li><strong>Pay period</strong>: CC × working-day table for pre-submission checks.</li>
      <li>Active CC accrues time approximately every 6 minutes (0.1 hr) while the clock runs.</li>
    </ul>

    <div class="modal-actions">
      <button class="tool-btn primary" onclick="closeModal()">Done</button>
    </div>`, 'wide');
}

export function saveHolidays() {
  const raw = document.getElementById('hol-textarea').value;
  const parsed = [];
  raw.split('\n').forEach(line => {
    const s = line.trim();
    if (!s) return;
    // Accept M/D/YYYY, MM/DD/YYYY, or YYYY-MM-DD
    let iso = null;
    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const dash  = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (slash) {
      iso = `${slash[3]}-${slash[1].padStart(2,'0')}-${slash[2].padStart(2,'0')}`;
    } else if (dash) {
      iso = s;
    }
    if (iso && !parsed.includes(iso)) parsed.push(iso);
  });
  state.holidays = parsed;
  // Clear holidayPopulated flags so updated list re-applies cleanly
  Object.values(state.days || {}).forEach(d => { delete d.holidayPopulated; });
  save(state);
  closeModal();
  render();
}

// ── Export CSV (date-range) ───────────────────────────────────────────────────

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

export async function openExportCSV() {
  const ppEnd   = payPeriodEnd(today());
  const ppStart = new Date(ppEnd);
  ppStart.setDate(ppStart.getDate() - 13);
  const defaultStart = ppStart.toISOString().slice(0, 10);
  const defaultEnd   = today();

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

// ── Cold Storage ──────────────────────────────────────────────────────────────
// Prune entries ≤ cutoff from archive and localStorage; write them to CSV first.

let _coldMergedDays = null; // shared between openColdStorage and prepColdStorageConfirm

export async function openColdStorage() {
  const handle = await getBackupHandle().catch(() => null);
  if (!handle) {
    showModal(`<h2>Error</h2>
      <p>No backup file linked. Link a backup file first.</p>
      <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);
    return;
  }

  // Merge archive days + state.days for the preview count
  _coldMergedDays = {};
  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' }).catch(() => 'denied');
    if (perm === 'granted') {
      const file   = await handle.getFile();
      const parsed = JSON.parse(await file.text());
      if (parsed && typeof parsed.days === 'object') _coldMergedDays = { ...parsed.days };
    }
  } catch(e) { /* unreadable — fall back to state.days only */ }
  _coldMergedDays = { ..._coldMergedDays, ...state.days };

  // max for the date input = yesterday (cutoff must be strictly before today)
  const yest = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return ymdLocal(d);
  })();

  showModal(`<h2>Move to Cold Storage</h2>
    <div class="field">
      <label>Up to and including</label>
      <input type="date" id="cold-cutoff" max="${yest}" oninput="updateColdStoragePreview()">
    </div>
    <p id="cold-preview" style="font-size:12px;color:var(--fg-1);margin:8px 0 4px">&nbsp;</p>
    <p id="cold-err" style="font-size:12px;color:var(--red);display:none;margin:0 0 8px">Cutoff must be before today</p>
    <div class="modal-actions">
      <button class="tool-btn" onclick="closeModal()">Cancel</button>
      <button class="tool-btn primary" id="cold-proceed-btn" disabled onclick="prepColdStorageConfirm()">Proceed</button>
    </div>`);
}

export function updateColdStoragePreview() {
  const input   = document.getElementById('cold-cutoff');
  const preview = document.getElementById('cold-preview');
  const errEl   = document.getElementById('cold-err');
  const procBtn = document.getElementById('cold-proceed-btn');
  if (!input || !preview || !procBtn) return;

  const cutoff   = input.value;
  const todayStr = today();

  if (!cutoff) {
    preview.innerHTML = '&nbsp;';
    errEl.style.display = 'none';
    procBtn.disabled = true;
    return;
  }

  if (cutoff >= todayStr) {
    preview.innerHTML = '&nbsp;';
    errEl.style.display = '';
    procBtn.disabled = true;
    return;
  }

  errEl.style.display = 'none';
  const matching = Object.keys(_coldMergedDays || {}).filter(d => d <= cutoff).sort();
  if (!matching.length) {
    preview.textContent = 'No entries found before that date.';
    procBtn.disabled = true;
    return;
  }

  const n     = matching.length;
  const first = matching[0];
  const last  = matching[matching.length - 1];
  preview.textContent = `This will permanently remove ${n} day${n===1?'':'s'} of entries (${first} through ${last}) from your backup archive and local working set.`;
  procBtn.disabled = false;
}

export function prepColdStorageConfirm() {
  const input = document.getElementById('cold-cutoff');
  if (!input) return;
  const cutoff   = input.value;
  const todayStr = today();
  if (!cutoff || cutoff >= todayStr) return;

  const matching = Object.keys(_coldMergedDays || {}).filter(d => d <= cutoff).sort();
  if (!matching.length) return;

  const n          = matching.length;
  const first      = matching[0];
  const last       = matching[matching.length - 1];
  const localCount = Object.keys(state.days).filter(d => d <= cutoff).length;

  showModal(`<h2>Move to Cold Storage</h2>
    <p style="font-size:13px;color:var(--fg-1);margin-bottom:8px">The following will be permanently deleted:</p>
    <ul style="font-size:13px;color:var(--fg-0);margin:0 0 10px 18px;line-height:1.8">
      <li>${n} day entr${n===1?'y':'ies'} (${esc(first)} through ${esc(last)}) from the backup archive file</li>
      <li>${localCount} of those day${localCount===1?'':'s'} also in your local working set will be cleared</li>
    </ul>
    <p style="font-size:12px;color:var(--fg-1);margin-bottom:10px">A CSV file will be saved to your computer first. If the file dialog is cancelled, nothing will be deleted.</p>
    <p class="reset-warn">This cannot be undone.</p>
    <div class="modal-actions">
      <button class="tool-btn" onclick="closeModal()">Cancel</button>
      <button class="tool-btn" style="color:var(--red);border-color:var(--bd-red)" onclick="doColdStorage('${cutoff}')">Save CSV &amp; delete</button>
    </div>`);
}

export async function doColdStorage(cutoffISO) {
  // 1. Read archive
  const handle = await getBackupHandle().catch(() => null);
  if (!handle) {
    showModal(`<h2>Error</h2>
      <p>No backup file linked.</p>
      <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);
    return;
  }
  let archive;
  try {
    const file = await handle.getFile();
    archive = JSON.parse(await file.text());
    if (!archive || typeof archive.days !== 'object') throw new Error('bad schema');
  } catch(e) {
    showModal(`<h2>Error</h2>
      <p>Could not read backup file. Re-link it and try again.</p>
      <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);
    return;
  }

  // 2. Build CSV from merged days
  const allMerged = { ...archive.days, ...state.days };
  const csv       = buildRangeCSV('0000-00-00', cutoffISO, allMerged, state.codes);
  if (!csv) {
    showModal(`<h2>Nothing to archive</h2>
      <p>No entries found before that date.</p>
      <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);
    return;
  }

  // 3. Save CSV via Save As dialog
  try {
    const csvHandle = await window.showSaveFilePicker({
      suggestedName: `time_tracker_cold_storage_through_${cutoffISO}.csv`,
      types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }]
    });
    const writable = await csvHandle.createWritable();
    await writable.write(csv);
    await writable.close();
  } catch(e) {
    if (e.name === 'AbortError') return; // user cancelled — no deletions
    showModal(`<h2>Error</h2>
      <p>CSV save failed. No data was deleted.</p>
      <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);
    return;
  }

  // 4–5. Prune archive and rewrite
  const prunedDays = Object.fromEntries(
    Object.entries(archive.days).filter(([d]) => d > cutoffISO)
  );
  archive.days = prunedDays;
  try {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(archive, null, 2));
    await writable.close();
  } catch(e) {
    showModal(`<h2>Error</h2>
      <p>CSV was saved but the archive could not be updated. Your archive file may be in an inconsistent state — re-link it or manually remove the archived entries.</p>
      <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);
    return;
  }

  // 6–7. Prune localStorage and save
  const n = Object.keys(allMerged).filter(d => d <= cutoffISO).length;
  Object.keys(state.days).forEach(d => { if (d <= cutoffISO) delete state.days[d]; });
  save(state);

  // Check for orphaned IDs (hours referencing codes not in state.codes)
  const liveCodes = new Set(state.codes.filter(c => !c.archived).map(c => c.id));
  let hasOrphans = false;
  Object.entries(allMerged)
    .filter(([d]) => d <= cutoffISO)
    .forEach(([, dayEntry]) => {
      Object.keys(dayEntry.hours || {}).forEach(id => {
        if (!liveCodes.has(id)) hasOrphans = true;
      });
    });

  // 8. Success
  const orphanNotice = hasOrphans
    ? `<p style="font-size:12px;color:var(--yellow);margin-top:8px">Note: some entries referenced deleted charge codes and were not included in the CSV.</p>`
    : '';
  showModal(`<h2>Cold storage complete</h2>
    <p>${n} day${n===1?'':'s'} archived to CSV and removed from the backup and working set.</p>
    ${orphanNotice}
    <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);
}
