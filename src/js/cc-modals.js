// Charge code modals: Add (with Dayforce paste), Edit, Manage list, and Delete.

import { state } from './state.js';
import { save } from './persistence.js';
import { esc, uid } from './utilities.js';
import { showModal, closeModal } from './modal-infra.js';
import { render } from './pay-period.js';
import { getBlocks, blocksToFlat } from './cc-rendering.js';

// ── Modals ───────────────────────────────────────────────────────────────────

// Only the original predefined Pay Adjustment CCs (pa0001–pa0009) are system-managed and cannot be archived or deleted.
export function isProtectedCC(id) {
  return /^pa000[1-9]$/.test(id);
}

export function openAddCC() {
  const _t = document.createElement('template');
  _t.innerHTML = `<h2>Add charge code</h2>
    <div class="field"><label>Paste from Dayforce</label><input id="m-import" placeholder="Proj:1-1234.00 | Program | Work Package | Activity" autocomplete="off" oninput="parseDayforce()"></div>
    <hr style="border:none;border-top:1px solid var(--bd-2);margin:2px 0 12px">
    <div class="field"><label>Code / number</label><input id="m-code" placeholder="e.g. 1234-001" autocomplete="off"></div>
    <div class="field"><label>Program <span style="color:var(--red)">*</span></label><input id="m-program" placeholder="e.g. Program A" autocomplete="off"></div>
    <div class="field"><label>Program Nickname (Optional)</label><input id="m-programNickname" autocomplete="off"></div>
    <div class="field"><label>Work Package (Optional)</label><input id="m-wp" placeholder="e.g. WP-001" autocomplete="off"></div>
    <div class="field"><label>WP Nickname (Optional)</label><input id="m-wpNickname" autocomplete="off"></div>
    <div class="field"><label>Activity <span style="color:var(--red)">*</span></label><input id="m-name" placeholder="e.g. design" autocomplete="off"></div>
    <div class="field"><label>Activity Nickname (Optional)</label><input id="m-nickname" autocomplete="off"></div>
    <div class="modal-actions">
      <button class="tool-btn" onclick="closeModal()">Cancel</button>
      <button class="tool-btn primary" onclick="submitAddCC()">Add</button>
    </div>`;
  showModal(_t.content);
  setTimeout(()=>document.getElementById('m-import')?.focus(),50);
}

export function parseDayforce() {
  const raw = document.getElementById('m-import').value;
  const parts = raw.split('|').map(s => s.trim());
  if (parts.length < 2) return;
  const codeRaw = parts[0].replace(/^Proj:/i, '').trim();
  const program = parts[1] || '';
  const wp = parts.length >= 4 ? (parts[2] || '') : '';
  const label = parts[parts.length - 1] || '';
  if (codeRaw) document.getElementById('m-code').value = codeRaw;
  if (program) document.getElementById('m-program').value = program;
  if (wp) document.getElementById('m-wp').value = wp;
  if (label) document.getElementById('m-name').value = label;
  document.getElementById('m-import').value = '';
  document.getElementById('m-code').focus();
}

export function submitAddCC() {
  const code = document.getElementById('m-code').value.trim();
  const name = document.getElementById('m-name').value.trim();
  const program = document.getElementById('m-program').value.trim();
  const programNickname = document.getElementById('m-programNickname').value.trim();
  const wp = document.getElementById('m-wp').value.trim();
  const wpNickname = document.getElementById('m-wpNickname').value.trim();
  const nickname = document.getElementById('m-nickname').value.trim();
  if (!program || !name) return;
  state.codes.push({id:uid(), code, name, program, programNickname, wp, wpNickname, nickname});
  save(state);
  closeModal();
  render();
}

export function toggleArchiveCC(id) {
  if (isProtectedCC(id)) return;
  const cc = state.codes.find(c => c.id === id);
  if (!cc) return;
  cc.archived = cc.archived ? undefined : true;
  if (cc.archived) { cc.hidden = undefined; }
  if (cc.archived && state.activeTimer && state.activeTimer.ccId === id) state.activeTimer = null;
  save(state);
  render();
  openManage();
}

