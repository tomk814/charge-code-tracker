// Backup file management: IndexedDB handle storage, File System Access API read/write,
// backup status and banner UI, scheduled auto-save, and data panel visibility toggle.
// State is injected via _injectBackupState() (called from persistence._injectDeps)
// to avoid the circular persistence → backup → state → persistence chain.

let _getState = null;
export function _injectBackupState(fn) { _getState = fn; }

// ── Data panel ───────────────────────────────────────────────────────────────

let _dataBtnTimer = null;

export function revealDataButtons() {
  const el = document.getElementById('data-btns');
  if (!el) return;
  el.style.display = 'flex';
  clearTimeout(_dataBtnTimer);
  _dataBtnTimer = setTimeout(() => { el.style.display = 'none'; }, 8000);
}

// ── IndexedDB handle storage ─────────────────────────────────────────────────

let _idbPromise = null;
let _backupHandleMem = null; // in-memory fallback when IDB is unavailable
let _idbUnavailable = false;
const BACKUP_AUTOSAVE_INTERVAL_MS = 360000; // every 0.1 hr
let _backupWriteTimer = null;
let _backupWritePending = false;
let _lastBackupWriteAt = Date.now();
let _backupWriteChain = Promise.resolve();

function openIDB() {
  if (_idbPromise) return _idbPromise;
  _idbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open('cc_tracker_fs', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('fileHandles');
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => { _idbUnavailable = true; reject(e.target.error); };
    } catch(e) { _idbUnavailable = true; reject(e); }
  });
  return _idbPromise;
}

export async function getBackupHandle() {
  if (_idbUnavailable) return _backupHandleMem;
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction('fileHandles', 'readonly');
      const req = tx.objectStore('fileHandles').get('backupHandle');
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch(e) {
    _idbUnavailable = true;
    return _backupHandleMem;
  }
}

async function setBackupHandle(handle) {
  _backupHandleMem = handle;
  if (_idbUnavailable) return;
  try {
    const db = await openIDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('fileHandles', 'readwrite');
      tx.objectStore('fileHandles').put(handle, 'backupHandle');
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  } catch(e) {
    _idbUnavailable = true;
    console.warn('Backup handle stored in memory only (IndexedDB unavailable). Handle will not persist across page loads.');
  }
}

async function clearBackupHandle() {
  _backupHandleMem = null;
  if (_idbUnavailable) return;
  try {
    const db = await openIDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('fileHandles', 'readwrite');
      tx.objectStore('fileHandles').delete('backupHandle');
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  } catch(e) { _idbUnavailable = true; }
}

// ── Backup status UI ─────────────────────────────────────────────────────────

export function renderBackupStatus(perm) {
  const el      = document.getElementById('backup-status');
  const saveBtn = document.getElementById('save-backup-btn');
  if (!el) return;
  if (perm === 'granted') {
    const note = _idbUnavailable ? ' (session only)' : '';
    el.className   = 'backup-status linked';
    el.textContent = ' | backup linked' + note;
    el.style.display = 'inline';
    el.onclick = null;
  } else if (perm === 'prompt') {
    el.className   = 'backup-status permission-needed';
    el.textContent = ' | click to reconnect';
    el.style.display = 'inline';
    el.onclick = reconnectBackup;
  } else {
    el.className   = 'backup-status not-linked';
    el.textContent = '';
    el.style.display = 'none';
  }
  if (saveBtn) saveBtn.disabled = (perm !== 'granted');
}

function renderBackupBanner() {
  if (document.getElementById('backup-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'backup-banner';
  banner.innerHTML =
    'Backup file needs permission \u2014 ' +
    '<button class="tool-btn" onclick="grantBackupAccess()">Grant access</button>' +
    '<button class="tool-btn" onclick="dismissBackupBanner()">Dismiss</button>';
  const clockBar = document.getElementById('clock-bar');
  if (clockBar) clockBar.parentNode.insertBefore(banner, clockBar);
}

export async function checkBackupPermission() {
  const handle = await getBackupHandle().catch(() => null);
  if (!handle) { renderBackupStatus(null); return; }
  const perm = await handle.queryPermission({mode: 'readwrite'}).catch(() => 'denied');
  renderBackupStatus(perm);
  if (perm === 'prompt') renderBackupBanner();
}

export async function linkBackupFile() {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'time_tracker_archive.json',
      types: [{ description: 'JSON archive', accept: { 'application/json': ['.json'] } }]
    });
    await setBackupHandle(handle);
    dismissBackupBanner();
    await checkBackupPermission();
  } catch(e) {
    if (e.name !== 'AbortError') console.error('linkBackupFile:', e);
  }
}

