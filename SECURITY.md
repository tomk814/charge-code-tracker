# Security

## Data handling

All data stays local. The app has no backend and no account system.

| Data | Storage location |
|---|---|
| Charge codes and daily hours | Browser `localStorage` |
| Optional backup file | Local disk via File System Access API (IndexedDB stores the file handle; the file itself is wherever the user placed it) |
| CSV exports / cold storage archives | Local disk, saved on demand by the user |

Nothing is transmitted to any server. The app works offline and can be opened from a `file://` URL.

## Outbound network call

One optional network call is made on startup:

| Property | Detail |
|---|---|
| URL | `https://api.github.com/repos/tomk814/charge-code-tracker/releases/latest` |
| What it sends | Nothing — a plain unauthenticated GET with no request body or user data |
| What it reads | The latest release tag name, to display an update prompt if a newer version exists |
| How to disable | Set `disableUpdateCheck: true` in Settings, or block the domain in your browser or network |

## Auditing the built file

The release artifact is a single self-contained HTML file (`time_tracker.html`). All JavaScript and CSS are inlined — no external scripts, no CDN links, no dynamic imports at runtime. You can open it in a text editor and read it in full.

The source is built from this repository with Vite + vite-plugin-singlefile. To reproduce the build locally:

```bash
git clone https://github.com/tomk814/charge-code-tracker.git
cd charge-code-tracker
npm ci
npm run build
# output: dist/time_tracker.html
```

## Reporting a security issue

Use [GitHub private vulnerability reporting](../../security/advisories/new) to report issues confidentially. Do not open a public issue for security-sensitive findings.
