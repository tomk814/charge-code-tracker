# Time Tracker — Copilot Instructions

Single-file HTML time tracker (Vite + vite-plugin-singlefile). Build output is one self-contained `dist/time_tracker.html` — all CSS and JS inlined, no runtime dependencies, works offline via `file://` in Chrome/Edge on Windows.

## Stack & constraints

- **No CDN imports.** No backend. No server. Persistence is `localStorage` only (key `cc_tracker_v3`).
- **Build:** `npm run build` → `dist/time_tracker.html`. Dev: `npm run dev`.
- **Tests:** Vitest. Run `npm test` and confirm all pass before pushing.

## Source layout

```
src/
  time_tracker.html   Vite entry point
  main.js             imports all modules, wires window globals
  styles/             CSS modules (tokens, base, header, modals, clock-bar, …)
  js/                 ES modules — one file per concern (see CLAUDE.md for full index)
    persistence.js    load/save, migration, dayData(), import/export, holidays
    state.js          global state, viewDate
    cc-rendering.js   card rendering, getBlocks()
    pay-period.js     pay-period bar, main render()
    clock.js          wall-clock bar, sessions, midnight rollover
    end-of-day.js     EOD modal, notes, day reset
    settings.js       Settings / Help / About modals
    *.test.js         unit tests (one per module)
```

## Conventions

- **Hours:** always `parseFloat(x.toFixed(1))` on write; `.toFixed(1)` on display. No exceptions.
- **IDs:** `Math.random().toString(36).slice(2,8)`.
- **XSS:** escape all user strings with `esc()` before inserting into `innerHTML`.
- **Modals:** inject into `#modal-root`, remove on close. No `display:none` toggling. Backdrop click and Escape both close.
- **Pay Adjustment codes** (`pa0001`–`pa0009`) are system-managed — never delete or archive them.
- When adding/removing/renaming a UI element, update `NAMES_FOR_THINGS.md`.

## Commits & PR titles

**Always generate PR titles in the format `<type>[(<scope>)][!]: <description>`. Never use plain English titles.**

The PR title is the squash-merge commit that release-please reads — a plain-English title produces no release. Follow [Conventional Commits](https://www.conventionalcommits.org/).

| Type | Bump |
|---|---|
| `feat:` | minor |
| `fix:` / `perf:` / `revert:` | patch |
| `feat!:` or `BREAKING CHANGE:` footer | major |
| `chore:` `docs:` `style:` `refactor:` `test:` `build:` `ci:` | none |

Format: `<type>[(<scope>)][!]: <description>` — imperative mood, no trailing period, ≤72 chars.

Examples:
```
fix: correct hour rounding on wheel scroll
feat(export): add CSV column for nickname
feat!: redesign localStorage schema
```
