// Active CC tracking: setActiveCC, finalizeActiveTimer — links clock sessions to a CC.

import { state } from './state.js';
import { save, today, dayData } from './persistence.js';
import { clockIsRunning, clockSessions, currentHHMM, renderClock } from './clock.js';
import { render } from './pay-period.js';

// ── Live CC tracker ──────────────────────────────────────────────────────────
// Resets the active session pointer; hours were already committed by the 1s tick.
export function finalizeActiveTimer() {
  if (!state.activeTimer || !state.activeTimer.sessionStart) return;
  state.activeTimer.sessionStart = null;
  state.activeTimer.committedTenths = 0;
}

export function setActiveCC(ccId) {
  if (state.activeTimer && state.activeTimer.ccId === ccId) {
    finalizeActiveTimer();
    state.activeTimer = null;
  } else {
    if (state.activeTimer) finalizeActiveTimer();
    if (!clockIsRunning()) clockSessions().push({start: currentHHMM(), end: null});
    state.activeTimer = {ccId, startedDate: today(), sessionStart: Date.now(), committedTenths: 0};
  }
  save(state);
  render();
  renderClock();
}
