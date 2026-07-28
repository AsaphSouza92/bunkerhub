import { listarMinisterios, criarMinisterio, arquivarMinisterio } from '../modules/ministerios.module.js';
import { abrirModal } from '../components/Modal.js';
import { confirmarDialog } from '../components/Dialog.js';
import { toast } from '../components/Toast.js';

async function renderLista() {
  const container = document.getElementById('ministerios-lista');
  const ministerios = await listarMinisterios();

  container.innerHTML = ministerios.length
    ? ministerios.map(m => `
        <div class="card ministerio-card" data-id="${m.id}">
          <button class="card-arquivar-btn" data-id="${m.id}" title="Arquivar">🗄</button>
          <div class="ministerio-card__nome">${m.nome}</div>
          ${m.descricao ? `<div class="text-sm text-secondary mt-1">${m.descricao}</div>` : ''}
        </div>`).join('')
    : `<p class="card__empty">Nenhum ministério cadastrado ainda.</p>`;

  container.querySelectorAll('.card-arquivar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmarDialog(
        {
          titulo: 'Arquivar ministério',
          mensagem: 'O ministério sai das listagens. Pessoas vinculadas mantêm o histórico do vínculo.',
          textoConfirmar: 'Arquivar',
        },
        async (confirmado) => {
          if (confirmado) {
            await arquivarMinisterio(btn.dataset.id);
            await renderLista();
            toast.sucesso('Ministério arquivado.');
          }
        }
      );
    });
  });
}

function abrirFormularioNovo() {
  abrirModal({
    titulo: 'Novo ministério',
    textoConfirmar: 'Criar',
    conteudoHTML: `
      <div class="field"><label>Nome</label><input type="text" id="f-nome" placeholder="Ex: Louvor"></div>
      <div class="field"><label>Descrição</label><textarea id="f-descricao" rows="2" placeholder="Opcional"></textarea></div>
    `,
    aoConfirmar: async (overlay) => {
      try {
        await criarMinisterio({
          nome: overlay.querySelector('#f-nome').value.trim(),
          descricao: overlay.querySelector('#f-descricao').value.trim(),
        });
        await renderLista();
        toast.sucesso('Ministério criado.');
      } catch (e) {
        toast.erro(e.message);
        return false;
      }
    }
  });
}

async function init() {
  await renderLista();
  document.getElementById('btn-novo-ministerio').addEventListener('click', abrirFormularioNovo);
}

document.addEventListener('DOMContentLoaded', init);
