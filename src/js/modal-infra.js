// showModal / closeModal: inject and remove modal DOM from #modal-root.

export function showModal(html, extraClass) {
  const root = document.getElementById('modal-root');
  const cls = extraClass ? `modal modal-${extraClass}` : 'modal';
  root.innerHTML = `<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="${cls}">${html}</div></div>`;
}
export function closeModal() { document.getElementById('modal-root').innerHTML = ''; }
