// Wall-clock bar: session storage helpers, renderClock, Start/Stop, and sessions modal.

import { state, viewDate } from './state.js';
import { dayData, save } from './persistence.js';
import { showModal, closeModal } from './modal-infra.js';
import { esc } from './utilities.js';
import { finalizeActiveTimer } from './live-cc-tracker.js';
import { render } from './pay-period.js';

// ── Wall clock ───────────────────────────────────────────────────────────────
let _clockSessionsInitial = null;   // snapshot on modal open — used by Reset/Cancel

export function clockSessions() { return dayData(viewDate).clock.sessions; }
export function clockIsRunning() { return clockSessions().some(s => s.end === null); }

function sortClockSessions() {
  const hhmmToMins = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  clockSessions().sort((a,b) => hhmmToMins(a.start) - hhmmToMins(b.start));
}

function parseHHMM(hhmm) {
  const [h,m] = hhmm.split(':').map(Number);
  const d = new Date(); d.setHours(h,m,0,0); return d;
}

export function clockTotalHours() {
  const now = new Date();
  return clockSessions().reduce((sum,s) => {
    const end = s.end ? parseHHMM(s.end) : now;
    return sum + Math.max(0, (end - parseHHMM(s.start)) / 3600000);
  }, 0);
}

export function currentHHMM() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

function isValidHHMM(val) {
  if (!/^\d{1,2}:\d{2}$/.test(val)) return false;
  const [h,m] = val.split(':').map(Number);
  return h>=0 && h<=23 && m>=0 && m<=59;
}