export function toggleHideCC(id) {
  const cc = state.codes.find(c => c.id === id);
  if (!cc) return;
  cc.hidden = cc.hidden ? undefined : true;
  if (cc.hidden && state.activeTimer && state.activeTimer.ccId === id) state.activeTimer = null;
  save(state);
  render();
  openManage();
}

// Move a whole block (program group or ungrouped CC) up/down among blocks.
export function moveBlock(blockIdx, dir) {
  const blocks = getBlocks();
  const j = blockIdx + dir;
  if (j < 0 || j >= blocks.length) return;
  [blocks[blockIdx], blocks[j]] = [blocks[j], blocks[blockIdx]];
  // Preserve hidden and archived codes after active codes.
  const hidden   = state.codes.filter(cc => cc.hidden && !cc.archived);
  const archived = state.codes.filter(cc => cc.archived);
  state.codes = [...blocksToFlat(blocks), ...hidden, ...archived];
  save(state); render(); openManage();
}

// Move a CC up/down within its program block.
export function moveCCInBlock(ccId, dir) {
  const blocks = getBlocks();
  for (const block of blocks) {
    const i = block.codes.findIndex(c => c.id === ccId);
    if (i < 0) continue;
    const j = i + dir;
    if (j < 0 || j >= block.codes.length) return;
    [block.codes[i], block.codes[j]] = [block.codes[j], block.codes[i]];
    const hidden   = state.codes.filter(cc => cc.hidden && !cc.archived);
    const archived = state.codes.filter(cc => cc.archived);
    state.codes = [...blocksToFlat(blocks), ...hidden, ...archived];
    save(state); render(); openManage();
    return;
  }
}

