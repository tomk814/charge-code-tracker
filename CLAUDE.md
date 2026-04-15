# Time Tracker — Project Context

## What this is

A lightweight single-file HTML time tracker for a defense industry engineer who charges time against multiple charge codes (CCs) throughout the workday, then transcribes totals into a formal system (Deltek Costpoint) at end of day. The goal is a scratchpad that lives in a pinned browser tab — fast, zero friction, no login, no server.

## File structure

```
/
├── .github/workflows/build.yml   ← CI: build + optional release
├── CLAUDE.md
├── NAMES_FOR_THINGS.md
├── README.md
├── package.json
├── vite.config.js
├── time_tracker.html              ← legacy monolith (kept for reference)
├── src/
│   ├── index.html                 ← Vite entry point (HTML shell)
│   ├── main.js                    ← JS entry: imports all modules, wires globals
│   ├── styles/
│   │   ├── index.css              ← barrel import for all CSS modules
│   │   ├── tokens.css             ← CSS custom properties (colors, fonts)
│   │   ├── base.css               ← global reset, body, #app layout
│   │   ├── header.css             ← header bar, pay-period bar, date badge
│   │   ├── toolbar-and-cards.css  ← toolbar, tool-btn, data footer, CC card base
│   │   ├── program-cards.css      ← program group cards, CC row internals
│   │   ├── modals.css             ← modal overlay/box, form fields, EOD note
│   │   └── clock-bar.css          ← clock bar, sessions, day-nav, past-day banner
│   └── js/
│       ├── utilities.js           ← esc(), uid()
│       ├── modal-infra.js         ← showModal(), closeModal()
│       ├── persistence.js         ← localStorage, backup file, holidays
│       ├── state.js               ← global state + viewDate init
│       ├── day-navigation.js      ← navigate(), goToToday()
│       ├── cc-rendering.js        ← card rendering, getBlocks(), wheel handler
│       ├── pay-period.js          ← pay period bar + main render()
│       ├── live-cc-tracker.js     ← setActiveCC, finalizeActiveTimer
│       ├── cc-modals.js           ← Add/Edit/Manage/Delete CC modals
│       ├── end-of-day.js          ← EOD modal, holidays, export CSV, cold storage
│       ├── spread-hours.js        ← spread-hours modal
│       ├── clock.js               ← wall-clock bar, sessions modal
│       └── tick-intervals.js      ← 30s midnight tick, 1s live-CC tick
└── dist/
    └── index.html                 ← build output (single self-contained HTML)
```

## Development

```bash
npm install          # one-time setup
npm run dev          # local dev server with hot reload
npm run build        # produces dist/index.html (single self-contained file)
npm run preview      # preview the built file locally
```

## Constraints — read before touching anything

- **Build output is a single HTML file.** `npm run build` produces `dist/index.html` with all CSS and JS inlined. No external dependencies at runtime.
- **No CDN imports.** The build output must work fully offline and when opened via `file://` in Chrome or Edge on Windows.
- **No backend, no server.** Persistence is `localStorage` only.
- **Target environment:** local file opened in Chrome or Edge on Windows. `file://` origin has stricter localStorage scoping than `http://` — don't assume anything about origin.
- **Vite + vite-plugin-singlefile** is the build toolchain. Dev dependencies only; no runtime deps.

## Current features

- Charge codes (code + activity + optional program group, work package, and nickname) persist in localStorage; survive browser close and reboot
- Charge codes can be grouped by program; grouped codes render under a shared program card (`.pg-card`) with a subtotal
- Per-CC mouse wheel adjustment: scroll up/down ±0.1 hr; Shift+scroll ±1.0 hr (floor at 0)
- Per-CC increment buttons (optional, toggled via data panel): "−" and "+" inline with the Active button; default ±0.1 hr, Shift+click ±1.0 hr
- Running grand total displayed in header
- Day navigation: browse any past day's log with `‹` / `›` buttons; past days show a banner and are read-only for increments
- Wall-clock tracker (clock bar): Start/Stop with animated running indicator, elapsed time, and session log
- Spread hours: distributes unallocated clock time across selected charge codes
- Auto-resets daily hours and log at midnight; charge codes are never cleared on reset
- End of day modal: shows hours summary with a per-CC note input (persisted to `day.notes[id]`); CC labels turn bold+blue when their note is saved; clock bar gets a blue halo when any CC has a saved note for that day; two copy buttons: plain-text summary and CSV
- Pay period modal: read-only table of all CCs × working days in the current pay period; today's column highlighted; holiday columns accented green; per-CC totals column and per-day totals row; opened via "Pay period" toolbar button (`openPayPeriodModal()`)
- Export / copy: plain-text summary for EOD transcription into Costpoint (includes saved note); CSV copy outputs one row per logged CC with columns Date, Program, Work Package, Activity, Code, Nickname, Hours, Note (no header row)
- Manual "Reset day" button (clears hours and log, keeps charge codes); on holidays, 8 h of Holiday time re-apply on the next render
- Add / edit / remove charge codes via modal UI
- Escape key closes modals
- Predefined "Pay Adjustment" charge codes (PTO, HOL — Holiday, Bereavement, Jury Duty, etc.) are system-managed: they cannot be archived or deleted; missing codes are re-injected automatically on load/import (`ensurePayAdjustmentCodes()`)
- Holiday management: editable list of holiday dates (stored in `state.holidays`); accessed via Holidays button in the hidden data footer; holiday days auto-fill 8 h of Holiday (HOL) time on first visit

