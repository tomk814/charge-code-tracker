// Main entry point: imports CSS, all JS modules, wires up globals, and bootstraps the app.

import './styles/index.css';

// ── Module imports ─────────────────────────────────────────────────────────────
import { state } from './js/state.js';
import {
  _injectDeps, save, ensurePayAdjustmentCodes,
  revealDataButtons, exportJSON, importJSON, handleJSONFile,
  linkBackupFile, saveToFileNow, grantBackupAccess, dismissBackupBanner,
  reconnectBackup, checkBackupPermission,
} from './js/persistence.js';
import { replaceState } from './js/state.js';
import { navigate, goToToday } from './js/day-navigation.js';
import {
  toggleProgramGroup, toggleIncrements, toggleCodes,
  handleIncrementClick, handleCardWheel,
} from './js/cc-rendering.js';
import { render, openPayPeriodModal } from './js/pay-period.js';
import { setActiveCC } from './js/live-cc-tracker.js';
import { showModal, closeModal } from './js/modal-infra.js';
import {
  openAddCC, parseDayforce, submitAddCC,
  toggleArchiveCC, toggleHideCC,
  moveBlock, moveCCInBlock,
  openManage, openEditCC, submitEditCC, deleteCC,
} from './js/cc-modals.js';
import {
  openEndOfDay, saveEodNote, copyEndOfDay, copyEodCSV, clearEodNotes,
  confirmReset, doReset,
  openHolidays, saveHolidays, openHelp, openAbout, openSettings,
  openExportCSV, doExportCSV,
  openColdStorage, updateColdStoragePreview, prepColdStorageConfirm, doColdStorage,
} from './js/end-of-day.js';
import {
  openSpread, refreshSpreadPreview, applySpread,
} from './js/spread-hours.js';
import {
  renderClock, openClockStart, openClockStop, openClockSessions,
  adjustClockSessionTime, handleTimeInputWheel,
  resetClockSession, cancelClockSession,
  updateClockSession, deleteClockSession, addClockSession,
} from './js/clock.js';

// Tick intervals registers its own setIntervals on import.
import './js/tick-intervals.js';

// ── Wire up persistence deps (breaks the circular import) ──────────────────
_injectDeps({
  getState: () => state,
  replaceState,
  render,
  renderClock,
  ensurePayAdjustmentCodes,
});

// Repair any Pay Adjustment codes missing from loaded state (must run after _injectDeps)
if (ensurePayAdjustmentCodes()) save(state);

// ── Expose functions to inline onclick handlers ────────────────────────────────
// (HTML templates use onclick="functionName()" which requires globals)
Object.assign(window, {
  // day navigation
  navigate, goToToday,
  // CC rendering
  toggleProgramGroup, toggleIncrements, toggleCodes,
  handleIncrementClick, handleCardWheel,
  // live CC tracker
  setActiveCC,
  // modal infra
  showModal, closeModal,
  // CC modals
  openAddCC, parseDayforce, submitAddCC,
  toggleArchiveCC, toggleHideCC,
  moveBlock, moveCCInBlock,
  openManage, openEditCC, submitEditCC, deleteCC,
  // end of day
  openEndOfDay, saveEodNote, copyEndOfDay, copyEodCSV, clearEodNotes,
  confirmReset, doReset,
  openHolidays, saveHolidays, openHelp, openAbout, openSettings,
  openExportCSV, doExportCSV,
  openColdStorage, updateColdStoragePreview, prepColdStorageConfirm, doColdStorage,
  // spread hours
  openSpread, refreshSpreadPreview, applySpread,
  // pay period
  openPayPeriodModal,
  // clock
  renderClock, openClockStart, openClockStop, openClockSessions,
  adjustClockSessionTime, handleTimeInputWheel,
  resetClockSession, cancelClockSession,
  updateClockSession, deleteClockSession, addClockSession,
  // persistence / data panel
  revealDataButtons, exportJSON, importJSON, handleJSONFile,
  linkBackupFile, saveToFileNow, grantBackupAccess, dismissBackupBanner, reconnectBackup,
});

// ── Bootstrap ──────────────────────────────────────────────────────────────────
render();
renderClock();

// Show backup UI and check permission if File System Access API is available
if ('showSaveFilePicker' in window) {
  const backupUi = document.getElementById('backup-ui');
  if (backupUi) backupUi.style.display = 'contents';
  checkBackupPermission();
}

document.addEventListener('keydown', e => { if (e.key==='Escape') closeModal(); });
