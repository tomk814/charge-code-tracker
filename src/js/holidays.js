// Holiday management UI: edit and save the holiday list.

import { state } from './state.js';
import { getHolidays, save } from './persistence.js';
import { esc } from './utilities.js';
import { showModal, closeModal } from './modal-infra.js';
import { render } from './pay-period.js';

export function openHolidays() {
  const hols = getHolidays();
  // Display as M/D/YYYY for readability
  const lines = hols.map(iso => {
    const [y, m, d] = iso.split('-');
    return `${parseInt(m)}/${parseInt(d)}/${y}`;
  }).join('\n');

  const _t = document.createElement('template');
  _t.innerHTML = `<h2>Holidays</h2>
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
    </div>`;
  showModal(_t.content);
  setTimeout(() => document.getElementById('hol-textarea')?.focus(), 50);
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
