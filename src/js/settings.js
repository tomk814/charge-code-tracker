// Settings modal, Help modal, and About modal.

import { state } from './state.js';
import { showModal } from './modal-infra.js';

export function openHelp() {
  showModal(`<h2>Instructions</h2>
    <div class="help-section-title">Daily workflow</div>
    <ul class="help-list">
      <li>Morning: click <strong>Start</strong>, set an <strong>Active</strong> CC to accumulate time on that number too.</li>
      <li>End of day: <strong>Stop</strong> → <strong>Manually Adjust Hours</strong> or <strong>Auto-Allocate</strong> → <strong>End of day</strong> → Jot down notes for the day.</li>
    </ul>

    <div class="help-section-title">Getting started</div>
    <ul class="help-list">
      <li>Paste a Dayforce string in Add CC import — fields auto-parse.</li>
      <li><strong>Nicknames</strong> (program, activity, WP) replace long Dayforce names in the UI. The full real names are preserved and used in CSV export for grouping and sorting.</li>
      <li><strong>Sessions</strong>: view/edit/add clock sessions manually.</li>
      <li><strong>Auto-Allocate</strong>: proportionally distributes unallocated clock time across logged CCs.</li>
      <li><strong>Pay period</strong>: CC × working-day table for pre-submission checks.</li>
      <li>Active CC accrues time approximately every 6 minutes (0.1 hr) while the clock runs.</li>
    </ul>

    <div class="help-section-title">Data storage — pick a strategy</div>
    <div class="help-warning">
      <div class="help-warning-title">Data safety</div>
      <ul class="help-list" style="margin-bottom:0">
        <li>Your short term data lives in browser <code>localStorage</code> — not a file on disk. Always open from the <strong>same path</strong> in the <strong>same browser</strong>. Don't "Clear browsing data" without awareness of this risk.</li>
        <li>You can avoid this by linking a backup file, which saves a copy to disk. Due to browser security, you may be asked to re-authorize saving each session.</li>
      </ul>
    </div>
    <table class="help-table">
      <thead><tr><th></th><th>No linked file</th><th>Linked backup file</th></tr></thead>
      <tbody>
        <tr><td><strong>Ceremony</strong></td><td>Zero permission prompts</td><td>File picker + periodic permission grants</td></tr>
        <tr><td><strong>Retention</strong></td><td>5 weeks in localStorage, auto-pruned</td><td>Unlimited — backup file accumulates all history, auto-saves every 6 min</td></tr>
        <tr><td><strong>Offloading</strong></td><td>Cold storage each pay period → exports CSV, prunes localStorage</td><td>Cold storage yearly at performance season → exports CSV, prunes both</td></tr>
        <tr><td><strong>Save points</strong></td><td>Export JSON for manual snapshots — Can always replay data from Dayforce if the worst happens</td><td>Backup file <em>is</em> the save point</td></tr>
        <tr><td><strong>Risk</strong></td><td>Clearing browser data = total loss unless you have a JSON backup</td><td>File on disk survives browser wipes</td></tr>
        <tr><td><strong>Boss fight</strong></td><td>Export CSV of the pay period, compile your notes</td><td>Export CSV of the whole year, compile notes into a performance review cheat sheet</td></tr>
      </tbody>
    </table>

    <div class="help-section-title">Keyboard shortcuts</div>
    <table class="help-table">
      <thead><tr><th>Key</th><th>Action</th></tr></thead>
      <tbody>
        <tr><td>Scroll up or down on a CC card (+shift)</td><td>±0.1 hr (±1.0 hr)</td></tr>
        <tr><td>Click increment button (+shift)</td><td>±0.1 hr (±1.0 hr)</td></tr>
        <tr><td>Escape</td><td>Close modal</td></tr>
      </tbody>
    </table>

    <div class="modal-actions">
      <button class="tool-btn primary" onclick="closeModal()">Done</button>
    </div>`, 'wide');
}

