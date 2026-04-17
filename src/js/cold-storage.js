// Cold storage: prune entries ≤ cutoff from archive and localStorage; write them to CSV first.

import { state } from './state.js';
import { today, ymdLocal, save } from './persistence.js';
import { getBackupHandle } from './backup.js';
import { esc } from './utilities.js';
import { showModal } from './modal-infra.js';
import { buildRangeCSV } from './export.js';

let _coldMergedDays = null; // shared between openColdStorage and prepColdStorageConfirm

export async function openColdStorage() {
  // Merge archive days (if backup file linked) + state.days for the preview count
  _coldMergedDays = {};
  try {
    const handle = await getBackupHandle().catch(() => null);
    if (handle) {
      const perm = await handle.queryPermission({ mode: 'readwrite' }).catch(() => 'denied');
      if (perm === 'granted') {
        const file   = await handle.getFile();
        const parsed = JSON.parse(await file.text());
        if (parsed && typeof parsed.days === 'object') _coldMergedDays = { ...parsed.days };
      }
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
  // 1. Read archive (if backup file linked)
  const handle = await getBackupHandle().catch(() => null);
  let archive = null;
  if (handle) {
    try {
      const perm = await handle.queryPermission({ mode: 'readwrite' }).catch(() => 'denied');
      if (perm === 'granted') {
        const file = await handle.getFile();
        const parsed = JSON.parse(await file.text());
        if (parsed && typeof parsed.days === 'object') archive = parsed;
      }
    } catch(e) { /* unreadable — proceed with state.days only */ }
  }

  // 2. Build CSV from merged days
  const allMerged = archive ? { ...archive.days, ...state.days } : { ...state.days };
  const csv       = buildRangeCSV('0000-00-00', cutoffISO, allMerged, state.codes);
  if (!csv) {
    showModal(`<h2>Nothing to archive</h2>
      <p>No entries found before that date.</p>
      <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);
    return;
  }

  // 3. Save CSV via Save As dialog (or blob download fallback)
  try {
    if ('showSaveFilePicker' in window) {
      const csvHandle = await window.showSaveFilePicker({
        suggestedName: `time_tracker_cold_storage_through_${cutoffISO}.csv`,
        types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }]
      });
      const writable = await csvHandle.createWritable();
      await writable.write(csv);
      await writable.close();
    } else {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `time_tracker_cold_storage_through_${cutoffISO}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch(e) {
    if (e.name === 'AbortError') return; // user cancelled — no deletions
    showModal(`<h2>Error</h2>
      <p>CSV save failed. No data was deleted.</p>
      <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);
    return;
  }

  // 4–5. Prune archive and rewrite (if backup file was read)
  if (archive && handle) {
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
  const archiveNote = archive ? 'the backup and working set' : 'the working set';
  const orphanNotice = hasOrphans
    ? `<p style="font-size:12px;color:var(--yellow);margin-top:8px">Note: some entries referenced deleted charge codes and were not included in the CSV.</p>`
    : '';
  showModal(`<h2>Cold storage complete</h2>
    <p>${n} day${n===1?'':'s'} archived to CSV and removed from ${archiveNote}.</p>
    ${orphanNotice}
    <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);
}