function to12h(hhmm) {
  const [h,m] = hhmm.split(':').map(Number);
  const ampm = h>=12?'PM':'AM', h12 = h%12||12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

export function renderClock() {
  const running = clockIsRunning();
  const totalHrs = clockTotalHours();
  const displayHrs = (Math.floor(totalHrs*10)/10).toFixed(1);
  const active = clockSessions().find(s => s.end===null);
  const activeCC = state.activeTimer ? state.codes.find(c => c.id === state.activeTimer.ccId) : null;
  const activeCCLabel = activeCC ? ((activeCC.program||'').trim() ? `${esc(activeCC.program)} \u2014 ${esc(activeCC.name)}` : esc(activeCC.name)) : '';
  const activeCCText = activeCC ? `&nbsp;&nbsp;<span style="color:var(--green)">&#9654;&nbsp;${activeCCLabel}</span>` : '';
  const statusText = (running ? `on clock &mdash; since ${to12h(active.start)}` : 'off clock') + activeCCText;
  const bar = document.getElementById('clock-bar');
  if (!bar) return;
  const eodDone = Object.values(dayData(viewDate).notes || {}).some(n => n);
  bar.className = `clock-bar ${running?'running':'stopped'}${eodDone?' eod-done':''}`;
  bar.innerHTML =
    `<span class="clock-indicator${running?' running':''}">&#9679;</span>` +
    `<span class="clock-status-text${running?'':' stopped'}">${statusText}</span>` +
    `<span class="clock-total-display${totalHrs===0?' zero':''}">${displayHrs} hr</span>` +
    `<button class="tool-btn${running?'':' primary'}" onclick="${running?'openClockStop()':'openClockStart()'}">` +
      `${running?'Stop':'Start'}` +
    `</button>` +
    `<button class="tool-btn" onclick="openClockSessions()">Sessions</button>`;
}

export function openClockStart() {
  if (clockIsRunning()) return;
  clockSessions().push({start: currentHHMM(), end: null});
  if (state.activeTimer && !state.activeTimer.sessionStart) {
    state.activeTimer.sessionStart = Date.now();
    state.activeTimer.committedTenths = 0;
  }
  sortClockSessions(); save(state); renderClock(); render();
}

export function openClockStop() {
  const running = clockSessions().find(s => s.end===null);
  if (!running) return;
  finalizeActiveTimer();
  state.activeTimer = null;
  running.end = currentHHMM();
  sortClockSessions(); save(state); renderClock(); render();
}

export function openClockSessions() {
  _clockSessionsInitial = JSON.parse(JSON.stringify(clockSessions()));
  renderClockSessionsModal();
}

function renderClockSessionsModal() {
  const sessions = clockSessions();
  const rows = sessions.length
    ? sessions.map((s,i) => {
        const endScrollable = s.end !== null;
        const btnStartNeg = state.showIncrements
          ? `<button class="btn-inc neg" onclick="adjustClockSessionTime(${i},'start',event.shiftKey?-60:-1)" title="-1 min (Shift: -1 hr)">&minus;</button>`
          : '';
        const btnStartPos = state.showIncrements
          ? `<button class="btn-inc pos" onclick="adjustClockSessionTime(${i},'start',event.shiftKey?60:1)" title="+1 min (Shift: +1 hr)">+</button>`
          : '';
        const btnEndNeg = (state.showIncrements && endScrollable)
          ? `<button class="btn-inc neg" onclick="adjustClockSessionTime(${i},'end',event.shiftKey?-60:-1)" title="-1 min (Shift: -1 hr)">&minus;</button>`
          : '';
        const btnEndPos = (state.showIncrements && endScrollable)
          ? `<button class="btn-inc pos" onclick="adjustClockSessionTime(${i},'end',event.shiftKey?60:1)" title="+1 min (Shift: +1 hr)">+</button>`
          : '';
        const endWheelAttr = endScrollable ? `onwheel="handleTimeInputWheel(${i},'end',event)"` : '';
        return `<div class="session-row">
          ${btnStartNeg}<input class="time-input" value="${s.start}" onwheel="handleTimeInputWheel(${i},'start',event)" onchange="updateClockSession(${i},'start',this.value)" placeholder="HH:MM">${btnStartPos}
          <span style="color:var(--fg-2);font-size:11px">&rarr;</span>
          ${btnEndNeg}<input class="time-input${s.end===null?' running-end':''}" value="${s.end||''}" ${endWheelAttr} onchange="updateClockSession(${i},'end',this.value)" placeholder="${s.end===null?'running':'HH:MM'}">${btnEndPos}
          <button class="del-btn" onclick="deleteClockSession(${i})">&#10005;</button>
        </div>`;
      }).join('')
    : '<p style="font-size:12px;color:var(--fg-2);padding:6px 0">No sessions yet.</p>';
  const displayHrs = (Math.floor(clockTotalHours()*10)/10).toFixed(1);
  showModal(`<h2>Clock sessions</h2>
    <p style="font-size:10px;color:var(--fg-2);margin-bottom:8px;font-family:var(--font-mono)">24h format &mdash; HH:MM &nbsp;|&nbsp; scroll or shift+scroll to adjust &middot; leave end blank for running</p>
    <div id="clock-session-list">${rows}</div>
    <button class="tool-btn" style="margin-top:8px" onclick="addClockSession()">+ Add session</button>
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--bd-2);font-size:12px;color:var(--fg-1);font-family:var(--font-mono)">
      Total on clock: <strong style="color:var(--fg-0)">${displayHrs} hr</strong>
    </div>
    <div class="modal-actions">
      <button class="tool-btn" onclick="resetClockSession()">Reset</button>
      <button class="tool-btn" onclick="cancelClockSession()">Cancel</button>
      <button class="tool-btn primary" onclick="closeModal();renderClock()">Done</button>
    </div>`);
}

export function adjustClockSessionTime(i, field, deltaMinutes) {
  const sessions = clockSessions();
  const current = sessions[i][field];
  if (!current) return; // running end (null) — skip
  const [h, m] = current.split(':').map(Number);
  const total = ((h * 60 + m + deltaMinutes) % 1440 + 1440) % 1440;
  sessions[i][field] = `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  sortClockSessions(); save(state); renderClockSessionsModal();
}

export function handleTimeInputWheel(i, field, e) {
  e.preventDefault();
  e.stopPropagation();
  const delta = e.deltaY < 0 ? 1 : -1;
  adjustClockSessionTime(i, field, delta * (e.shiftKey ? 60 : 1));
}

export function resetClockSession() {
  dayData(viewDate).clock.sessions = JSON.parse(JSON.stringify(_clockSessionsInitial));
  save(state); renderClockSessionsModal();
}

export function cancelClockSession() {
  dayData(viewDate).clock.sessions = JSON.parse(JSON.stringify(_clockSessionsInitial));
  save(state); closeModal(); renderClock();
}

export function updateClockSession(i, field, val) {
  const sessions = clockSessions();
  const trimmed = val.trim();
  if (field==='end' && trimmed==='') { sessions[i].end = null; }
  else if (isValidHHMM(trimmed))     { sessions[i][field] = trimmed; }
  else return;
  sortClockSessions(); save(state); renderClockSessionsModal();
}

export function deleteClockSession(i) {
  clockSessions().splice(i,1);
  sortClockSessions(); save(state); renderClockSessionsModal();
}

export function addClockSession() {
  clockSessions().push({start: currentHHMM(), end: null});
  sortClockSessions(); save(state); renderClockSessionsModal();
}
