// CC card rendering: renderCCControls, renderIndividualCard, renderProgramCard, wheel handler.
// Also includes getBlocks/blocksToFlat which compute the display-order block structure.

import { state, viewDate } from './state.js';
import { dayData, save, today } from './persistence.js';
import { clockIsRunning } from './clock.js';
import { esc } from './utilities.js';
import { render } from './pay-period.js';

// ── CC logic ─────────────────────────────────────────────────────────────────
export function addTime(id, delta) {
  const cc = state.codes.find(c => c.id === id);
  if (!cc) return;
  const day = dayData(viewDate);
  const prev = day.hours[id] || 0;
  day.hours[id] = Math.max(0, parseFloat((prev + delta).toFixed(1)));
  save(state);
  render();
}


export function toggleProgramGroup(name) {
  if (!state.collapsedGroups) state.collapsedGroups = {};
  if (state.collapsedGroups[name]) {
    delete state.collapsedGroups[name];
  } else {
    state.collapsedGroups[name] = true;
  }
  save(state);
  render();
}

export function toggleIncrements() {
  state.showIncrements = !state.showIncrements;
  save(state);
  const toggleBtn = document.getElementById('incr-toggle-btn');
  if (toggleBtn) toggleBtn.textContent = state.showIncrements ? 'Scroll to Increment' : 'Click to Increment';
  render();
}

export function toggleCodes() {
  state.showCodes = state.showCodes === false ? true : false;
  save(state);
  const codesBtn = document.getElementById('codes-toggle-btn');
  if (codesBtn) codesBtn.textContent = state.showCodes !== false ? 'Hide Codes' : 'Show Codes';
  render();
}

export function handleIncrementClick(id, sign, e) {
  addTime(id, sign * (e.shiftKey ? 1.0 : 0.1));
}

export function renderCCControls(cc, day) {
  const hrs = day.hours[cc.id] || 0;
  const isActive = state.activeTimer && state.activeTimer.ccId === cc.id;
  const isRunning = isActive && !!state.activeTimer.sessionStart && clockIsRunning();
  const isToday = viewDate === today();
  const trackControls = isToday
    ? `<button class="btn-track${isActive?' on':''}" onclick="setActiveCC('${cc.id}')">Active</button>`
    : '';
  const btnNeg = state.showIncrements
    ? `<button class="btn-inc neg" onclick="handleIncrementClick('${cc.id}',-1,event)" title="−0.1 hr (Shift: −1.0 hr)">&minus;</button>`
    : '';
  const btnPos = state.showIncrements
    ? `<button class="btn-inc pos" onclick="handleIncrementClick('${cc.id}',1,event)" title="+0.1 hr (Shift: +1.0 hr)">+</button>`
    : '';
  const eodDone = !!(day.notes && day.notes[cc.id]);
  const codeRow = state.showCodes !== false ? `<div class="cc-code">${esc(cc.code)}</div>` : '';
  return `<div class="cc-top">
        <div class="cc-label">
          <div class="cc-name${eodDone?' eod-done':''}">${esc(cc.nickname || cc.name)}</div>
          ${codeRow}
        </div>
        ${btnNeg}${trackControls}${btnPos}
        <div class="cc-hours${hrs===0?' zero':(isRunning?' accumulating':'')}" id="cc-hours-${cc.id}">${hrs.toFixed(1)}</div>
      </div>`;
}

export function handleCardWheel(id, e) {
  if (state.showIncrements) return;
  e.preventDefault();
  e.stopPropagation();
  const step = e.shiftKey ? 1.0 : 0.1;
  addTime(id, e.deltaY < 0 ? step : -step);
}

export function renderIndividualCard(cc, day) {
  const isTracking = state.activeTimer && state.activeTimer.ccId === cc.id;
  return `<div class="cc-card${isTracking?' active-tracking':''}" onwheel="handleCardWheel('${cc.id}',event)">${renderCCControls(cc, day)}</div>`;
}

export function renderProgramCard(programName, codes, day) {
  const pgTotal = codes.reduce((s,c) => s + (day.hours[c.id] || 0), 0);
  const isCollapsed = !!(state.collapsedGroups && state.collapsedGroups[programName]);
  const rows = codes.map(cc => {
    const isTracking = state.activeTimer && state.activeTimer.ccId === cc.id;
    return `<div class="pg-row${isTracking?' active-tracking':''}" onwheel="handleCardWheel('${cc.id}',event)">${renderCCControls(cc, day)}</div>`;
  }).join('');
  return `<div class="pg-card${isCollapsed?' collapsed':''}" data-pg="${esc(programName)}">
    <div class="pg-header" onclick="toggleProgramGroup(this.closest('.pg-card').dataset.pg)">
      <span class="pg-chevron">▼</span>
      <div class="pg-name">${esc(programName)}</div>
      <div class="pg-total ${pgTotal===0?'zero':''}">${pgTotal.toFixed(1)}</div>
    </div>
    ${rows}
  </div>`;
}

// Returns active (non-archived, non-hidden) codes as ordered blocks:
//   { type:'program', name, codes[] }  or  { type:'single', codes:[cc] }
export function getBlocks() {
  const blocks = [];
  const seen = {};
  state.codes.filter(cc => !cc.archived && !cc.hidden).forEach(cc => {
    const prog = (cc.program || '').trim();
    if (prog) {
      if (!seen[prog]) { seen[prog] = { type:'program', name:prog, codes:[] }; blocks.push(seen[prog]); }
      seen[prog].codes.push(cc);
    } else {
      blocks.push({ type:'single', codes:[cc] });
    }
  });
  return blocks;
}

export function blocksToFlat(blocks) { return blocks.flatMap(b => b.codes); }