// ── Auto-save scheduling ─────────────────────────────────────────────────────

function queueBackupWriteNow() {
  _backupWritePending = false;
  _backupWriteChain = _backupWriteChain
    .then(async () => {
      await writeToBackupFile(_getState());
      _lastBackupWriteAt = Date.now();
    })
    .catch(e => console.error('queueBackupWriteNow:', e))
    .finally(() => {
      if (_backupWritePending && !_backupWriteTimer) scheduleBackupWrite();
    });
  return _backupWriteChain;
}

export function scheduleBackupWrite() {
  _backupWritePending = true;
  if (_backupWriteTimer) return;
  const elapsed = Date.now() - _lastBackupWriteAt;
  const delay = Math.max(0, BACKUP_AUTOSAVE_INTERVAL_MS - elapsed);
  _backupWriteTimer = setTimeout(() => {
    _backupWriteTimer = null;
    if (_backupWritePending) queueBackupWriteNow();
  }, delay);
}

async function writeToBackupFile(s) {
  const handle = await getBackupHandle().catch(() => null);
  if (!handle) return;
  try {
    const perm = await handle.queryPermission({mode: 'readwrite'}).catch(() => 'denied');
    if (perm !== 'granted') { renderBackupStatus(perm); return; }

    // Read existing archive content and merge
    let archiveParsed = {};
    let archiveDays = {};
    try {
      const file = await handle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        archiveParsed = parsed;
        if (parsed.days && typeof parsed.days === 'object') archiveDays = parsed.days;
      }
    } catch (e) {
      if (e.name === 'NotFoundError') throw e; // re-throw so outer catch clears the handle
      // empty or malformed — start fresh from state only
    }

    // state.days wins for any date present in both; archive accumulates the rest
    const mergedDays = { ...archiveDays, ...s.days };
    // preserve unknown extra keys from the archive so future schema additions survive a round-trip
    const merged = {
      ...archiveParsed,
      codes: s.codes,
      days: mergedDays,
      holidays: s.holidays,
      showIncrements: s.showIncrements,
    };

    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(merged, null, 2));
    await writable.close();
  } catch(e) {
    if (e.name === 'NotFoundError') {
      await clearBackupHandle().catch(() => {});
      renderBackupStatus(null);
    } else if (e.name === 'NotAllowedError') {
      renderBackupStatus('prompt');
      renderBackupBanner();
    } else {
      console.error('writeToBackupFile:', e);
    }
  }
}

export async function saveToFileNow() {
  _backupWritePending = true;
  if (_backupWriteTimer) {
    clearTimeout(_backupWriteTimer);
    _backupWriteTimer = null;
  }
  await queueBackupWriteNow();
}

export async function grantBackupAccess() {
  const handle = await getBackupHandle().catch(() => null);
  if (!handle) return;
  try {
    const perm = await handle.requestPermission({mode: 'readwrite'});
    renderBackupStatus(perm);
    if (perm === 'granted') dismissBackupBanner();
  } catch(e) { console.error('grantBackupAccess:', e); }
}

export function dismissBackupBanner() {
  const banner = document.getElementById('backup-banner');
  if (banner) banner.remove();
}

export async function reconnectBackup() {
  const handle = await getBackupHandle().catch(() => null);
  if (!handle) return;
  try {
    const perm = await handle.requestPermission({mode: 'readwrite'});
    renderBackupStatus(perm);
    if (perm === 'granted') dismissBackupBanner();
  } catch(e) { console.error('reconnectBackup:', e); }
}
