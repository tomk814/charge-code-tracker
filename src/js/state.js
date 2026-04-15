// Global state and viewDate initialisation; clears stale active timer from prior day.

import { load, ensurePayAdjustmentCodes, save, today } from './persistence.js';

export let state = load();
// Repair any Pay Adjustment codes missing from old JSON schema
if (ensurePayAdjustmentCodes()) save(state);
export let viewDate = today();

// Clear stale active timer from a previous day
if (state.activeTimer && state.activeTimer.startedDate !== today()) {
  state.activeTimer = null;
  save(state);
}

// Mutation helpers (only the exporting module can reassign ESM let bindings)
export function replaceState(newState) { state = newState; }
export function setViewDate(date) { viewDate = date; }