export function openAbout() {
  showModal(`<h2>About</h2>
    <div style="margin-bottom:16px">
      <div style="font-size:15px;font-weight:600;color:var(--fg-0);margin-bottom:2px">Time Tracker</div>
      <div style="font-size:12px;color:var(--fg-2);font-family:var(--font-mono);margin-bottom:12px">Version ${import.meta.env.VITE_APP_VERSION ?? 'dev'}</div>
      <p style="font-size:13px;color:var(--fg-1);line-height:1.5;margin-bottom:8px">A lightweight time tracker for engineers who charge against multiple codes throughout the day. No login, no server - your data stays on your machine.</p>
      <p style="font-size:13px;color:var(--fg-1);line-height:1.5;margin-bottom:16px">Built by AI, Jockeyed by Tom Knight.</p>
      <!-- If this saves you a few minutes every day, a coffee is a great way to say thanks! -->
      <p style="font-size:13px;color:var(--fg-1);line-height:1.5">For me, this tool already paid for itself. If it saves you time too and you feel like saying thanks, buy me a <a href="https://ko-fi.com/feed_the_machine" target="_blank" rel="noopener noreferrer" style="color:var(--blue);text-decoration:none">coffee &#x2615;</a></p>
    </div>
    <details style="margin-bottom:16px">
      <summary style="cursor:pointer;font-size:12px;color:var(--fg-2);list-style:none;user-select:none">MIT License</summary>
      <pre style="margin:8px 0 0;padding:10px;background:var(--bg-1);border:1px solid var(--bd-2);border-radius:3px;white-space:pre-wrap;font-size:11px;line-height:1.6;font-family:var(--font-mono);color:var(--fg-1)">MIT License

Copyright (c) 2026 Tom Knight

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</pre>
    </details>
    <div class="modal-actions">
      <button class="tool-btn primary" onclick="closeModal()">Close</button>
    </div>`);
}

export function openSettings() {
  const hasFileApi   = 'showSaveFilePicker' in window;
  const backupLinked = !!(document.getElementById('backup-status')?.classList.contains('linked'));

  const subtitle = label =>
    `<div style="font-size:10px;font-weight:700;color:var(--fg-2);text-transform:uppercase;letter-spacing:.08em;padding:10px 0 4px">${label}</div>`;

  const row = (label, btn) =>
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid var(--bd-2)">
       <span style="font-size:13px;color:var(--fg-1)">${label}</span>${btn}
     </div>`;

  const autoBackupRows = hasFileApi
    ? `${row('Link backup file', `<button class="tool-btn" onclick="linkBackupFile()">Link file\u2026</button>`)}
       ${row('Save to file now', `<button class="tool-btn" id="save-backup-btn" onclick="saveToFileNow()"${backupLinked ? '' : ' disabled'}>Save now</button>`)}`
    : row('Backup file', `<span style="font-size:12px;color:var(--fg-2)">Requires Chrome or Edge</span>`);

  const coldStorageRow = row('Offload older days to CSV and prune from storage', `<button class="tool-btn" onclick="openColdStorage()">Cold storage\u2026</button>`);

  showModal(`<h2>Settings</h2>
    ${subtitle('UI')}
    ${row('Increment buttons', `<button class="tool-btn" id="incr-toggle-btn" onclick="toggleIncrements()">${state.showIncrements ? 'Scroll to Increment' : 'Click to Increment'}</button>`)}
    ${row('Charge codes', `<button class="tool-btn" id="codes-toggle-btn" onclick="toggleCodes()">${state.showCodes !== false ? 'Hide Codes' : 'Show Codes'}</button>`)}
    ${row('Holidays', `<button class="tool-btn" onclick="openHolidays()">Edit holidays\u2026</button>`)}
    ${subtitle('Manual Backup')}
    ${row('Export data', `<button class="tool-btn" onclick="exportJSON()">Export JSON</button>`)}
    ${row('Import data', `<button class="tool-btn" onclick="importJSON()">Import JSON</button>`)}
    ${subtitle('Auto-Backup File')}
    ${autoBackupRows}
    ${subtitle('Data Management')}
    ${row('Export date range', `<button class="tool-btn" onclick="openExportCSV()">Export CSV\u2026</button>`)}
    ${coldStorageRow}
    <div class="modal-actions">
      <button class="tool-btn" onclick="openHelp()">Help</button>
      <button class="tool-btn primary" onclick="closeModal()">Close</button>
    </div>`);
}
