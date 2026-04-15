// Spread-hours modal: proportionally distributes unallocated clock time across selected CCs.

import { state, viewDate } from './state.js';
import { dayData, save } from './persistence.js';
import { esc } from './utilities.js';
import { showModal, closeModal } from './modal-infra.js';
import { clockTotalHours } from './clock.js';
import { render } from './pay-period.js';

// ── Spread hours ─────────────────────────────────────────────────────────────
// Distributes unallocated clock time proportionally across CCs that already
// have logged hours.  Uses integer tenths throughout to avoid float drift.

export function computeSpread(activeCCs, dayHours, unallocTenths) {
  const selectedTenths = activeCCs.reduce((s,c) => s + Math.round((dayHours[c.id]||0)*10), 0);
  if (unallocTenths <= 0 || selectedTenths === 0) return null;

  // Exact proportional share for each CC (in tenths), relative to selected CCs only
  const exact = activeCCs.map(c => (Math.round((dayHours[c.id]||0)*10) / selectedTenths) * unallocTenths);

  // Floor each, then give leftover tenths to largest fractional parts
  const floors = exact.map(v => Math.floor(v));
  let remainder = unallocTenths - floors.reduce((s,v) => s+v, 0);
  exact.map((v,i) => ({i, frac: v - Math.floor(v)}))
       .sort((a,b) => b.frac - a.frac)
       .forEach(({i}) => { if (remainder-- > 0) floors[i]++; });

  return activeCCs.map((c,i) => {
    const beforeT = Math.round((dayHours[c.id]||0)*10);
    return { id: c.id, name: c.name, before: beforeT/10, add: floors[i]/10, after: (beforeT+floors[i])/10 };
  });
}

let _pendingSpread = null;
let _spreadState = null; // {candidateCCs, day, unallocTenths}

export function openSpread() {
  const day = dayData(viewDate);
  const clockHrs = parseFloat((Math.floor(clockTotalHours()*10)/10).toFixed(1));
  const loggedHrs = parseFloat(state.codes.filter(c => !c.archived && !c.hidden).reduce((s,c) => s+(day.hours[c.id]||0), 0).toFixed(1));
  const unallocHrs = parseFloat((clockHrs - loggedHrs).toFixed(1));
  const candidateCCs = state.codes.filter(c => !c.archived && !c.hidden && (day.hours[c.id]||0) > 0);

  const bail = (msg) => showModal(`<h2>Spread hours</h2>
    <p style="font-size:13px;color:var(--fg-1);margin-bottom:14px">${msg}</p>
    <div class="modal-actions"><button class="tool-btn primary" onclick="closeModal()">OK</button></div>`);

  if (clockHrs === 0)            return bail('No clock time recorded for this day.');
  if (candidateCCs.length === 0) return bail('No charge code hours to spread from — log some time first.');
  if (unallocHrs <= 0)           return bail(`No unallocated time: logged <strong>${loggedHrs.toFixed(1)} hr</strong> already meets or exceeds clock time <strong>${clockHrs.toFixed(1)} hr</strong>.`);

  _spreadState = {candidateCCs, day, unallocTenths: Math.round(unallocHrs * 10)};

  const rows = candidateCCs.map(cc => {
    const prog = (cc.program || '').trim();
    const label = prog ? `${prog}: ${cc.nickname || cc.name}` : (cc.nickname || cc.name);
    const checked = !cc.spreadExcluded;
    return `<div style="display:flex;align-items:baseline;gap:10px;padding:5px 0;border-bottom:1px solid var(--bd-2)">
      <input type="checkbox" id="sc-${cc.id}" ${checked?'checked':''} onchange="refreshSpreadPreview()" style="cursor:pointer;accent-color:var(--blue);flex-shrink:0;margin:0">
      <span style="flex:1;font-size:12px;color:var(--fg-0)">${esc(label)}</span>
      <span style="font-family:var(--font-mono);font-size:12px;color:var(--fg-2);min-width:32px;text-align:right">${(day.hours[cc.id]||0).toFixed(1)}</span>
      <span style="font-family:var(--font-mono);font-size:12px;color:var(--blue);min-width:36px;text-align:right" id="sp-add-${cc.id}"></span>
      <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;min-width:36px;text-align:right" id="sp-after-${cc.id}"></span>
    </div>`;
  }).join('');

  showModal(`<h2>Spread hours</h2>
    <div style="display:flex;gap:16px;font-size:12px;color:var(--fg-1);font-family:var(--font-mono);margin-bottom:12px">
      <span>Clock&nbsp;<strong style="color:var(--fg-0)">${clockHrs.toFixed(1)} hr</strong></span>
      <span>Logged&nbsp;<strong style="color:var(--fg-0)">${loggedHrs.toFixed(1)} hr</strong></span>
      <span>Unallocated&nbsp;<strong style="color:var(--blue)">${unallocHrs.toFixed(1)} hr</strong></span>
    </div>
    <div style="display:flex;gap:10px;padding:2px 0 5px;font-size:10px;color:var(--fg-2);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--bd-1)">
      <span style="width:13px;flex-shrink:0"></span>
      <span style="flex:1">Charge code</span>
      <span style="min-width:32px;text-align:right">Before</span>
      <span style="min-width:36px;text-align:right">Add</span>
      <span style="min-width:36px;text-align:right">After</span>
    </div>
    ${rows}
    <div style="display:flex;gap:10px;padding:6px 0 0;font-size:12px;font-family:var(--font-mono)">
      <span style="width:13px;flex-shrink:0"></span>
      <span style="flex:1;color:var(--fg-2)">New total</span>
      <span style="min-width:32px"></span><span style="min-width:36px"></span>
      <span style="font-weight:600;color:var(--fg-0);min-width:36px;text-align:right" id="sp-new-total"></span>
    </div>
    <div class="modal-actions">
      <button class="tool-btn" onclick="closeModal()">Cancel</button>
      <button class="tool-btn primary" id="sp-apply-btn" onclick="applySpread()">Apply</button>
    </div>`);

  refreshSpreadPreview();
}

