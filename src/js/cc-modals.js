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

  const frag = document.createDocumentFragment();

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px';
  const h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'Manage charge codes';
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:18px;line-height:1;color:var(--fg-2);padding:2px 4px';
  closeBtn.title = 'Close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closeModal);
  header.append(h2, closeBtn);
  frag.appendChild(header);

  // Empty state (only when truly no codes at all)
  if (nb === 0 && !hidden.length && !archived.length) {
    const p = document.createElement('p');
    p.style.cssText = 'font-size:13px;color:var(--fg-2)';
    p.textContent = 'No charge codes yet.';
    frag.appendChild(p);
  }

  // Active section
  if (nb === 0) {
    const p = document.createElement('p');
    p.style.cssText = 'font-size:13px;color:var(--fg-2)';
    p.textContent = 'No active charge codes.';
    frag.appendChild(p);
  } else {
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];
      const isFirst = bi === 0;
      const isLast  = bi === nb - 1;

      if (block.type === 'program') {
        const pgDiv = document.createElement('div');
        pgDiv.className = 'pg-manage-block';

        const pgHeader = document.createElement('div');
        pgHeader.className = 'pg-manage-header';

        const pgBtns = document.createElement('div');
        pgBtns.className = 'reorder-btns';
        const pgUp = document.createElement('button');
        pgUp.className = 'reorder-btn'; pgUp.innerHTML = '&#9650;'; pgUp.title = 'Move program up';
        if (isFirst) pgUp.disabled = true;
        pgUp.addEventListener('click', () => moveBlock(bi, -1));
        const pgDn = document.createElement('button');
        pgDn.className = 'reorder-btn'; pgDn.innerHTML = '&#9660;'; pgDn.title = 'Move program down';
        if (isLast) pgDn.disabled = true;
        pgDn.addEventListener('click', () => moveBlock(bi, 1));
        pgBtns.append(pgUp, pgDn);

        const pgDisplayName = block.codes.find(c => c.programNickname)?.programNickname || block.name;
        const pgNameSpan = document.createElement('span');
        pgNameSpan.className = 'pg-manage-name';
        pgNameSpan.title = block.name;
        pgNameSpan.textContent = pgDisplayName;

        pgHeader.append(pgBtns, pgNameSpan);
        pgDiv.appendChild(pgHeader);

        block.codes.forEach((cc, ci) => {
          pgDiv.appendChild(_makeManageItem(cc, {
            nested: true,
            reorderUp: () => moveCCInBlock(cc.id, -1), upDisabled: ci === 0,
            reorderDn: () => moveCCInBlock(cc.id, 1),  dnDisabled: ci === block.codes.length - 1,
            canHide: true, canArchive: !isProtectedCC(cc.id), canDelete: !isProtectedCC(cc.id),
          }));
        });

        frag.appendChild(pgDiv);
      } else {
        const cc = block.codes[0];
        frag.appendChild(_makeManageItem(cc, {
          nested: false,
          reorderUp: () => moveBlock(bi, -1), upDisabled: isFirst,
          reorderDn: () => moveBlock(bi, 1),  dnDisabled: isLast,
          canHide: true, canArchive: !isProtectedCC(cc.id), canDelete: !isProtectedCC(cc.id),
        }));
      }
    }
  }

  // Hidden section
  if (hidden.length) {
    const sec = document.createElement('div');
    sec.style.cssText = 'margin-top:14px;padding-top:10px;border-top:1px solid var(--bd-1)';
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:10px;color:var(--fg-2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px';
    lbl.textContent = 'Hidden';
    sec.appendChild(lbl);
    hidden.forEach(cc => sec.appendChild(_makeManageItem(cc, {
      nameStyle: 'color:var(--fg-2)', canUnhide: true, canDelete: !isProtectedCC(cc.id),
    })));
    frag.appendChild(sec);
  }

  // Archived section
  if (archived.length) {
    const sec = document.createElement('div');
    sec.style.cssText = 'margin-top:14px;padding-top:10px;border-top:1px solid var(--bd-1)';
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:10px;color:var(--fg-2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px';
    lbl.textContent = 'Archived';
    sec.appendChild(lbl);
    archived.forEach(cc => sec.appendChild(_makeManageItem(cc, {
      nameStyle: 'color:var(--fg-2)', canUnarchive: true, canDelete: true,
    })));
    frag.appendChild(sec);
  }

  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-actions';
  const doneBtn = document.createElement('button');
  doneBtn.className = 'tool-btn';
  doneBtn.textContent = 'Done';
  doneBtn.addEventListener('click', closeModal);
  footer.appendChild(doneBtn);
  frag.appendChild(footer);

  showModal(frag);
}

// Build a single cc-manage-item element using DOM APIs (no innerHTML for user data).
function _makeManageItem(cc, opts = {}) {
  const item = document.createElement('div');
  item.className = opts.nested ? 'cc-manage-item cc-manage-item--nested' : 'cc-manage-item';

  if (opts.reorderUp) {
    const btns = document.createElement('div');
    btns.className = 'reorder-btns';
    const up = document.createElement('button');
    up.className = 'reorder-btn'; up.innerHTML = '&#9650;'; up.title = 'Move up';
    if (opts.upDisabled) up.disabled = true;
    up.addEventListener('click', opts.reorderUp);
    const dn = document.createElement('button');
    dn.className = 'reorder-btn'; dn.innerHTML = '&#9660;'; dn.title = 'Move down';
    if (opts.dnDisabled) dn.disabled = true;
    dn.addEventListener('click', opts.reorderDn);
    btns.append(up, dn);
    item.appendChild(btns);
  }

  const info = document.createElement('div');
  info.className = 'cc-manage-info';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'cc-manage-name';
  if (opts.nameStyle) nameSpan.style.cssText = opts.nameStyle;
  nameSpan.textContent = cc.nickname || cc.name;
  const codeSpan = document.createElement('span');
  codeSpan.className = 'cc-manage-code';
  codeSpan.textContent = cc.code;
  info.append(nameSpan, codeSpan);
  item.appendChild(info);

  const editBtn = document.createElement('button');
  editBtn.className = 'tool-btn'; editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => openEditCC(cc.id));
  item.appendChild(editBtn);

  if (opts.canHide) {
    const hideBtn = document.createElement('button');
    hideBtn.className = 'tool-btn'; hideBtn.textContent = 'Hide';
    hideBtn.addEventListener('click', () => toggleHideCC(cc.id));
    item.appendChild(hideBtn);
  }
  if (opts.canUnhide) {
    const unhideBtn = document.createElement('button');
    unhideBtn.className = 'tool-btn'; unhideBtn.textContent = 'Unhide';
    unhideBtn.addEventListener('click', () => toggleHideCC(cc.id));
    item.appendChild(unhideBtn);
  }
  if (opts.canArchive) {
    const archBtn = document.createElement('button');
    archBtn.className = 'tool-btn'; archBtn.textContent = 'Archive';
    archBtn.addEventListener('click', () => toggleArchiveCC(cc.id));
    item.appendChild(archBtn);
  }
  if (opts.canUnarchive) {
    const unarchBtn = document.createElement('button');
    unarchBtn.className = 'tool-btn'; unarchBtn.textContent = 'Unarchive';
    unarchBtn.addEventListener('click', () => toggleArchiveCC(cc.id));
    item.appendChild(unarchBtn);
  }
  if (opts.canDelete) {
    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn'; delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => confirmDeleteCC(cc.id));
    item.appendChild(delBtn);
  }

  return item;
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
