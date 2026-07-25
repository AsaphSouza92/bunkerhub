import { abrirModal } from './Modal.js';

export function confirmarDialog({ titulo = 'Confirmar ação', mensagem, textoConfirmar = 'Confirmar', perigo = false }, aoResponder) {
  abrirModal({
    titulo,
    conteudoHTML: `<p class="text-sm text-secondary">${mensagem}</p>`,
    textoConfirmar,
    aoConfirmar: () => { aoResponder(true); },
  });

  const overlay = document.getElementById('active-modal');
  if (overlay) {
    overlay.querySelector('#modal-cancel-btn')?.addEventListener('click', () => aoResponder(false), { once: true });
    overlay.querySelector('#modal-close-btn')?.addEventListener('click', () => aoResponder(false), { once: true });

    if (perigo) {
      const btnConfirmar = overlay.querySelector('#modal-confirm-btn');
      if (btnConfirmar) btnConfirmar.classList.add('btn--perigo');
    }
  }
}

export function promptDialog({ titulo = 'Editar', label = '', valorInicial = '', textoConfirmar = 'Salvar' }, aoResponder) {
  abrirModal({
    titulo,
    conteudoHTML: `
      <div class="field">
        <label>${label}</label>
        <input type="text" id="dialog-prompt-input" value="${valorInicial}">
      </div>
    `,
    textoConfirmar,
    aoConfirmar: (overlay) => {
      const valor = overlay.querySelector('#dialog-prompt-input').value.trim();
      aoResponder(valor || null);
    },
  });

  const overlay = document.getElementById('active-modal');
  overlay?.querySelector('#modal-cancel-btn')?.addEventListener('click', () => aoResponder(null), { once: true });
  overlay?.querySelector('#modal-close-btn')?.addEventListener('click', () => aoResponder(null), { once: true });

  setTimeout(() => overlay?.querySelector('#dialog-prompt-input')?.focus(), 50);
}
