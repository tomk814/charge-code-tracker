// Global helper functions: esc() for HTML escaping, uid() for random IDs.

export function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function uid() { return Math.random().toString(36).slice(2,8); }
