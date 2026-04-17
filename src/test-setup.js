// Vitest global setup — polyfills for browser APIs unavailable in Node.js.
// Runs once per worker before each test file (see vite.config.js setupFiles).

import { beforeEach } from 'vitest';

// ── localStorage polyfill ─────────────────────────────────────────────────────
// persistence.js reads/writes localStorage; state.js calls load() on import.
const _ls = {};

global.localStorage = {
  getItem:    (k)    => Object.prototype.hasOwnProperty.call(_ls, k) ? _ls[k] : null,
  setItem:    (k, v) => { _ls[k] = String(v); },
  removeItem: (k)    => { delete _ls[k]; },
  clear:      ()     => { for (const k in _ls) delete _ls[k]; },
  get length()       { return Object.keys(_ls).length; },
  key:        (i)    => Object.keys(_ls)[i] ?? null,
};

// ── document stub ─────────────────────────────────────────────────────────────
// Most DOM-dependent functions guard with `if (!el) return`, so returning null
// for getElementById is sufficient for pure-logic tests.
global.document = {
  getElementById:    () => null,
  querySelector:     () => null,
  querySelectorAll:  () => [],
  createElement:     () => ({
    style: {}, className: '', innerHTML: '', textContent: '',
    click() {}, remove() {}, setAttribute() {}, addEventListener() {},
  }),
};

// ── navigator stub ────────────────────────────────────────────────────────────
// navigator is a read-only property on the global in Node — use defineProperty.
Object.defineProperty(global, 'navigator', {
  value: { clipboard: { writeText: () => Promise.resolve() } },
  writable: true,
  configurable: true,
});

// ── Clear localStorage before every test ─────────────────────────────────────
beforeEach(() => {
  for (const k in _ls) delete _ls[k];
});