export function refreshSpreadPreview() {
  if (!_spreadState) return;
  const {candidateCCs, day, unallocTenths} = _spreadState;

  const selected = candidateCCs.filter(cc => {
    const el = document.getElementById('sc-' + cc.id);
    return el && el.checked;
  });

  candidateCCs.forEach(cc => {
    const el = document.getElementById('sc-' + cc.id);
    if (el) cc.spreadExcluded = !el.checked;
  });
  save(state);

  _pendingSpread = selected.length > 0 ? computeSpread(selected, day.hours, unallocTenths) : null;

  candidateCCs.forEach(cc => {
    const addEl   = document.getElementById('sp-add-'   + cc.id);
    const afterEl = document.getElementById('sp-after-' + cc.id);
    if (addEl)   addEl.textContent = '';
    if (afterEl) { afterEl.textContent = (day.hours[cc.id]||0).toFixed(1); afterEl.style.color = 'var(--fg-2)'; }
  });

  if (_pendingSpread) {
    _pendingSpread.forEach(s => {
      const addEl   = document.getElementById('sp-add-'   + s.id);
      const afterEl = document.getElementById('sp-after-' + s.id);
      if (addEl)   addEl.textContent = '+' + s.add.toFixed(1);
      if (afterEl) { afterEl.textContent = s.after.toFixed(1); afterEl.style.color = 'var(--green)'; }
    });
  }

  const totalEl  = document.getElementById('sp-new-total');
  const applyBtn = document.getElementById('sp-apply-btn');
  if (_pendingSpread) {
    const spreadById = Object.fromEntries(_pendingSpread.map(s => [s.id, s.after]));
    const newTotal = state.codes.reduce((s,c) => s + (spreadById[c.id] ?? (day.hours[c.id]||0)), 0);
    if (totalEl)  totalEl.textContent = newTotal.toFixed(1);
    if (applyBtn) applyBtn.disabled = false;
  } else {
    if (totalEl)  totalEl.textContent = '—';
    if (applyBtn) applyBtn.disabled = true;
  }
}

export function applySpread() {
  if (!_pendingSpread) return;
  const day = dayData(viewDate);
  _pendingSpread.forEach(s => { day.hours[s.id] = s.after; });
  _pendingSpread = null;
  save(state);
  closeModal();
  render();
}
