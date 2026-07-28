import { listarAvisos, criarAviso, atualizarAviso, arquivarAviso, alternarFixado } from '../modules/qg.module.js';
import { qgRepository } from '../data/repositories/qgRepository.js';
import { abrirModal } from '../components/Modal.js';
import { confirmarDialog } from '../components/Dialog.js';
import { toast } from '../components/Toast.js';

function formatarData(dataISO) {
  return new Date(dataISO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formularioAvisoHTML(aviso = {}) {
  return `
    <div class="field"><label>Título</label><input type="text" id="f-titulo" value="${aviso.titulo || ''}"></div>
    <div class="field"><label>Conteúdo</label><textarea id="f-conteudo" rows="4">${aviso.conteudo || ''}</textarea></div>
    <div class="field"><label>Autor</label><input type="text" id="f-autor" value="${aviso.autor || 'Liderança'}"></div>
  `;
}

async function renderLista() {
  const container = document.getElementById('qg-lista');
  const avisos = await listarAvisos();

  if (avisos.length === 0) {
    container.innerHTML = `<p class="card__empty">Nenhum aviso publicado ainda.</p>`;
    return;
  }

  container.innerHTML = avisos.map(a => `
    <div class="card qg-card ${a.fixado ? 'qg-card--fixado' : ''}" data-id="${a.id}">
      <button class="qg-card__pin ${a.fixado ? 'is-fixado' : ''}" title="Fixar aviso">📌</button>
      <button class="card-arquivar-btn card-arquivar-btn--offset" data-id="${a.id}" title="Arquivar">🗄</button>
      <div class="qg-card__titulo">${a.titulo}</div>
      <div class="qg-card__conteudo">${a.conteudo}</div>
      <div class="qg-card__footer"><span>${a.autor}</span><span>${formatarData(a.createdAt)}</span></div>
      <button class="btn btn--ghost mt-3 w-full btn-editar-aviso">✎ Editar</button>
    </div>`).join('');

  container.querySelectorAll('.qg-card__pin').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      await alternarFixado(e.target.closest('.qg-card').dataset.id);
      await renderLista();
    });
  });

  container.querySelectorAll('.card-arquivar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmarDialog(
        { titulo: 'Arquivar aviso', mensagem: 'O aviso sai do mural, mas nada é perdido.', textoConfirmar: 'Arquivar' },
        async (confirmado) => {
          if (confirmado) {
            await arquivarAviso(btn.dataset.id);
            await renderLista();
            toast.sucesso('Aviso arquivado.');
          }
        }
      );
    });
  });

  container.querySelectorAll('.btn-editar-aviso').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.closest('.qg-card').dataset.id;
      const aviso = await qgRepository.buscarPorId(id);
      abrirFormularioAviso(aviso);
    });
  });
}

function abrirFormularioAviso(aviso = null) {
  abrirModal({
    titulo: aviso ? 'Editar aviso' : 'Novo aviso',
    textoConfirmar: aviso ? 'Salvar alterações' : 'Publicar',
    conteudoHTML: formularioAvisoHTML(aviso || {}),
    aoConfirmar: async (overlay) => {
      const dados = {
        titulo: overlay.querySelector('#f-titulo').value.trim(),
        conteudo: overlay.querySelector('#f-conteudo').value.trim(),
        autor: overlay.querySelector('#f-autor').value.trim() || 'Liderança',
      };
      try {
        if (aviso) {
          await atualizarAviso(aviso.id, dados);
          toast.sucesso('Aviso atualizado.');
        } else {
          await criarAviso(dados);
          toast.sucesso('Aviso publicado.');
        }
        await renderLista();
      } catch (e) { toast.erro(e.message); return false; }
    }
  });
}

async function init() {
  await renderLista();
  document.getElementById('btn-novo-aviso').addEventListener('click', () => abrirFormularioAviso());
}

document.addEventListener('DOMContentLoaded', init);
