// showModal / closeModal: inject and remove modal DOM from #modal-root.

export function showModal(html, extraClass) {
  const root = document.getElementById('modal-root');
  const safeExtra = extraClass ? String(extraClass).replace(/[^a-zA-Z0-9_-]/g, '') : '';
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.addEventListener('click', e => { if (e.target === bg) closeModal(); });
  const box = document.createElement('div');
  box.className = safeExtra ? `modal modal-${safeExtra}` : 'modal';
  box.innerHTML = html;
  bg.appendChild(box);
  root.replaceChildren(bg);
}
export function closeModal() { document.getElementById('modal-root').innerHTML = ''; }
