# Time Tracker

A lightweight, single-file HTML time tracker for engineers who charge time against multiple charge codes throughout the day, then transcribe totals into a formal system (e.g. Deltek Costpoint) at end of day.

No install. No account. No internet required. Just open the file.

---

## Setup

1. Download `time_tracker.html`
2. Create a folder for it somewhere convenient, e.g. `Documents/time_tracker/`
3. Double-click the file — it opens in your browser
4. Optionally, pin the tab so it persists across browser sessions

That's it. Your charge codes and daily data are saved automatically in your browser.

### Recommended folder layout

```
time_tracker/
├── time_tracker.html
└── backups/          ← keep your JSON backups here (see Data Safety below)
```

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

**End of day**
- Click **Stop** on the clock bar.
- If you have unallocated clock time, use **Spread hours** to distribute it proportionally across your logged CCs.
- Click **Export / copy** to get a plain-text summary.

---

## Features

### Charge codes
- Add codes via **+ Add charge code**. You can paste a Dayforce-formatted string directly into the import field and it will auto-parse the code, program, and label.
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
- The clock total feeds into **Spread hours** to detect unallocated time.

### Active CC tracking
- Click **Active** on any charge code to begin auto-accruing time to it as the clock runs.
- The active CC's hours update in real time (every ~6 minutes / 0.1 hr).
- Only one CC can be active at a time. Clicking **Active** on a different CC switches tracking.
- Clicking **Active** again on the current CC deactivates tracking without stopping the clock.

### Spread hours
- Compares your total clock time against your logged CC hours.
- Distributes the difference proportionally across CCs that already have hours logged.
- You can check/uncheck individual CCs to include or exclude them from the spread.
- Shows a before/after preview before you commit.

### Day navigation
- Use the **‹ ›** arrows in the header to browse previous days.
- You can edit past days — useful for corrections.
- Data is retained for the last TBD days.

---

## Data safety

> **Important:** your data lives in your browser's `localStorage`. This is a small local database managed by your browser. It is **not** a file on your hard drive, and it can be wiped by:
> - Clearing your browser's site data or browsing history
> - Browser profile resets or reinstalls
> - Opening the file from a different path or in a different browser

**To protect yourself, export a JSON backup regularly** — at minimum at the end of each pay period.

*Export JSON / Import JSON buttons are planned for an upcoming version.* Until then, be cautious about clearing browser data.

### Rules to avoid data loss

- Always open `time_tracker.html` from the **same location** on your machine. Moving the file creates a new, empty localStorage.
- Always use the **same browser**. Chrome and Edge have separate localStorage.
- Do **not** use "Clear browsing data" without first being aware that it may wipe your tracker history.
- If you get a new machine or reinstall your browser, you will need to restore from a backup (once that feature is available).

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

- Single HTML file — no dependencies, no build step, works fully offline.
- localStorage key: `cc_tracker_v3`
- Data is retained for the last 14 days. Older days are pruned automatically.
- Migrates automatically from earlier versions (`cc_tracker_v2`).
- Tested in Chrome and Edge on Windows. Other browsers should work but are not the primary target.
