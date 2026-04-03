# Time Tracker — Project Context

## What this is

A lightweight single-file HTML time tracker for a defense industry engineer who charges time against multiple charge codes (CCs) throughout the workday, then transcribes totals into a formal system (Deltek Costpoint) at end of day. The goal is a scratchpad that lives in a pinned browser tab — fast, zero friction, no login, no server.

## File structure

```
/
├── CLAUDE.md
├── NAMES_FOR_THINGS.md
├── README.md
└── charge_code_tracker.html   ← the entire app; do not split into multiple files
```

## Constraints — read before touching anything

- **Single HTML file, always.** No build step, no bundler, no node_modules, no external dependencies. Everything — HTML, CSS, JS — lives in `charge_code_tracker.html`.
- **No CDN imports.** The file must work fully offline and when opened via `file://` in Chrome or Edge on Windows.
- **No backend, no server.** Persistence is `localStorage` only.
- **Target environment:** local file opened in Chrome or Edge on Windows. `file://` origin has stricter localStorage scoping than `http://` — don't assume anything about origin.

## Current features

- Charge codes (code + label + optional program group) persist in localStorage; survive browser close and reboot
- Charge codes can be grouped by program; grouped codes render under a shared program card (`.pg-card`) with a subtotal
- Per-CC mouse wheel adjustment: scroll up/down ±0.1 hr; Shift+scroll ±1.0 hr (floor at 0)
- Per-CC increment buttons (optional, toggled via data panel): +0.1, +0.5, +1.0 and matching negatives; Shift+click any button for ±1.0 hr
- Expandable per-CC history log with timestamps and notes
- Running grand total displayed in header
- Day navigation: browse any past day's log with `‹` / `›` buttons; past days show a banner and are read-only for increments
- Wall-clock tracker (clock bar): Start/Stop with animated running indicator, elapsed time, and session log
- Spread hours: distributes unallocated clock time across selected charge codes
- Auto-resets daily hours and log at midnight; charge codes are never cleared on reset
- Export / copy: generates a plain-text summary of totals and notes for EOD transcription into Costpoint
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
    { "id": "abc123", "code": "1234-001", "name": "Program A — design", "program": "Prog A" }
  ],
  "days": {
    "2026-03-31": {
      "hours": { "abc123": 2.5 },
      "clock": { "sessions": [] }
    }
  },
  "showIncrements": false
}
```

- `codes` order determines display order. Hours are not stored on the code object.
- On load, if a day entry is missing it is created with empty hours and clock.
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