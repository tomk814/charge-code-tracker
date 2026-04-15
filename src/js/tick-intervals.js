// 30-second tick for midnight auto-advance; 1-second tick for live CC auto-commit.

import { state, viewDate, setViewDate } from './state.js';
import { dayData, save, today, ymdLocal } from './persistence.js';
import { esc } from './utilities.js';
import { showModal } from './modal-infra.js';
import { clockIsRunning, renderClock } from './clock.js';
import { finalizeActiveTimer } from './live-cc-tracker.js';
import { render, renderPayPeriod } from './pay-period.js';

// Splits a running clock session across midnight: closes at 23:59 on prevDate,
// opens at 00:00 on newDate, carries over the active CC, and shows a warning modal.
function handleMidnightRollover(prevDate, newDate) {
  const prevDay = dayData(prevDate);
  const openSession = prevDay.clock.sessions.find(s => s.end === null);

  // Close any running session at the end of the previous day
  if (openSession) openSession.end = "23:59";

  // Capture active CC id before finalizing
  const activeCCId = (state.activeTimer && state.activeTimer.ccId) || null;
  finalizeActiveTimer();
  state.activeTimer = null;

  // Carry the session and active CC into the new day
  if (openSession) {
    dayData(newDate).clock.sessions.push({start: "00:00", end: null});
    if (activeCCId) {
      state.activeTimer = {ccId: activeCCId, startedDate: newDate, sessionStart: Date.now(), committedTenths: 0};
    }
  }

  save(state);

  // Build warning modal
  const cc = activeCCId ? state.codes.find(c => c.id === activeCCId) : null;
  const ccLabel = cc
    ? ((cc.program||'').trim() ? `${esc(cc.program)} \u2014 ${esc(cc.name)}` : esc(cc.name))
    : null;
  const sessionMsg = openSession
    ? `<p style="margin:6px 0;font-size:12px">Running session closed at <strong>23:59</strong> on ${prevDate} and continued from <strong>00:00</strong> on ${newDate}.</p>`
    : `<p style="margin:6px 0;font-size:12px;color:var(--fg-2)">No running session to carry over.</p>`;
  const ccMsg = (openSession && ccLabel)
    ? `<p style="margin:6px 0;font-size:12px">Active charge code <strong>${ccLabel}</strong> continues on the new day.</p>`
    : '';
  showModal(
    `<h2>&#9200; Day rolled over at midnight</h2>
    <p style="margin:4px 0 8px;font-size:12px;color:var(--fg-2)">${prevDate} &rarr; ${newDate}</p>
    ${sessionMsg}${ccMsg}
    <div class="modal-actions">
      <button class="tool-btn primary" onclick="closeModal()">OK</button>
    </div>`
  );
}

// Refresh every 30 s; auto-advance viewDate at midnight
let _tickDate = today();
setInterval(() => {
  const t = today();
  if (t !== _tickDate) {
    const prev = _tickDate;
    handleMidnightRollover(prev, t);
    if (viewDate === prev) { setViewDate(t); render(); }
    _tickDate = t;
  }
  renderClock();
}, 30000);

// 1-second tick: auto-commit elapsed tenths and update displays
setInterval(() => {
  if (!state.activeTimer || !state.activeTimer.sessionStart || !clockIsRunning()) return;
  const {ccId, sessionStart, committedTenths = 0} = state.activeTimer;
  const elapsedTenths = Math.floor((Date.now() - sessionStart) / 360000);
  if (elapsedTenths > committedTenths) {
    const delta = (elapsedTenths - committedTenths) / 10;
    state.activeTimer.committedTenths = elapsedTenths;
    const day = dayData(today());
    day.hours[ccId] = parseFloat(((day.hours[ccId] || 0) + delta).toFixed(1));
    save(state);
    const hoursEl = document.getElementById('cc-hours-' + ccId);
    if (hoursEl) {
      hoursEl.textContent = day.hours[ccId].toFixed(1);
      hoursEl.className = `cc-hours accumulating`;
      const pgCard = hoursEl.closest('.pg-card');
      if (pgCard) {
        const pgTotalEl = pgCard.querySelector('.pg-total');
        if (pgTotalEl) {
          const cc = state.codes.find(c => c.id === ccId);
          if (cc) {
            const programName = (cc.program || '').trim();
            const programCodes = state.codes.filter(c => (c.program || '').trim() === programName);
            const pgTotal = programCodes.reduce((s, c) => s + (day.hours[c.id] || 0), 0);
            pgTotalEl.textContent = pgTotal.toFixed(1);
            pgTotalEl.className = `pg-total${pgTotal === 0 ? ' zero' : ''}`;
          }
        }
      }
    }
    renderPayPeriod();
    renderClock();
  }
}, 1000);
