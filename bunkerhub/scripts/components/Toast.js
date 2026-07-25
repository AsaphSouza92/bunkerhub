let container = null;

function getContainer() {
  if (container) return container;
  container = document.createElement('div');
  container.className = 'toast-container';
  container.id = 'toast-container';
  document.body.appendChild(container);
  return container;
}

const ICONE = { sucesso: '✓', erro: '⚠', info: 'ℹ' };

export function mostrarToast(mensagem, tipo = 'info', duracaoMs = 3500) {
  const el = document.createElement('div');
  el.className = `toast toast--${tipo}`;
  el.innerHTML = `
    <span class="toast__icone">${ICONE[tipo] || ICONE.info}</span>
    <span class="toast__texto">${mensagem}</span>
  `;

  getContainer().appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--visivel'));

  const remover = () => {
    el.classList.remove('toast--visivel');
    setTimeout(() => el.remove(), 200);
  };

  el.addEventListener('click', remover);
  setTimeout(remover, duracaoMs);
}

export const toast = {
  sucesso: (msg) => mostrarToast(msg, 'sucesso'),
  erro: (msg) => mostrarToast(msg, 'erro'),
  info: (msg) => mostrarToast(msg, 'info'),
};