export function openManage() {
  const blocks = getBlocks();
  const nb = blocks.length;
  const hidden   = state.codes.filter(cc => cc.hidden && !cc.archived);
  const archived = state.codes.filter(cc => cc.archived);

  const activeSection = nb === 0
    ? '<p style="font-size:13px;color:var(--fg-2)">No active charge codes.</p>'
    : blocks.map((block, bi) => {
        const bUp = bi === 0 ? 'disabled' : '';
        const bDn = bi === nb-1 ? 'disabled' : '';
        if (block.type === 'program') {
          const ccRows = block.codes.map((cc, ci) => `
            <div class="cc-manage-item cc-manage-item--nested">
              <div class="reorder-btns">
                <button class="reorder-btn" onclick="moveCCInBlock('${cc.id}',-1)" ${ci===0?'disabled':''} title="Move up">&#9650;</button>
                <button class="reorder-btn" onclick="moveCCInBlock('${cc.id}',1)" ${ci===block.codes.length-1?'disabled':''} title="Move down">&#9660;</button>
              </div>
              <div class="cc-manage-info">
                <span class="cc-manage-name">${esc(cc.nickname || cc.name)}</span>
                <span class="cc-manage-code">${esc(cc.code)}</span>
              </div>
              <button class="tool-btn" onclick="openEditCC('${cc.id}')">Edit</button>
              <button class="tool-btn" onclick="toggleHideCC('${cc.id}')">Hide</button>
              ${isProtectedCC(cc.id) ? '' : `<button class="tool-btn" onclick="toggleArchiveCC('${cc.id}')">Archive</button>`}
              ${isProtectedCC(cc.id) ? '' : `<button class="del-btn" onclick="confirmDeleteCC('${cc.id}')">Delete</button>`}
            </div>`).join('');
          const pgDisplayName = block.codes.find(c => c.programNickname)?.programNickname || block.name;
          return `<div class="pg-manage-block">
            <div class="pg-manage-header">
              <div class="reorder-btns">
                <button class="reorder-btn" onclick="moveBlock(${bi},-1)" ${bUp} title="Move program up">&#9650;</button>
                <button class="reorder-btn" onclick="moveBlock(${bi},1)" ${bDn} title="Move program down">&#9660;</button>
              </div>
              <span class="pg-manage-name" title="${esc(block.name)}">${esc(pgDisplayName)}</span>
            </div>${ccRows}
          </div>`;
        } else {
          const cc = block.codes[0];
          return `<div class="cc-manage-item">
            <div class="reorder-btns">
              <button class="reorder-btn" onclick="moveBlock(${bi},-1)" ${bUp} title="Move up">&#9650;</button>
              <button class="reorder-btn" onclick="moveBlock(${bi},1)" ${bDn} title="Move down">&#9660;</button>
            </div>
            <div class="cc-manage-info">
              <span class="cc-manage-name">${esc(cc.nickname || cc.name)}</span>
              <span class="cc-manage-code">${esc(cc.code)}</span>
            </div>
            <button class="tool-btn" onclick="openEditCC('${cc.id}')">Edit</button>
            <button class="tool-btn" onclick="toggleHideCC('${cc.id}')">Hide</button>
            ${isProtectedCC(cc.id) ? '' : `<button class="tool-btn" onclick="toggleArchiveCC('${cc.id}')">Archive</button>`}
            ${isProtectedCC(cc.id) ? '' : `<button class="del-btn" onclick="confirmDeleteCC('${cc.id}')">Delete</button>`}
          </div>`;
        }
      }).join('');

  const hiddenSection = hidden.length
    ? `<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--bd-1)">
        <div style="font-size:10px;color:var(--fg-2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Hidden</div>
        ${hidden.map(cc => `<div class="cc-manage-item">
          <div class="cc-manage-info">
            <span class="cc-manage-name" style="color:var(--fg-2)">${esc(cc.nickname || cc.name)}</span>
            <span class="cc-manage-code">${esc(cc.code)}</span>
          </div>
          <button class="tool-btn" onclick="openEditCC('${cc.id}')">Edit</button>
          <button class="tool-btn" onclick="toggleHideCC('${cc.id}')">Unhide</button>
          ${isProtectedCC(cc.id) ? '' : `<button class="del-btn" onclick="confirmDeleteCC('${cc.id}')">Delete</button>`}
        </div>`).join('')}
      </div>`
    : '';

  const archivedSection = archived.length
    ? `<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--bd-1)">
        <div style="font-size:10px;color:var(--fg-2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Archived</div>
        ${archived.map(cc => `<div class="cc-manage-item">
          <div class="cc-manage-info">
            <span class="cc-manage-name" style="color:var(--fg-2)">${esc(cc.nickname || cc.name)}</span>
            <span class="cc-manage-code">${esc(cc.code)}</span>
          </div>
          <button class="tool-btn" onclick="openEditCC('${cc.id}')">Edit</button>
          <button class="tool-btn" onclick="toggleArchiveCC('${cc.id}')">Unarchive</button>
          <button class="del-btn" onclick="confirmDeleteCC('${cc.id}')">Delete</button>
        </div>`).join('')}
      </div>`
    : '';

  const emptyState = nb === 0 && !hidden.length && !archived.length
    ? '<p style="font-size:13px;color:var(--fg-2)">No charge codes yet.</p>'
    : '';

  const _t = document.createElement('template');
  _t.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <h2 style="margin:0">Manage charge codes</h2>
    <button onclick="closeModal()" style="background:none;border:none;cursor:pointer;font-size:18px;line-height:1;color:var(--fg-2);padding:2px 4px" title="Close">&times;</button>
  </div>${emptyState}${activeSection}${hiddenSection}${archivedSection}
    <div class="modal-actions"><button class="tool-btn" onclick="closeModal()">Done</button></div>`;
  showModal(_t.content);
}

export function openEditCC(id) {
  const cc = state.codes.find(c => c.id === id);
  if (!cc) return;
  const _t = document.createElement('template');
  _t.innerHTML = `<h2>Edit charge code</h2>
    <div class="field"><label>Code / number</label><input id="e-code" value="${esc(cc.code)}" placeholder="e.g. 1234-001" autocomplete="off"></div>
    <div class="field"><label>Program <span style="color:var(--red)">*</span></label><input id="e-program" value="${esc(cc.program||'')}" placeholder="e.g. Program A" autocomplete="off"></div>
    <div class="field"><label>Program Nickname (Optional)</label><input id="e-programNickname" value="${esc(cc.programNickname||'')}" autocomplete="off"></div>
    <div class="field"><label>Work Package (Optional)</label><input id="e-wp" value="${esc(cc.wp||'')}" placeholder="e.g. WP-001" autocomplete="off"></div>
    <div class="field"><label>WP Nickname (Optional)</label><input id="e-wpNickname" value="${esc(cc.wpNickname||'')}" autocomplete="off"></div>
    <div class="field"><label>Activity <span style="color:var(--red)">*</span></label><input id="e-name" value="${esc(cc.name)}" autocomplete="off"></div>
    <div class="field"><label>Activity Nickname (Optional)</label><input id="e-nickname" value="${esc(cc.nickname||'')}" autocomplete="off"></div>
    <div class="modal-actions">
      <button class="tool-btn" onclick="openManage()">Cancel</button>
      <button class="tool-btn primary" onclick="submitEditCC('${id}')">Save</button>
    </div>`;
  showModal(_t.content);
  setTimeout(()=>document.getElementById('e-code')?.focus(),50);
}

export function submitEditCC(id) {
  const cc = state.codes.find(c => c.id === id);
  if (!cc) return;
  const code = document.getElementById('e-code').value.trim();
  const name = document.getElementById('e-name').value.trim();
  const program = document.getElementById('e-program').value.trim();
  const programNickname = document.getElementById('e-programNickname').value.trim();
  const wp = document.getElementById('e-wp').value.trim();
  const wpNickname = document.getElementById('e-wpNickname').value.trim();
  const nickname = document.getElementById('e-nickname').value.trim();
  if (!program || !name) return;
  cc.code = code;
  cc.name = name;
  cc.program = program;
  cc.programNickname = programNickname;
  cc.wp = wp;
  cc.wpNickname = wpNickname;
  cc.nickname = nickname;
  save(state);
  render();
  openManage();
}

export function confirmDeleteCC(id) {
  if (isProtectedCC(id)) return;
  const cc = state.codes.find(c => c.id === id);
  if (!cc) return;
  const label = esc(cc.nickname || cc.name);
  const isArchived = !!cc.archived;
  const archiveTip = isArchived
    ? ''
    : `<p style="font-size:13px;color:var(--fg-2);margin:0 0 16px">Did you mean to <strong>Archive</strong> it instead? Archived codes are hidden from the main view but preserve their history.</p>`;
  const _t = document.createElement('template');
  _t.innerHTML = `<h2 style="color:var(--red)">Delete charge code?</h2>
    <p style="margin:0 0 8px">This will permanently delete <strong>${label}</strong> and remove it from all logged days. This cannot be undone.</p>
    ${archiveTip}
    <div class="modal-actions">
      <button class="tool-btn" onclick="openManage()">Cancel</button>
      ${isArchived ? '' : `<button class="tool-btn" onclick="toggleArchiveCC('${id}')">Archive instead</button>`}
      <button class="tool-btn" style="background:var(--red);color:#fff;border-color:var(--red)" onclick="deleteCC('${id}')">Delete forever</button>
    </div>`;
  showModal(_t.content);
}

export function deleteCC(id) {
  if (isProtectedCC(id)) return;
  if (state.activeTimer && state.activeTimer.ccId === id) state.activeTimer = null;
  state.codes = state.codes.filter(c => c.id !== id);
  Object.values(state.days||{}).forEach(day => {
    delete day.hours[id];
  });
  save(state);
  openManage();
  render();
}
