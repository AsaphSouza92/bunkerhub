import { listarMateriais, criarMaterial, atualizarMaterial, arquivarMaterial, listarCategorias } from '../modules/biblioteca.module.js';
import { bibliotecaRepository } from '../data/repositories/bibliotecaRepository.js';
import { abrirModal } from '../components/Modal.js';
import { confirmarDialog } from '../components/Dialog.js';
import { toast } from '../components/Toast.js';

let filtroAtual = { busca: '', categoria: '' };

function formularioMaterialHTML(material = {}) {
  return `
    <div class="field"><label>Título</label><input type="text" id="f-titulo" value="${material.titulo || ''}"></div>
    <div class="field-row">
      <div class="field"><label>Tipo</label><select id="f-tipo">${['Documento','Link','Vídeo','Áudio'].map(t=>`<option value="${t}" ${material.tipo===t?'selected':''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Categoria</label><input type="text" id="f-categoria" value="${material.categoria || ''}"></div>
    </div>
    <div class="field"><label>Link (opcional)</label><input type="url" id="f-url" value="${material.url || ''}"></div>
    <div class="field"><label>Autor</label><input type="text" id="f-autor" value="${material.autor || ''}"></div>
    <div class="field"><label>Descrição</label><textarea id="f-descricao" rows="2">${material.descricao || ''}</textarea></div>
  `;
}

function lerFormularioMaterial(overlay) {
  return {
    titulo: overlay.querySelector('#f-titulo').value.trim(),
    tipo: overlay.querySelector('#f-tipo').value,
    categoria: overlay.querySelector('#f-categoria').value.trim() || 'Geral',
    url: overlay.querySelector('#f-url').value.trim(),
    autor: overlay.querySelector('#f-autor').value.trim(),
    descricao: overlay.querySelector('#f-descricao').value.trim(),
  };
}

async function renderGrid() {
  const grid = document.getElementById('biblioteca-grid');
  const materiais = await listarMateriais(filtroAtual);

  grid.innerHTML = materiais.length
    ? materiais.map(m => `
        <div class="card" data-id="${m.id}">
          <button class="card-arquivar-btn" data-id="${m.id}" title="Arquivar">🗄</button>
          <span class="material-card__tipo">${m.tipo}</span>
          <div class="material-card__titulo">${m.titulo}</div>
          ${m.descricao ? `<div class="material-card__desc">${m.descricao}</div>` : ''}
          <div class="material-card__footer">
            <span>${m.categoria}${m.autor ? ' · ' + m.autor : ''}</span>
            ${m.url ? `<a class="material-card__link" href="${m.url}" target="_blank" rel="noopener">Abrir ↗</a>` : ''}
          </div>
          <button class="btn btn--ghost mt-3 w-full btn-editar-material">✎ Editar</button>
        </div>`).join('')
    : `<p class="card__empty">Nenhum material encontrado.</p>`;

  grid.querySelectorAll('.card-arquivar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmarDialog(
        { titulo: 'Arquivar material', mensagem: 'O material sai da Biblioteca, mas nada é perdido.', textoConfirmar: 'Arquivar' },
        async (confirmado) => {
          if (confirmado) {
            await arquivarMaterial(btn.dataset.id);
            await renderGrid();
            await popularFiltroCategorias();
            toast.sucesso('Material arquivado.');
          }
        }
      );
    });
  });

  grid.querySelectorAll('.btn-editar-material').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.closest('[data-id]').dataset.id;
      const material = await bibliotecaRepository.buscarPorId(id);
      abrirFormularioMaterial(material);
    });
  });
}

async function popularFiltroCategorias() {
  const select = document.getElementById('filtro-categoria');
  const categorias = await listarCategorias();
  select.innerHTML = `<option value="">Todas as categorias</option>` + categorias.map(c => `<option value="${c}">${c}</option>`).join('');
}

function abrirFormularioMaterial(material = null) {
  abrirModal({
    titulo: material ? 'Editar material' : 'Novo material',
    textoConfirmar: material ? 'Salvar alterações' : 'Adicionar',
    conteudoHTML: formularioMaterialHTML(material || {}),
    aoConfirmar: async (overlay) => {
      const dados = lerFormularioMaterial(overlay);
      try {
        if (material) {
          await atualizarMaterial(material.id, dados);
          toast.sucesso('Material atualizado.');
        } else {
          await criarMaterial(dados);
          toast.sucesso('Material adicionado.');
        }
        await renderGrid();
        await popularFiltroCategorias();
      } catch (e) { toast.erro(e.message); return false; }
    }
  });
}

async function init() {
  await bibliotecaRepository.seedIfEmpty();
  await renderGrid();
  await popularFiltroCategorias();

  document.getElementById('btn-novo-material').addEventListener('click', () => abrirFormularioMaterial());
  document.getElementById('busca-input').addEventListener('input', async (e) => { filtroAtual.busca = e.target.value; await renderGrid(); });
  document.getElementById('filtro-categoria').addEventListener('change', async (e) => { filtroAtual.categoria = e.target.value; await renderGrid(); });
}

document.addEventListener('DOMContentLoaded', init);
