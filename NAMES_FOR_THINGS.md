# time-tracker

## Features

- Charge codes (code + activity + optional program group, work package, and nickname) stored in `localStorage` — survive browser close and reboot
- Charge codes can be grouped by program; each group renders as a collapsible card with a subtotal
- Per-CC mouse wheel adjustment: scroll up/down for ±0.1 hr; hold Shift for ±1.0 hr (floor at 0)
- Optional per-entry note attached to history log
- Expandable per-CC history log with timestamps and notes
- Day navigation: browse past days with `‹` / `›`; past days are read-only
- Wall-clock tracker with Start/Stop, animated running indicator, and session log
- Spread hours: distribute unallocated clock time across selected charge codes
- Export / copy: plain-text EOD summary for pasting into Deltek Costpoint; CSV copy for spreadsheet import
- Auto-reset at midnight (hours + log cleared; charge codes kept)
- Manual "Reset day" and add/edit/remove charge codes via modal UI
- Archive charge codes: mark a CC as archived so it is hidden from the CC list and EOD summary while preserving its historical hours

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
| **Export / copy** | `openExport()` |
| **Spread hours** | `openSpread()` |
| **End of day** | `openEndOfDay()` |
| **Pay period** | `openPayPeriodModal()` |

### Data footer panel

Hidden behind the **"last saved"** link. Click the link to reveal for ~4 seconds.

| Name | `onclick` | Description |
|------|-----------|-------------|
| **Show / Hide increments** | `toggleIncrements()` | Toggles +/− increment buttons on each CC card; label flips to reflect current state |
| **Show / Hide codes** | `toggleCodes()` | Toggles the `.cc-code` row on each CC card; hiding it makes cards more compact; label flips between "Hide Codes" and "Show Codes" |
| **Import JSON** | `importJSON()` | Restore data from a backup JSON file |
| **Export JSON** | `exportJSON()` | Download current localStorage data as JSON |
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
| **Edit CC modal** | "Edit" button inside Manage CCs modal; includes "Archive this charge code" checkbox |
| **End of Day modal** | "End of day" toolbar button |
| **Export modal** | "Export / copy" toolbar button |
| **Spread Hours modal** | "Spread hours" toolbar button |
| **Pay Period modal** | "Pay period" toolbar button |
| **Reset Day modal** | "Reset day" toolbar button |
| **Clock Sessions modal** | "Sessions" button in the clock bar; includes Undo and Cancel buttons |
| **Clock Start modal** | "Start" button in the clock bar |
| **Clock Stop modal** | "Stop" button in the clock bar |
