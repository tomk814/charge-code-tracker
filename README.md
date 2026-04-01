# charge-code-tracker

## Component nomenclature

### Page regions (top to bottom)
- **Header** — sticky top bar (`.header`)
- **Toolbar** — action button strip below header (`.toolbar`)
- **Past-day banner** — blue info bar shown when viewing a past day (`#past-day-banner` / `.past-day-banner`)
- **Clock bar** — wall-clock status strip (`#clock-bar` / `.clock-bar`); has `.running` / `.stopped` state variants
- **Card list** — vertical stack of CC cards (`#cc-list` / `.cc-list`)

### Header elements
- **App title** — "TIME TRACKER" label (`.title`)
- **Prev-day button** — "‹" chevron to go back one day (`.nav-btn`, first one)
- **Date badge** — current view date (`#date-badge` / `.date-badge`)
- **Next-day button** — "›" chevron to go forward one day (`#nav-fwd` / `.nav-btn`, second one); disabled on today
- **Total badge** — "Total: X.X hr" hours counter (`.total-badge`)

### Toolbar elements
- **Toolbar button** — any action button (`.tool-btn`)
- **Primary toolbar button** — blue-accented variant (`.tool-btn.primary`), e.g. "+ Add charge code"

Toolbar buttons in order: **+ Add charge code**, **Manage CCs**, **Export / copy**, **Spread hours**, **Reset day**

### Clock bar elements
- **Clock indicator** — pulsing dot, green when running / red when stopped (`.clock-indicator`)
- **Clock status text** — "on clock — since 9:15 AM" or "off clock" (`.clock-status-text`)
- **Clock total display** — hours accumulated on the clock today (`.clock-total-display`)
- **Start/Stop button** — toggles clock state (`.tool-btn` / `.tool-btn.primary`); labeled "Start" or "Stop"
- **Sessions button** — opens the Clock sessions modal (`.tool-btn`)

### CC card (`.cc-card`)
- **Card summary** — upper zone: CC identity + hours counter (`.cc-top`)
  - **Label stack** — stacked name + number (`.cc-label`)
    - **CC name** — description text, e.g. "Program A — design" (`.cc-name`)
    - **CC number** — charge code string, e.g. "1234-001" (`.cc-code`)
  - **Hours counter** — large numeric hours display (`.cc-hours`); `.zero` variant when 0.0
- **Card controls** — lower zone: buttons + note field (`.cc-bottom`)
  - **Increment buttons** — +0.1 / +0.5 / +1.0 (`.btn-inc`)
  - **Decrement buttons** — −0.1 / −0.5 / −1.0, red (`.btn-inc.neg`)
  - **Note field** — optional free-text input (`.note-input`)
- **History toggle** — "history (N)" clickable text (`.log-toggle`)
- **History panel** — expandable log entries (`.log-list`)
  - **Log entry** — one row: timestamp + delta + note (`.log-entry`)
    - **Entry timestamp** (`.log-time`)
    - **Entry delta** — signed change value, green or red (`.log-delta.pos` / `.log-delta.neg`)
    - **Entry note** — plain text, last `<span>` in the entry

### Modals
- **Modal backdrop** — dimmed full-screen overlay (`.modal-bg`)
- **Modal panel** — centered dialog (`.modal`)
- **Modal footer** — button row at bottom (`.modal-actions`)
- **Form field** — label + input pair (`.field`)

#### Named modals
| Modal | Opened by | Notable contents |
|---|---|---|
| **Add CC modal** | "+ Add charge code" toolbar button | Two form fields (code, label) |
| **Manage modal** | "Manage CCs" toolbar button | **Manage rows** (`.cc-manage-item`) each with a **remove button** (`.del-btn`) |
| **Export modal** | "Export / copy" toolbar button | **Export preview** (`.export-box`) monospace text block |
| **Spread hours modal** | "Spread hours" toolbar button | Summary strip (clock / logged / unallocated); preview table with Before / Add / After columns; Apply button |
| **Reset modal** | "Reset day" toolbar button | Warning text; Reset confirm button |
| **Clock sessions modal** | "Sessions" button in clock bar | List of **session rows** (`.session-row`), each with two **time inputs** (`.time-input`) and a **delete button** (`.del-btn`); "+ Add session" button; total display |
