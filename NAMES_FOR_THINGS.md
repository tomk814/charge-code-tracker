# charge-code-tracker

## Features

- Charge codes (code + label + optional program group) stored in `localStorage` — survive browser close and reboot
- Charge codes can be grouped by program; each group renders as a collapsible card with a subtotal
- Per-CC mouse wheel adjustment: scroll up/down for ±0.1 hr; hold Shift for ±1.0 hr (floor at 0)
- Optional per-entry note attached to history log
- Expandable per-CC history log with timestamps and notes
- Day navigation: browse past days with `‹` / `›`; past days are read-only
- Wall-clock tracker with Start/Stop, animated running indicator, and session log
- Spread hours: distribute unallocated clock time across selected charge codes
- Export / copy: plain-text EOD summary for pasting into Deltek Costpoint
- Auto-reset at midnight (hours + log cleared; charge codes kept)
- Manual "Reset day" and add/edit/remove charge codes via modal UI

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
| **Reset day** | `confirmReset()` |

### Clock bar sub-elements

| Name | Description |
|------|-------------|
| **Clock indicator** | Animated dot (●) that pulses green when the clock is running |
| **Clock status text** | Human-readable state, e.g., "on clock — since 2:30 PM" or "off clock" |
| **Clock total display** | Large monospace number showing total clocked hours for the day |
| **Clock Start / Stop button** | Toggles the running state |
| **Sessions button** | Opens the Clock Sessions modal |

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
Card
├── Card top row          (.cc-top)
│   ├── Code label        (.cc-label)
│   │   ├── CC name       (.cc-name)   — human-readable description, e.g. "Program A — design"
│   │   └── CC code       (.cc-code)   — the number/identifier, e.g. "1234-001"
│   └── Hours display     (.cc-hours)  — current total, e.g. "3.5"
└── Card controls row     (.cc-bottom)
    ├── Scroll wheel — up/down ±0.1 hr; Shift+scroll ±1.0 hr
    └── Note field        (.note-input)        — optional free-text input
```

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
| **Export modal** | "Export / copy" toolbar button |
| **Spread Hours modal** | "Spread hours" toolbar button |
| **Reset Day modal** | "Reset day" toolbar button |
| **Clock Sessions modal** | "Sessions" button in the clock bar |
| **Clock Start modal** | "Start" button in the clock bar |
| **Clock Stop modal** | "Stop" button in the clock bar |
