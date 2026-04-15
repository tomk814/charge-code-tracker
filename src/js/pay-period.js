// Pay period bar calculation and the main render() function that rebuilds the CC list.

import { state, viewDate } from './state.js';
import { dayData, save, today, applyHolidayPrePopulate, isHoliday, ymdLocal } from './persistence.js';
import { getBlocks, renderProgramCard, renderIndividualCard } from './cc-rendering.js';
import { esc } from './utilities.js';
import { showModal, closeModal } from './modal-infra.js';

// ── Pay period ───────────────────────────────────────────────────────────────
const PP_ANCHOR = new Date('2026-04-04T12:00:00'); // known period-end Saturday

export function payPeriodEnd(fromDateStr) {
  const d = new Date(fromDateStr + 'T12:00:00');
  const diffDays = Math.round((d - PP_ANCHOR) / 86400000);
  const daysIntoPeriod = ((diffDays % 14) + 14) % 14;
  const daysUntilEnd = daysIntoPeriod === 0 ? 0 : 14 - daysIntoPeriod;
  const end = new Date(d);
  end.setDate(end.getDate() + daysUntilEnd);
  return end;
}

function workingDaysRemaining(fromDateStr, endDate) {
  const from = new Date(fromDateStr + 'T12:00:00');
  let count = 0;
  const d = new Date(from);
  while (d <= endDate) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function payPeriodHours(endDate) {
  const start = new Date(endDate);
  start.setDate(start.getDate() - 13);
  let total = 0;
  for (const [dateStr, day] of Object.entries(state.days || {})) {
    const d = new Date(dateStr + 'T12:00:00');
    if (d >= start && d <= endDate) {
      total += Object.values(day.hours || {}).reduce((s, h) => s + h, 0);
    }
  }
  return parseFloat(total.toFixed(1));
}

export function renderPayPeriod() {
  const el = document.getElementById('pay-period-bar');
  if (!el) return;
  const end = payPeriodEnd(today());
  const dayAbbr = end.toLocaleDateString([], {weekday:'short'});
  const dateStr = `${end.getMonth()+1}/${end.getDate()}`;
  const wdLeft = workingDaysRemaining(today(), end);
  const hrs = payPeriodHours(end);
  const hrsStr = `<span${hrs >= 80 ? ' style="color:var(--green)"' : ''}>${hrs.toFixed(1)}</span>`;
  el.innerHTML = `Pay period ends ${dayAbbr} ${dateStr}  (${wdLeft} working day${wdLeft===1?'':'s'} remaining)  —  Pay period hours: ${hrsStr}`;
}

export function openPayPeriodModal(offset = 0) {
  const ppEnd = payPeriodEnd(today());
  ppEnd.setDate(ppEnd.getDate() + offset * 14);
  const ppStart = new Date(ppEnd);
  ppStart.setDate(ppStart.getDate() - 13);

  // Collect all days in the pay period; weekends are included only if any CC has hours on that day
  const allDays = [];
  const cur = new Date(ppStart);
  while (cur <= ppEnd) {
    const dow = cur.getDay();
    allDays.push({
      iso: ymdLocal(cur),
      dow: cur.toLocaleDateString([], {weekday: 'narrow'}),
      md: `${cur.getMonth()+1}/${cur.getDate()}`,
      isWeekend: dow === 0 || dow === 6
    });
    cur.setDate(cur.getDate() + 1);
  }
  const anyWeekendHours = allDays.some(d => {
    if (!d.isWeekend) return false;
    const dayHours = (state.days[d.iso] || {}).hours || {};
    return Object.values(dayHours).some(h => h > 0);
  });
  const days = allDays.filter(d => !d.isWeekend || anyWeekendHours);

  // Build hours lookup: hours[ccId][iso]
  const hours = {};
  state.codes.forEach(cc => {
    hours[cc.id] = {};
    days.forEach(d => {
      hours[cc.id][d.iso] = ((state.days[d.iso] || {}).hours || {})[cc.id] || 0;
    });
  });

  const ccTotal  = cc  => parseFloat(days.reduce((s, d) => s + (hours[cc.id][d.iso] || 0), 0).toFixed(1));
  const dayTotal = iso => parseFloat(state.codes.reduce((s, cc) => s + (hours[cc.id][iso] || 0), 0).toFixed(1));
  const grandTotal = parseFloat(state.codes.reduce((s, cc) => s + ccTotal(cc), 0).toFixed(1));

  const activeCCs = state.codes.filter(cc => ccTotal(cc) > 0);
  const todayIso = today();

  const startStr = ppStart.toLocaleDateString([], {month: 'short', day: 'numeric'});
  const endStr   = ppEnd.toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'});

  const isCurDay = iso => iso === todayIso;
  const isWeekend = iso => { const dow = new Date(iso + 'T12:00:00').getDay(); return dow === 0 || dow === 6; };
  const hrsCell = (h, iso, extra) => {
    const cls = ['pp-cell', isCurDay(iso) ? 'pp-today' : '', isWeekend(iso) ? 'pp-weekend' : '',
                 isHoliday(iso) ? 'pp-holiday' : '', extra].filter(Boolean).join(' ');
    return `<td class="${cls}">${h > 0 ? h.toFixed(1) : '<span class="pp-zero">—</span>'}</td>`;
  };

  const thead = `<tr>
    <th class="pp-th pp-th-label">Charge code</th>
    ${days.map(d => {
      const cls = ['pp-th', 'pp-th-day', isCurDay(d.iso) ? 'pp-today' : '',
                   d.isWeekend ? 'pp-weekend' : '', isHoliday(d.iso) ? 'pp-holiday' : ''].filter(Boolean).join(' ');
      return `<th class="${cls}">${esc(d.dow)}<br><span class="pp-date">${d.md}</span></th>`;
    }).join('')}
    <th class="pp-th pp-th-total">Total</th>
  </tr>`;

  const tbody = activeCCs.length
    ? activeCCs.map(cc => {
        const prog  = (cc.program || '').trim();
        const label = prog ? `${prog}: ${cc.nickname || cc.name}` : (cc.nickname || cc.name);
        return `<tr class="pp-row">
          <td class="pp-cell-label" title="${esc(cc.code)}: ${esc(cc.name)}">${esc(label)}</td>
          ${days.map(d => hrsCell(hours[cc.id][d.iso], d.iso, '')).join('')}
          <td class="pp-total-cell">${ccTotal(cc).toFixed(1)}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="${days.length + 2}" class="pp-empty">No hours logged this pay period.</td></tr>`;

  const tfoot = activeCCs.length
    ? `<tr class="pp-foot-row">
        <td class="pp-cell-label pp-foot-label">Total</td>
        ${days.map(d => hrsCell(dayTotal(d.iso), d.iso, 'pp-foot-cell')).join('')}
        <td class="pp-total-cell pp-foot-total">${grandTotal.toFixed(1)}</td>
       </tr>`
    : '';

  showModal(`<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <button class="tool-btn" onclick="openPayPeriodModal(${offset - 1})" style="padding:2px 8px;font-size:14px">&#8249;</button>
      <h2 style="margin:0;flex:1">Pay period</h2>
      <button class="tool-btn" onclick="openPayPeriodModal(${offset + 1})" style="padding:2px 8px;font-size:14px" ${offset >= 0 ? 'disabled' : ''}>&#8250;</button>
    </div>
    <p style="font-size:11px;color:var(--fg-2);font-family:var(--font-mono);margin-bottom:12px">${startStr} – ${endStr}</p>
    <div style="overflow-x:auto">
      <table class="pp-table">
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
        ${tfoot ? `<tfoot>${tfoot}</tfoot>` : ''}
      </table>
    </div>
    <div class="modal-actions">
      <button class="tool-btn primary" onclick="closeModal()">Close</button>
    </div>`, 'wide');
}

export function render() {
  if (applyHolidayPrePopulate(viewDate)) save(state);
  renderPayPeriod();
  const isToday = viewDate === today();
  const viewDt = new Date(viewDate + 'T12:00:00');
  document.getElementById('date-badge').textContent =
    viewDt.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'}) +
    (isToday ? ' — today' : '');

  const navFwd = document.getElementById('nav-fwd');
  if (navFwd) navFwd.disabled = isToday;

  const banner = document.getElementById('past-day-banner');
  if (banner) banner.style.display = isToday ? 'none' : 'flex';

  const day = dayData(viewDate);

  const list = document.getElementById('cc-list');
  const activeCodes = state.codes.filter(cc => !cc.archived && !cc.hidden);
  if (!activeCodes.length) {
    list.innerHTML = '<div class="cc-card empty-state">No charge codes yet — add one above</div>';
    return;
  }

  list.innerHTML = getBlocks().map(block =>
    block.type === 'program'
      ? renderProgramCard(block.name, block.codes, day)
      : renderIndividualCard(block.codes[0], day)
  ).join('');
}
