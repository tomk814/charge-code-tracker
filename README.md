# charge-code-tracker

## Component nomenclature

### Page regions
- **Header** — sticky top bar (`.header`)
- **Toolbar** — action button strip below header (`.toolbar`)
- **Card list** — vertical stack of CC cards (`#cc-list`)

### Header elements
- **App title** — "TIME TRACKER" label (`.title`)
- **Date badge** — current date display (`.date-badge`)
- **Total badge** — "Total: X.X hr" counter (`.total-badge`)

### Toolbar elements
- **Toolbar button** — any action button (`.tool-btn`)
- **Primary toolbar button** — blue-accented variant, e.g. "+ Add charge code" (`.tool-btn.primary`)

### CC card (`.cc-card`)
- **Card summary** — upper zone: CC identity + hours counter (`.cc-top`)
  - **Label stack** — stacked name + number (`.cc-label`)
    - **CC name** — description text, e.g. "Program A — design" (`.cc-name`)
    - **CC number** — charge code string, e.g. "1234-001" (`.cc-code`)
  - **Hours counter** — large numeric hours display (`.cc-hours`)
- **Card controls** — lower zone: buttons + note field (`.cc-bottom`)
  - **Increment buttons** — +0.1 / +0.5 / +1.0 (`.btn-inc`)
  - **Decrement buttons** — −0.1 / −0.5 / −1.0, red (`.btn-inc.neg`)
  - **Note field** — optional free-text input (`.note-input`)
- **History toggle** — "history (N)" clickable text (`.log-toggle`)
- **History panel** — expandable log entries (`.log-list`)
  - **Log entry** — one row: timestamp + delta + note (`.log-entry`)

### Modals
- **Modal backdrop** — dimmed full-screen overlay (`.modal-bg`)
- **Modal panel** — centered dialog (`.modal`)
- **Modal footer** — button row at bottom (`.modal-actions`)
- **Form field** — label + input pair (`.field`)

#### Named modals
- **Add CC modal** — opened by "+ Add charge code"
- **Manage modal** — opened by "Manage CCs"; each row is a **manage row** (`.cc-manage-item`) with a **remove button** (`.del-btn`)
- **Export modal** — opened by "Export / copy"; contains **export preview** (`.export-box`)
- **Reset modal** — opened by "Reset day"
