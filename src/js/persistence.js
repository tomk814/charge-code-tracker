// localStorage load/save, v2→v3 migration, dayData accessor, JSON export/import.
// Holiday helpers. Backup scheduling delegated to backup.js.

import { esc } from './utilities.js';
import { scheduleBackupWrite, _injectBackupState } from './backup.js';

// These are resolved lazily to avoid circular-dep issues at module evaluation time.
let _state, _replaceState, _render, _renderClock, _ensurePayAdjustmentCodes;
export function _injectDeps({ getState, replaceState, render, renderClock, ensurePayAdjustmentCodes }) {
  _state = getState;
  _replaceState = replaceState;
  _render = render;
  _renderClock = renderClock;
  _ensurePayAdjustmentCodes = ensurePayAdjustmentCodes;
  _injectBackupState(getState);
}

const STORAGE_KEY = 'cc_tracker_v3';
let lastSavedAt = null;

export const DEFAULT_SETTINGS = {
  localRetentionDays: 35,
  payPeriodAnchor: '2026-04-04',
};

export function getSetting(key) {
  const s = _state ? _state() : null;
  return s?.settings?.[key] ?? DEFAULT_SETTINGS[key];
}

// ── Persistence ─────────────────────────────────────────────────────────────
// v3 schema: { codes:[...], days:{...}, settings:{localRetentionDays, payPeriodAnchor} }
// Migrates from v2 (cc_tracker_v2) and clock v1 (cc_tracker_clock_v1) on first load.

export function ymdLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function today() { return ymdLocal(new Date()); }

function migrateFromV2() {
  try {
    const raw = localStorage.getItem('cc_tracker_v2');
    if (!raw) return null;
    const v2 = JSON.parse(raw);
    const v3 = {codes: [], days: {}};
    v3.codes = (v2.codes || []).map(({id, code, name}) => ({id, code, name}));
    if (v2.date) {
      const hours = {};
      (v2.codes || []).forEach(c => { hours[c.id] = c.hours || 0; });
      v3.days[v2.date] = {hours, clock: {sessions: []}};
      try {
        const cs = JSON.parse(localStorage.getItem('cc_tracker_clock_v1') || '{}');
        if (cs.date === v2.date && cs.sessions) v3.days[v2.date].clock = {sessions: cs.sessions};
      } catch(e) {}
    }
    return v3;
  } catch(e) { return null; }
}

// Canonical list of system-managed Pay Adjustment charge codes.
// These can never be archived or deleted by the user.
export const PREDEFINED_PA_CODES = [
  {id: 'pa0001', code: 'PTO',  name: 'Paid Time Off',         program: 'Pay Adjustment'},
  {id: 'pa0002', code: 'B',    name: 'Bereavement',           program: 'Pay Adjustment', hidden: true},
  {id: 'pa0003', code: 'JD',   name: 'Jury Duty',             program: 'Pay Adjustment', hidden: true},
  {id: 'pa0004', code: 'LWOP', name: 'Leave Without Pay',     program: 'Pay Adjustment', hidden: true},
  {id: 'pa0005', code: 'M',    name: 'Military',              program: 'Pay Adjustment', hidden: true},
  {id: 'pa0006', code: 'HOL',  name: 'Holiday',               program: 'Pay Adjustment'},
  {id: 'pa0007', code: 'P',    name: 'Parental',              program: 'Pay Adjustment', hidden: true},
  {id: 'pa0008', code: 'STD',  name: 'Short Term Disability', program: 'Pay Adjustment', hidden: true},
  {id: 'pa0009', code: 'WC',   name: "Worker's Comp",         program: 'Pay Adjustment', hidden: true},
];

export function load() {
  let data;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) data = JSON.parse(raw);
  } catch(e) {}
  if (!data) data = migrateFromV2() || {
    codes: PREDEFINED_PA_CODES.map(c => Object.assign({}, c)),
    days: {}
  };
  data.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings ?? {});
  return data;
}

