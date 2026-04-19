# Time Tracker

[![CodeQL](https://github.com/tomk814/charge-code-tracker/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/tomk814/charge-code-tracker/actions/workflows/github-code-scanning/codeql)

A lightweight, single-file HTML time tracker for engineers who charge time against multiple charge codes throughout the day, then transcribe totals into a formal system (e.g. Deltek Costpoint) at end of day.

No install. No account. No internet required. Just open the file.

---

## Setup

### For end users

1. Download the zip from the [latest release](../../releases/latest)
2. Unzip it wherever you want to keep the file — e.g. `Documents/time_tracker/`
3. Double-click `time_tracker.html` — it opens in your browser
4. Bookmark it or pin the tab so it's always one click away

That's it. Your charge codes and daily data are saved automatically in your browser.

### For developers

```bash
git clone https://github.com/tomk814/charge-code-tracker.git
cd charge-code-tracker
npm install
npm run dev      # local dev server with hot reload
npm run build    # produces dist/index.html (single self-contained file)
npm test         # run the Vitest unit test suite (run before pushing)
```

### Recommended folder layout

```
time_tracker/
├── time_tracker.html   ← open this in Chrome or Edge
└── data/
    ├── backup.json     ← link as your backup file via the data panel
    └── init.json       ← import this to reset to a blank state
```

The release zip ships with this layout pre-created. `backup.json` and `init.json` both start as a blank valid state.

---

## Daily workflow

**Morning**
- The tracker auto-advances to the current day. Yesterday's hours are preserved and browsable.
- Click **Start** on the clock bar when you sit down.

**Throughout the day**
- Scroll up/down on a charge code card to add or subtract time in 0.1 hr increments.
- Hold **Shift** while scrolling for 1.0 hr increments.
- Click **Active** on a charge code to start auto-accruing time to it as the clock runs.
- Set **Active** to a different CC when you switch tasks.
- Optionally, enable click-to-adjust increment buttons via **Show increments** (click the "last saved" link to reveal it).
- **Reset day** is also in the data panel (click the "last saved" link) — this clears all hours, sessions, and notes for the current day.

**End of day**
- Click **Stop** on the clock bar.
- If you have unallocated clock time, use **Auto-Allocate** to distribute it proportionally across your logged CCs.
- Click **End of day** → **Copy to clipboard** for a plain-text summary (use this for pasting into Costpoint or an email).
- Use **Pay period** to see a compact table of all your CCs × working days for a quick sanity check before submitting.
- Use ⚙ **Settings** → **Export CSV…** to download a date-range CSV (useful for records and performance reviews).

---

## Features

### Charge codes
- Add codes via **+ Add charge code**. You can paste a Dayforce-formatted string (`Proj:... | Program | Work Package | Activity`) directly into the import field and it will auto-parse all fields.
- Each CC has an **Activity** (the formal Dayforce name), an optional **Nickname** (a shorter display name shown everywhere in place of Activity), an optional **Work Package**, and an optional **Program**.
- Assign a **Program** to group related CCs under a shared header with a combined subtotal.
- Edit or remove codes anytime from **Manage CCs**.
- Codes persist indefinitely — you only set them up once.

### Increment buttons
- Click the **"last saved"** link at the bottom to reveal the data panel, then click **Show increments**.
- When enabled, **−** and **+** buttons appear to the left and right of the **Active** button on each CC card.
- Default click: ±0.1 hr. Hold **Shift** while clicking for ±1.0 hr.
- The setting persists across sessions.

### Clock
- The clock bar tracks wall-clock time for the day via manual sessions (Start/Stop).
- Click **Sessions** to view, edit, or manually add sessions if you forgot to start the clock.
- Sessions use 24h HH:MM format.
- The clock total feeds into **Auto-Allocate** to detect unallocated time.

### Active CC tracking
- Click **Active** on any charge code to begin auto-accruing time to it as the clock runs.
- The active CC's hours update in real time (every ~6 minutes / 0.1 hr).
- Only one CC can be active at a time. Clicking **Active** on a different CC switches tracking.
- Clicking **Active** again on the current CC deactivates tracking without stopping the clock.

### Auto-Allocate
- Compares your total clock time against your logged CC hours.
- Distributes the difference proportionally across CCs that already have hours logged.
- You can check/uncheck individual CCs to include or exclude them from the allocation.
- Shows a before/after preview before you commit.

### Day navigation
- Use the **‹ ›** arrows in the header to browse previous days.
- You can edit past days — useful for corrections.
- Data is retained for the last 35 days (5 weeks).

---

## Data safety

> [!WARNING]
> Your data lives in your browser's `localStorage`. This is a small local database managed by your browser. It is **not** a file on your hard drive, and it can be wiped by:
> - Clearing your browser's site data or browsing history
> - Browser profile resets or reinstalls
> - Opening the file from a different path or in a different browser

### Pick a workflow

There are two ways to use the tracker, depending on how much friction you're willing to accept.

#### Workflow 1 — No linked file (low ceremony)

- No file-permission prompts. Just open the file and go.
- localStorage keeps **5 weeks** of data (≈ 2 pay periods + margin). Older days are pruned automatically.
- Use **Cold storage** at the end of each pay period to export older days to CSV and prune localStorage before they auto-expire.
- Use **Export JSON** to create manual save points (full state snapshots you can import later).
- **Risk:** clearing browser data = total loss unless you have a JSON backup.

#### Workflow 2 — Linked backup file (belt-and-suspenders)

- Click **Link backup file** in the data panel to pick a JSON file on disk.
- The backup file accumulates all history and auto-saves every 6 minutes.
- Use **Cold storage** yearly — ideally at the start of performance-review season — to export the whole year's data to CSV, then prune both the archive and localStorage.
- Compile your daily notes from the CSV into a cheat sheet for your boss to go fight for your raise and much-deserved promotion.
- **Risk:** virtually none. The file on disk survives browser data wipes.

### Rules to avoid data loss

- Always open `time_tracker.html` from the **same location** on your machine. Moving the file creates a new, empty localStorage.
- Always use the **same browser**. Chrome and Edge have separate localStorage.
- Do **not** use "Clear browsing data" without first being aware that it may wipe your tracker history.
- If you get a new machine or reinstall your browser, restore from a JSON backup or linked backup file.

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Close any open modal |
| `Scroll up` on a CC card | +0.1 hr |
| `Scroll down` on a CC card | −0.1 hr |
| `Shift` + scroll | ±1.0 hr |
| `Shift` + click increment button | ±1.0 hr (overrides button's own step) |

---

## Technical notes

- Source is modular ES modules under `src/`; `npm run build` produces a single self-contained HTML file via Vite + vite-plugin-singlefile.
- The build output (`dist/index.html`) has no external dependencies, no CDN imports, works fully offline, and is suitable for `file://` use.
- localStorage key: `cc_tracker_v3`
- Data is retained for the last 35 days (5 weeks). Older days are pruned automatically.
- Migrates automatically from earlier versions (`cc_tracker_v2`).
- Tested in Chrome and Edge on Windows. Other browsers should work but are not the primary target.
