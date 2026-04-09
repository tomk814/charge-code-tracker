# Time Tracker — Project Context

## What this is

A lightweight single-file HTML time tracker for a defense industry engineer who charges time against multiple charge codes (CCs) throughout the workday, then transcribes totals into a formal system (Deltek Costpoint) at end of day. The goal is a scratchpad that lives in a pinned browser tab — fast, zero friction, no login, no server.

## File structure

```
/
├── CLAUDE.md
├── NAMES_FOR_THINGS.md
├── README.md
└── time_tracker.html   ← the entire app; do not split into multiple files
```

## Constraints — read before touching anything

- **Single HTML file, always.** No build step, no bundler, no node_modules, no external dependencies. Everything — HTML, CSS, JS — lives in `time_tracker.html`.
- **No CDN imports.** The file must work fully offline and when opened via `file://` in Chrome or Edge on Windows.
- **No backend, no server.** Persistence is `localStorage` only.
- **Target environment:** local file opened in Chrome or Edge on Windows. `file://` origin has stricter localStorage scoping than `http://` — don't assume anything about origin.

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
- Export / copy: plain-text summary for EOD transcription into Costpoint (includes saved note); CSV copy outputs one row per logged CC with columns Date, Program, Work Package, Activity, Code, Nickname, Hours, Note (no header row)
- Manual "Reset day" button (clears hours and log, keeps charge codes)
- Add / edit / remove charge codes via modal UI
- Escape key closes modals

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
    { "id": "abc123", "code": "1234-001", "name": "Program A — design", "program": "Prog A", "wp": "WP-001", "nickname": "Design" }
  ],
  "days": {
    "2026-03-31": {
      "hours": { "abc123": 2.5 },
      "clock": { "sessions": [] },
      "notes": { "abc123": "optional per-CC EOD note" }
    }
  },
  "showIncrements": false
}
```

- `codes` order determines display order. Hours are not stored on the code object.
- On load, if a day entry is missing it is created with empty hours and clock. `note` is optional and may be absent or null.
- `notes` is a sparse object — only CCs with a note have an entry. Set via End of Day modal Save button; cleared by Reset day.
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

## `time_tracker.html` section map (agent navigation)

The file is annotated with greppable landmark comments so agents can navigate without loading the whole file.

### Workflow

1. **Read the TOC** at the very top of `time_tracker.html` for the full section list with approximate original line numbers.
2. **Grep for the section name** to get the exact current line: `grep -n "SECTION: JS-WALL-CLOCK" time_tracker.html`
3. **Read only the slice you need** using `offset` + `limit` on the Read tool.

### Section index

| Section name | Description |
|---|---|
| `CSS-DESIGN-TOKENS` | CSS custom properties — color palette, font vars, border/fill aliases |
| `CSS-BASE` | Global reset, html/body, `#app` layout, scrollbar |
| `CSS-HEADER` | Header bar, pay-period bar, title, date badge |
| `CSS-TOOLBAR-AND-CARDS` | Toolbar, tool-btn, data footer, CC card base |
| `CSS-PROGRAM-CARDS` | Program group cards, CC row internals, active-tracking highlight, btn-track |
| `CSS-MODALS` | Modal overlay/box, form fields, EOD note, manage items, increment buttons |
| `CSS-CLOCK-BAR` | Clock bar states, sessions modal rows, day-nav buttons, past-day banner |
| `HTML-APP-SHELL` | Static HTML skeleton (header, toolbar, clock bar, cc-list, modal root) |
| `JS-PERSISTENCE` | `localStorage` load/save, v2→v3 migration, `dayData()`, JSON export/import |
| `JS-STATE-INIT` | Global `state` and `viewDate` init; stale active-timer cleanup |
| `JS-DAY-NAVIGATION` | `navigate(delta)`, `goToToday()` |
| `JS-CC-RENDERING` | `renderCCControls`, `renderIndividualCard`, `renderProgramCard`, wheel handler |
| `JS-PAY-PERIOD-AND-RENDER` | Pay period bar calculation and main `render()` |
| `JS-LIVE-CC-TRACKER` | `setActiveCC`, `finalizeActiveTimer` — links clock sessions to a CC |
| `JS-UTILITIES` | `esc()` HTML-escape helper, `uid()` random-ID generator |
| `JS-CC-MODALS` | Add (with Dayforce paste), Edit, Manage list, Delete modals |
| `JS-END-OF-DAY` | EOD modal: hours summary, per-CC notes, plain-text copy, CSV copy, day reset |
| `JS-SPREAD-HOURS` | `computeSpread`, `openSpread`, `refreshSpreadPreview`, `applySpread` |
| `JS-MODAL-INFRA` | `showModal(html)` and `closeModal()` |
| `JS-WALL-CLOCK` | Clock session helpers, `renderClock`, Start/Stop, sessions-edit modal |
| `JS-TICK-INTERVALS` | 30 s midnight-reset tick; 1 s live-CC auto-commit tick |
| `JS-INIT` | Bootstrap `render()` + `renderClock()` calls; global Escape key listener |