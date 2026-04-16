# time-tracker

## Features

- Charge codes (code + activity + optional program group, work package, and nickname) stored in `localStorage` — survive browser close and reboot
- Charge codes can be grouped by program; each group renders as a collapsible card with a subtotal
- Per-CC mouse wheel adjustment: scroll up/down for ±0.1 hr; hold Shift for ±1.0 hr (floor at 0)
- Optional per-entry note attached to history log
- Expandable per-CC history log with timestamps and notes
- Day navigation: browse past days with `‹` / `›`; past days are read-only
- Wall-clock tracker with Start/Stop, animated running indicator, and session log
- Auto-Allocate: distribute unallocated clock time across selected charge codes
- Export / copy: plain-text EOD summary for pasting into Deltek Costpoint; CSV copy for spreadsheet import; multi-day CSV range download via "Export CSV…" toolbar button (`openExportCSV()`), merging backup archive with localStorage for full history
- Auto-reset at midnight (hours + log cleared; charge codes kept)
- Manual "Reset day" and add/edit/remove charge codes via modal UI
- Hide charge codes: mark a CC as hidden (`cc.hidden`) so it disappears from the CC list and Auto-Allocate, but still appears in the EOD modal and Pay Period if it has logged hours; toggled via the "Hide"/"Unhide" button in Manage CCs modal
- Archive charge codes: mark a CC as archived (`cc.archived`) so it is hidden from the CC list, EOD summary, and Auto-Allocate while preserving its historical hours; toggled via the "Archive"/"Unarchive" button in Manage CCs modal
- Predefined Pay Adjustment charge codes (PTO, HOL, Bereavement, Jury Duty, etc.) are system-managed; they cannot be archived or deleted; Archive and Delete buttons are suppressed for them in the Manage CCs modal
- Holiday management: editable list of company holidays accessed via the Holidays button in the data footer; holiday days auto-fill 8 h of Holiday (HOL) time on first visit; holiday columns are accented green in the Pay Period modal
- Help / About modal: quick-reference guidance in-app (data safety warning, shortcuts, workflow, and key features), opened from the data footer panel

## UI component terminology

Use these names when describing changes to the interface.

### Page-level sections

| Name | Description | CSS selector |
|------|-------------|--------------|
| **Header** | Sticky top bar; contains the app title and date navigation | `.header` |
| **Toolbar** | Row of action buttons directly below the header | `.toolbar` |
| **Past-day banner** | Warning strip shown only when viewing a prior day | `#past-day-banner` |
| **Clock bar** | Wall-clock tracker showing running/stopped state, elapsed time, and Start/Stop controls | `#clock-bar` |
| **CC list** | Scrollable area containing all charge code cards | `#cc-list` |

### Header sub-elements

| Name | Description |
|------|-------------|
| **Date badge** | Shows the current date ("Mon, Apr 1 — today"); click the `‹` / `›` nav buttons on either side to move between days |
| **Nav buttons** | The `‹` (back) and `›` (forward) arrow buttons flanking the date badge |

### Toolbar buttons

| Name | `onclick` |
|------|-----------|
| **Add charge code** | `openAddCC()` |
| **Manage CCs** | `openManage()` |
| **Export CSV…** | `openExportCSV()` |
| **Auto-Allocate** | `openSpread()` |
| **End of day** | `openEndOfDay()` |
| **Pay period** | `openPayPeriodModal()` |

### Data footer panel

Hidden behind the **"last saved"** link. Click the link to reveal for ~4 seconds.

| Name | `onclick` | Description |
|------|-----------|-------------|
| **Show / Hide increments** | `toggleIncrements()` | Toggles +/− increment buttons on each CC card; label flips to reflect current state |
| **Show / Hide codes** | `toggleCodes()` | Toggles the `.cc-code` row on each CC card; hiding it makes cards more compact; label flips between "Hide Codes" and "Show Codes" |
| **Holidays** | `openHolidays()` | Opens the Holidays modal for viewing and editing the company holiday list |
| **Import JSON** | `importJSON()` | Restore data from a backup JSON file |
| **Export JSON** | `exportJSON()` | Download current localStorage data as JSON |
| **Link backup file** | `linkBackupFile()` | Pick a JSON file on disk to use as a persistent backup archive; requires File System Access API (hidden when API unavailable) |
| **Backup status** | — | Indicator showing backup link state: linked (green dot), needs reconnect, or not linked (`#backup-status`); hidden when API unavailable |
| **Save to file now** | `saveToFileNow()` | Immediately write current state to the linked backup file; disabled when no file is linked |
| **Cold storage…** | `openColdStorage()` | Export older days to CSV and prune from localStorage and backup archive; requires File System Access API (hidden when API unavailable) |
| **Help / About** | `openHelpAbout()` | Opens an in-app quick-reference modal with storage workflow comparison, shortcuts, workflow, and feature tips |
| **Reset day** | `confirmReset()` | Clears all hours, clock sessions, and notes for the viewed day; styled in red |

