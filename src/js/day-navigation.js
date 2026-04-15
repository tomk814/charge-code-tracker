// Day navigation: navigate(delta) and goToToday() for browsing past days.

import { viewDate, setViewDate } from './state.js';
import { today, ymdLocal } from './persistence.js';
import { render } from './pay-period.js';
import { renderClock } from './clock.js';

export function navigate(delta) {
  const d = new Date(viewDate + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  const next = ymdLocal(d);
  if (next > today()) return;
  setViewDate(next);
  render();
  renderClock();
}

export function goToToday() {
  setViewDate(today());
  render();
  renderClock();
}