## Keeping docs in sync

**When you add, remove, or rename a UI component or feature, update `NAMES_FOR_THINGS.md` to match.**

- New CSS selectors or named UI elements → add a row to the relevant table in README
- New toolbar button or modal → add to the toolbar or modals table
- New top-level feature → add to the "Current features" list above

## localStorage schema

Key: `cc_tracker_v3`

```json
{
  "codes": [
    { "id": "abc123", "code": "1234-001", "name": "Program A — design", "program": "Prog A", "wp": "WP-001", "nickname": "Design" },
    { "id": "pa0006", "code": "HOL", "name": "Holiday", "program": "Pay Adjustment" }
  ],
  "days": {
    "2026-03-31": {
      "hours": { "abc123": 2.5 },
      "clock": { "sessions": [] },
      "notes": { "abc123": "optional per-CC EOD note" }
    },
    "2026-04-17": {
      "hours": { "pa0006": 8.0 },
      "clock": { "sessions": [] },
      "holidayPopulated": true
    }
  },
  "holidays": ["2026-04-17"],
  "showIncrements": false
}
```

- `codes` order determines display order. Hours are not stored on the code object.
- On load, if a day entry is missing it is created with empty hours and clock. `note` is optional and may be absent or null.
- `notes` is a sparse object — only CCs with a note have an entry. Set via End of Day modal Save button; cleared by Reset day.
- `holidays` is an array of ISO date strings (`"YYYY-MM-DD"`). Defaults to `["2026-04-17"]` when absent. Editable via the Holidays modal.
- `holidayPopulated` (boolean on a day entry) prevents 8 h of Holiday from being re-applied on every render. Deleted by Reset day so the default re-applies on the next render.
- Hours are always stored and displayed to one decimal place. Use `.toFixed(1)` everywhere — never let float drift reach the UI.

## Conventions

- Hours values: always `parseFloat(...toFixed(1))` on write, `.toFixed(1)` on display. No exceptions.
- IDs: short random strings via `Math.random().toString(36).slice(2,8)`.
- Escape user-supplied strings before inserting into innerHTML (`esc()` function).
- Modals are injected into `#modal-root` and removed on close. No `display:none` toggling.
- Clicking the modal backdrop closes the modal. Escape key also closes.
## What good looks like

- Adding time to a CC is 1–2 clicks with no typing required.
- The export output is plain text, pasteable directly into an email or the formal system.
- The whole app feels like a native browser UI, not a web app.

## Module map (agent navigation)

The source is organized into ES modules under `src/js/`. Each file corresponds to one of the original SECTION landmarks.

### Workflow

1. Check the file structure above to find the right module.
2. Read the module directly — each is small and focused.
3. `src/main.js` is the entry point that imports everything and assigns window globals.

### Module index

| Module file | Description |
|---|---|
| `src/js/utilities.js` | `esc()` HTML-escape helper, `uid()` random-ID generator |
| `src/js/modal-infra.js` | `showModal(html)` and `closeModal()` |
| `src/js/persistence.js` | `PREDEFINED_PA_CODES` constant; `localStorage` load/save, v2→v3 migration, `dayData()`, JSON export/import; `ensurePayAdjustmentCodes()`; `getHolidays()`, `isHoliday()`, `applyHolidayPrePopulate()`; backup file (IndexedDB + File System Access API) |
| `src/js/state.js` | Global `state` and `viewDate` init; `ensurePayAdjustmentCodes()` call; stale active-timer cleanup |
| `src/js/day-navigation.js` | `navigate(delta)`, `goToToday()` |
| `src/js/cc-rendering.js` | `renderCCControls`, `renderIndividualCard`, `renderProgramCard`, wheel handler, `getBlocks()`, `blocksToFlat()` |
| `src/js/pay-period.js` | Pay period bar calculation, holiday column highlighting, `openPayPeriodModal()`, and main `render()` |
| `src/js/live-cc-tracker.js` | `setActiveCC`, `finalizeActiveTimer` — links clock sessions to a CC |
| `src/js/cc-modals.js` | `isProtectedCC()`; Add (with Dayforce paste), Edit, Manage list, Delete modals; Archive/Delete guards for Pay Adjustment CCs |
| `src/js/end-of-day.js` | EOD modal: hours summary, per-CC notes, plain-text copy, CSV copy, day reset; `openHolidays()`, `saveHolidays()`; Export CSV (date-range); Cold Storage |
| `src/js/spread-hours.js` | `computeSpread`, `openSpread`, `refreshSpreadPreview`, `applySpread` |
| `src/js/clock.js` | Clock session helpers, `renderClock`, Start/Stop, sessions-edit modal |
| `src/js/tick-intervals.js` | 30 s midnight-reset tick; 1 s live-CC auto-commit tick |

### CSS module index

| CSS file | Description |
|---|---|
| `src/styles/tokens.css` | CSS custom properties — color palette, font vars, border/fill aliases |
| `src/styles/base.css` | Global reset, html/body, `#app` layout, scrollbar |
| `src/styles/header.css` | Header bar, pay-period bar, title, date badge |
| `src/styles/toolbar-and-cards.css` | Toolbar, tool-btn, data footer, CC card base |
| `src/styles/program-cards.css` | Program group cards, CC row internals, active-tracking highlight, btn-track |
| `src/styles/modals.css` | Modal overlay/box, form fields, EOD note, manage items, increment buttons |
| `src/styles/clock-bar.css` | Clock bar states, sessions modal rows, day-nav buttons, past-day banner |