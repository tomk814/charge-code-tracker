# Time Tracker — Project Context

## What this is

A lightweight single-file HTML time tracker for a defense industry engineer who charges time against multiple charge codes (CCs) throughout the workday, then transcribes totals into a formal system (Deltek Costpoint) at end of day. The goal is a scratchpad that lives in a pinned browser tab — fast, zero friction, no login, no server.

## File structure

```
/
├── CLAUDE.md
└── timetracker.html   ← the entire app; do not split into multiple files
```

## Constraints — read before touching anything

- **Single HTML file, always.** No build step, no bundler, no node_modules, no external dependencies. Everything — HTML, CSS, JS — lives in `timetracker.html`.
- **No CDN imports.** The file must work fully offline and when opened via `file://` in Chrome or Edge on Windows.
- **No backend, no server.** Persistence is `localStorage` only.
- **Target environment:** local file opened in Chrome or Edge on Windows. `file://` origin has stricter localStorage scoping than `http://` — don't assume anything about origin.

## Current features

- Charge codes (code + label) persist in localStorage; survive browser close and reboot
- Per-CC increment buttons: +0.1, +0.5, +1.0 and matching negatives (−0.1, −0.5, −1.0)
- Optional note field per entry; note is attached to the log entry when an increment button is clicked
- Expandable per-CC history log with timestamps and notes
- Running grand total displayed in header
- Auto-resets daily hours and log at midnight; charge codes are never cleared on reset
- Export / copy: generates a plain-text summary of totals and notes for EOD transcription into Costpoint
- Manual "Reset day" button (clears hours and log, keeps charge codes)
- Add / remove charge codes via modal UI
- Escape key closes modals

## localStorage schema

Key: `cc_tracker_v2`

```json
{
  "date": "2026-03-31",
  "codes": [
    { "id": "abc123", "code": "1234-001", "name": "Program A — design", "hours": 2.5 }
  ],
  "log": [
    { "id": "abc123", "delta": 0.5, "result": 2.5, "note": "standup", "ts": "09:15 AM" }
  ]
}
```

- `date` is `YYYY-MM-DD`. If it doesn't match today, hours and log are cleared on load and `date` is updated.
- `codes` order determines display order.
- `log` is append-only within a day; cleared on day rollover or manual reset.
- Hours are always stored and displayed to one decimal place. Use `.toFixed(1)` everywhere — never let float drift reach the UI.

## Conventions

- Hours values: always `parseFloat(...toFixed(1))` on write, `.toFixed(1)` on display. No exceptions.
- IDs: short random strings via `Math.random().toString(36).slice(2,8)`.
- Escape user-supplied strings before inserting into innerHTML (`esc()` function).
- Modals are injected into `#modal-root` and removed on close. No `display:none` toggling.
- Clicking the modal backdrop closes the modal. Escape key also closes.
- The per-CC log is hidden by default; a "history (N)" toggle shows it.

## Component nomenclature

Use these names when referring to parts of the UI. CSS class is given in parentheses where applicable.

### Page-level regions

| Name | CSS | Description |
|---|---|---|
| **Header** | `.header` | Sticky top bar; always visible while scrolling |
| **Toolbar** | `.toolbar` | Row of action buttons directly below the header |
| **Card list** | `#cc-list` / `.cc-list` | Vertical stack of all CC cards |

### Header elements

| Name | CSS | Description |
|---|---|---|
| **App title** | `.title` | "TIME TRACKER" label on the left |
| **Date badge** | `.date-badge` | Current date ("Wed Apr 1") on the right |
| **Total badge** | `.total-badge` | "Total: X.X hr" counter on the right |

### Toolbar elements

| Name | CSS | Description |
|---|---|---|
| **Toolbar button** | `.tool-btn` | Any action button in the toolbar |
| **Primary toolbar button** | `.tool-btn.primary` | Blue-accented variant ("+ Add charge code") |

### CC card (`cc-card`)

Each charge code gets one card. The card has two internal zones:

| Name | CSS | Description |
|---|---|---|
| **Card summary** | `.cc-top` | Upper zone: CC identity and current hours |
| **Label stack** | `.cc-label` | Stacked name + number inside the card summary |
| **CC name** | `.cc-name` | Human-readable description ("Program A — design") |
| **CC number** | `.cc-code` | The charge code string ("1234-001"), monospace |
| **Hours counter** | `.cc-hours` | Large numeric hours display, right-aligned |
| **Card controls** | `.cc-bottom` | Lower zone: increment/decrement buttons + note field |
| **Increment button** | `.btn-inc` (positive) | +0.1 / +0.5 / +1.0 buttons |
| **Decrement button** | `.btn-inc.neg` (negative) | −0.1 / −0.5 / −1.0 buttons, red |
| **Note field** | `.note-input` | Optional free-text input in the controls zone |

### History section (per CC card)

| Name | CSS | Description |
|---|---|---|
| **History toggle** | `.log-toggle` | "history (N)" clickable text; shows/hides the panel |
| **History panel** | `.log-list` | Expandable list of log entries for one CC |
| **Log entry** | `.log-entry` | One row in the history panel |
| **Entry timestamp** | `.log-time` | Time of the adjustment ("09:15 AM") |
| **Entry delta** | `.log-delta` | Signed change value ("+0.5", "−0.1") |
| **Entry note** | *(last span in `.log-entry`)* | Optional note text attached to the entry |

### Modals

| Name | CSS | Description |
|---|---|---|
| **Modal backdrop** | `.modal-bg` | Full-screen dimmed overlay; click closes modal |
| **Modal panel** | `.modal` | Centered dialog container |
| **Modal title** | `.modal h2` | Uppercase heading at top of panel |
| **Modal footer** | `.modal-actions` | Button row at bottom of panel |
| **Form field** | `.field` | Label + input pair used in Add CC modal |

#### Named modals (opened by toolbar buttons)

| Name | Opened by |
|---|---|
| **Add CC modal** | "+ Add charge code" |
| **Manage modal** | "Manage CCs" — lists all CCs; each row is a **manage row** (`.cc-manage-item`) with a **remove button** (`.del-btn`) |
| **Export modal** | "Export / copy" — contains an **export preview** (`.export-box`) |
| **Reset modal** | "Reset day" |

---

## What good looks like

- Adding time to a CC is 1–2 clicks with no typing required.
- The note field is optional and never blocks an increment.
- The export output is plain text, pasteable directly into an email or the formal system.
- The whole app feels like a native browser UI, not a web app.