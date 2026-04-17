// End-of-day modal: hours summary, per-CC note inputs, copy to clipboard, and day reset.

import { state, viewDate } from './state.js';
import { dayData, save, today } from './persistence.js';
import { esc } from './utilities.js';
import { showModal, closeModal } from './modal-infra.js';
import { render } from './pay-period.js';
import { renderClock } from './clock.js';

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
    const progDisplay = (cc.programNickname || prog).trim();
    const label = progDisplay ? `${progDisplay}: ${cc.nickname || cc.name}` : (cc.nickname || cc.name);
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
      <button class="tool-btn" id="eod-copy-btn" onclick="copyEndOfDay()">Copy to clipboard</button>
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
    const prog = (cc.program || '').trim();
    const progDisplay = (cc.programNickname || prog).trim();
    const label = progDisplay ? `${progDisplay}: ${cc.nickname || cc.name}` : (cc.nickname || cc.name);
    const note = (notes[cc.id] || '').trim();
    lines.push(label);
    lines.push(`  ${hrs.toFixed(1)} hr`);
    if (note) lines.push(`  ${note}`);
    lines.push('');
  });
  lines.push(`Total: ${total.toFixed(1)} hr`);
  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('eod-copy-btn');
    if (btn) {
      btn.textContent = '✓ Copied!';
      btn.style.color = 'var(--color-text-success)';
      setTimeout(() => {
        btn.textContent = 'Copy to clipboard';
        btn.style.color = '';
      }, 1500);
    }
  });
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
