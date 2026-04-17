// 30-second tick for midnight auto-advance; 1-second tick for live CC auto-commit.

import { state, viewDate, setViewDate } from './state.js';
import { dayData, save, today } from './persistence.js';
import { clockIsRunning, renderClock, handleMidnightRollover } from './clock.js';
import { render, renderPayPeriod } from './pay-period.js';

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
