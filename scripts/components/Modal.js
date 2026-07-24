export function abrirModal({ titulo, conteudoHTML, aoConfirmar, textoConfirmar = 'Salvar' }) {
  fecharModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__header">
        <h3>${titulo}</h3>
        <button class="modal__close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal__body">${conteudoHTML}</div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="modal-cancel-btn">Cancelar</button>
        <button class="btn btn--primary" id="modal-confirm-btn">${textoConfirmar}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const close = () => fecharModal();
  overlay.querySelector('#modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#modal-cancel-btn').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-confirm-btn').addEventListener('click', async () => {
    const resultado = await aoConfirmar(overlay);
    if (resultado !== false) close();
  });

  return overlay;
}

export function fecharModal() {
  const existente = document.getElementById('active-modal');
  if (existente) {
    existente.remove();
    document.body.style.overflow = '';
  }
}