### Clock bar sub-elements

| Name | Description |
|------|-------------|
| **Clock indicator** | Animated dot (●) that pulses green when the clock is running |
| **Clock status text** | Human-readable state, e.g., "on clock — since 2:30 PM" or "off clock" |
| **Clock total display** | Large monospace number showing total clocked hours for the day |
| **Clock Start / Stop button** | Toggles the running state |
| **Sessions button** | Opens the Clock Sessions modal |

### Clock Sessions modal

Each session row shows start → end fields with optional increment buttons and a delete button.

```
Session row  (.session-row)
├── Decrement button  (.btn-inc.neg)  — "−"; optional, shown when increments are enabled; Shift+click: ±1 hr
├── Start time input  (.time-input)   — scroll up/down ±1 min; Shift+scroll ±1 hr
├── Increment button  (.btn-inc.pos)  — "+"; optional, shown when increments are enabled
├── Arrow separator   (→)
├── Decrement button  (.btn-inc.neg)  — end field only, hidden when session is still running
├── End time input    (.time-input)   — scroll up/down ±1 min; Shift+scroll ±1 hr; blank = running
├── Increment button  (.btn-inc.pos)  — end field only, hidden when session is still running
└── Delete button     (.del-btn)
```

Modal actions bar buttons:

| Name | Description |
|------|-------------|
| **Reset** | Restores all sessions to the state they were in when the modal was opened; keeps the modal open |
| **Cancel** | Restores all sessions to the state they were in when the modal was opened and closes |
| **Done** | Commits all changes and closes the modal |

### Program group card

When one or more charge codes share a **Program** label, they are rendered together inside a **program group card** (`.pg-card`).

| Name | Description | CSS selector |
|------|-------------|--------------|
| **Program group card** | Container grouping all CCs under one program | `.pg-card` |
| **Program header** | Row showing the program name and group subtotal | `.pg-header` |
| **Program name** | The program label, e.g. "Program A" | `.pg-name` |
| **Program total** | Sum of hours for all CCs in the group | `.pg-total` |
| **Program row** | One CC's controls inside the group card | `.pg-row` |

### Charge code card

Each charge code gets one **card** (`.cc-card`). A card has two rows:

```
Card top row  (.cc-top)
├── Code label        (.cc-label)
│   ├── CC name       (.cc-name)   — displays nickname if set, otherwise activity name
│   └── CC code       (.cc-code)   — the number/identifier, e.g. "1234-001"
├── Decrement button  (.btn-inc.neg)  — "−"; optional, shown when increments are enabled
├── Active button     (.btn-track)    — today only; toggles live time accrual
├── Increment button  (.btn-inc.pos)  — "+"; optional, shown when increments are enabled
└── Hours display     (.cc-hours)     — current total, e.g. "3.5"
```

Default click: ±0.1 hr. Shift+click: ±1.0 hr.

Below the two rows, when log entries exist:

| Name | Description |
|------|-------------|
| **History toggle** | `"history (N)"` link that expands/collapses the log (`.log-toggle`) |
| **History log** | The expanded list of log entries (`.log-list`) |
| **Log entry** | One line in the history log: timestamp, delta (±N.N), optional note (`.log-entry`) |

### Modals

Every modal shares this shell:

| Name | Description |
|------|-------------|
| **Modal overlay** | Full-screen dark backdrop; clicking it closes the modal (`.modal-bg`) |
| **Modal dialog** | Centered content box (`.modal`) |
| **Modal actions bar** | Bottom row of buttons, right-aligned (`.modal-actions`) |

Named modals:

| Modal name | Opened by |
|------------|-----------|
| **Add CC modal** | "Add charge code" toolbar button |
| **Manage CCs modal** | "Manage CCs" toolbar button |
| **Edit CC modal** | "Edit" button inside Manage CCs modal |
| **End of Day modal** | "End of day" toolbar button |
| **Export CSV modal** | "Export CSV…" toolbar button |
| **Auto-Allocate modal** | "Auto-Allocate" toolbar button |
| **Pay Period modal** | "Pay period" toolbar button; holiday columns accented green |
| **Holidays modal** | "Holidays" button in the data footer; editable list of holiday dates (one per line, M/D/YYYY) |
| **Help / About modal** | "Help / About" button in the data footer; includes data safety warning, shortcuts, workflow, and quick-reference tips |
| **Reset Day modal** | "Reset day" toolbar button |
| **Clock Sessions modal** | "Sessions" button in the clock bar; includes Undo and Cancel buttons |
| **Clock Start modal** | "Start" button in the clock bar |
| **Clock Stop modal** | "Stop" button in the clock bar |