export function save(s) {
  // keep configured number of days locally; older days accumulate in the backup file
  const rawRetention = s.settings?.localRetentionDays ?? DEFAULT_SETTINGS.localRetentionDays;
  const retentionDays = Number.isFinite(rawRetention) && rawRetention >= 0
    ? Math.floor(rawRetention)
    : DEFAULT_SETTINGS.localRetentionDays;
  const keys = Object.keys(s.days || {}).sort();
  while (keys.length > retentionDays) delete s.days[keys.shift()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  lastSavedAt = new Date();
  updateLastSaved();
  scheduleBackupWrite();
}

export function updateLastSaved() {
  const el = document.getElementById('last-saved-label');
  if (!el) return;
  if (!lastSavedAt) { el.textContent = 'not saved yet'; return; }
  const t = lastSavedAt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  el.textContent = `last saved ${t}`;
}

export function exportJSON() {
  const json = localStorage.getItem(STORAGE_KEY) || '{}';
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `time_tracker_backup_${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON() {
  document.getElementById('json-file-input').value = '';
  document.getElementById('json-file-input').click();
}

export function validateImport(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data))
    return 'Top-level value must be a JSON object, got ' + (Array.isArray(data) ? 'an array' : typeof data) + '.';
  if (!('codes' in data))
    return 'Missing required "codes" field — is this a charge-code tracker export?';
  if (!Array.isArray(data.codes))
    return '"codes" must be an array, got ' + typeof data.codes + '.';
  for (let i = 0; i < data.codes.length; i++) {
    const c = data.codes[i];
    if (typeof c !== 'object' || c === null) return `codes[${i}] must be an object.`;
    if (!('id' in c)) return `codes[${i}] is missing "id".`;
    if (typeof c.id !== 'string') return `codes[${i}] has invalid "id" (expected string).`;
    if (!('code' in c)) return `codes[${i}] (id: "${c.id}") is missing "code".`;
    if (typeof c.code !== 'string') return `codes[${i}] (id: "${c.id}") has invalid "code" (expected string).`;
    if (!('name' in c)) return `codes[${i}] (id: "${c.id}") is missing "name".`;
    if (typeof c.name !== 'string') return `codes[${i}] (id: "${c.id}") has invalid "name" (expected string).`;
  }
  if ('days' in data && (typeof data.days !== 'object' || data.days === null || Array.isArray(data.days)))
    return '"days" must be an object, got ' + (data.days === null ? 'null' : Array.isArray(data.days) ? 'an array' : typeof data.days) + '.';
  return null;
}

export function handleJSONFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    let parsed;
    try {
      parsed = JSON.parse(ev.target.result);
    } catch (err) {
      alert('Could not parse file as JSON:\n' + err.message);
      return;
    }
    const problem = validateImport(parsed);
    if (problem) {
      alert('Import failed — ' + problem);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      _replaceState(load());
      _ensurePayAdjustmentCodes();
      _render();
      _renderClock();
      lastSavedAt = new Date();
      updateLastSaved();
    } catch (err) {
      alert('Import failed — could not save:\n' + err.message);
    }
  };
  reader.readAsText(file);
}

export function dayData(date) {
  const state = _state();
  if (!state.days) state.days = {};
  if (!state.days[date]) state.days[date] = {hours: {}, clock: {sessions: []}};
  const d = state.days[date];
  if (!d.clock) d.clock = {sessions: []};
  return d;
}

// Inserts any PREDEFINED_PA_CODES missing from state.codes, preserving relative order.
// Returns true if any codes were added (caller should save).
export function ensurePayAdjustmentCodes() {
  const state = _state();
  let changed = false;
  PREDEFINED_PA_CODES.forEach((def, defIdx) => {
    if (state.codes.find(c => c.id === def.id)) return;
    // Find insertion point: after the nearest preceding predefined PA code present in state
    let insertAfter = -1;
    for (let di = defIdx - 1; di >= 0; di--) {
      const prev = state.codes.findIndex(c => c.id === PREDEFINED_PA_CODES[di].id);
      if (prev >= 0) { insertAfter = prev; break; }
    }
    if (insertAfter >= 0) {
      state.codes.splice(insertAfter + 1, 0, Object.assign({}, def));
    } else {
      state.codes.unshift(Object.assign({}, def));
    }
    changed = true;
  });
  return changed;
}

// Returns the current holiday list, defaulting to [].
export function getHolidays() {
  const state = _state();
  if (!Array.isArray(state.holidays)) state.holidays = [];
  return state.holidays;
}

export function isHoliday(dateStr) {
  return getHolidays().includes(dateStr);
}

// If dateStr is a holiday and hours have not yet been pre-populated, sets 8h of HOL time.
// Returns true if state was modified (caller should save).
export function applyHolidayPrePopulate(dateStr) {
  const state = _state();
  if (!isHoliday(dateStr)) return false;
  const holId = 'pa0006';
  if (!state.codes.find(c => c.id === holId && !c.archived)) return false;
  if (state.days && state.days[dateStr] && state.days[dateStr].holidayPopulated) return false;
  const day = dayData(dateStr);
  if ((day.hours[holId] || 0) === 0) day.hours[holId] = 8.0;
  day.holidayPopulated = true;
  return true;
}
