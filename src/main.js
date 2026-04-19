// Main entry point: imports CSS, all JS modules, wires up globals, and bootstraps the app.

import './styles/index.css';

// ── Module imports ─────────────────────────────────────────────────────────────
import { state } from './js/state.js';
import {
  _injectDeps, save, ensurePayAdjustmentCodes,
  exportJSON, importJSON, handleJSONFile,
} from './js/persistence.js';
import {
  revealDataButtons, linkBackupFile, saveToFileNow, grantBackupAccess,
  dismissBackupBanner, reconnectBackup, checkBackupPermission,
} from './js/backup.js';
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
  openManage, openEditCC, submitEditCC, deleteCC, confirmDeleteCC,
} from './js/cc-modals.js';
import { openEndOfDay, saveEodNote, copyEndOfDay, confirmReset, doReset } from './js/end-of-day.js';
import { openSettings, openHelp, openAbout, toggleUpdateCheck, toggleSkipPatch, toggleSkipMinor } from './js/settings.js';
import { checkForUpdates, dismissUpdateBanner, selfUpdate, initVersionFooter } from './js/version-check.js';
import { openHolidays, saveHolidays } from './js/holidays.js';
import { openExportCSV, doExportCSV } from './js/export.js';
import { openColdStorage, updateColdStoragePreview, prepColdStorageConfirm, doColdStorage } from './js/cold-storage.js';
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
  openManage, openEditCC, submitEditCC, deleteCC, confirmDeleteCC,
  // end of day
  openEndOfDay, saveEodNote, copyEndOfDay, confirmReset, doReset,
  // settings / help / about
  openSettings, openHelp, openAbout,
  toggleUpdateCheck, toggleSkipPatch, toggleSkipMinor,
  dismissUpdateBanner, selfUpdate,
  // holidays
  openHolidays, saveHolidays,
  // export
  openExportCSV, doExportCSV,
  // cold storage
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
initVersionFooter();
checkForUpdates();

// Check backup file permission if File System Access API is available
if ('showSaveFilePicker' in window) {
  checkBackupPermission();
}

document.addEventListener('keydown', e => { if (e.key==='Escape') closeModal(); });
