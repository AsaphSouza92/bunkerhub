import { listarIdeias, criarIdeia, atualizarStatus, arquivarIdeia, podeVirarEvento, STATUS } from '../modules/ideias.module.js';
import { criarEventoAPartirDeIdeia } from '../modules/eventos.module.js';
import { registrarListenersGlobais } from '../core/bootstrap-listeners.js';
import { abrirModal } from '../components/Modal.js';
import { confirmarDialog } from '../components/Dialog.js';
import { toast } from '../components/Toast.js';

let filtroAtual = { categoria: '' };
const DOT_CLASS = { 'Rascunho': 'dot-rascunho', 'Em análise': 'dot-analise', 'Aprovado': 'dot-aprovado', 'Arquivado': 'dot-arquivado' };
const PRIORIDADE_CLASS = { 'Alta': 'badge--prioridade-alta', 'Média': 'badge--prioridade-media', 'Baixa': 'badge--prioridade-baixa' };

function cardIdeiaHTML(ideia) {
  const mostrarBotao = podeVirarEvento(ideia);
  return `
    <div class="card ideia-card" data-id="${ideia.id}">
      <button class="card-arquivar-btn" data-id="${ideia.id}" title="Arquivar">🗄</button>
      <div class="ideia-card__titulo">${ideia.titulo}</div>
      <div class="text-xs text-secondary">${ideia.categoria}</div>
      <div class="ideia-card__footer">
        <span class="badge ${PRIORIDADE_CLASS[ideia.prioridade] || ''}">${ideia.prioridade}</span>
        <span class="text-xs text-muted">${ideia.data}</span>
      </div>
      ${mostrarBotao ? `<button class="btn btn--primary btn--transformar" data-id="${ideia.id}">✧ Transformar em Evento</button>` : ''}
      ${ideia.transformadaEmEventoId ? `<div class="text-xs mt-2 cor-sucesso">✓ Evento criado</div>` : ''}
    </div>`;
}

async function renderBoard() {
  const board = document.getElementById('ideias-board');
  const todas = await listarIdeias(filtroAtual);

  board.innerHTML = STATUS.map(status => {
    const doStatus = todas.filter(i => i.status === status);
    return `
      <div class="ideias-coluna" data-status="${status}">
        <div class="ideias-coluna__titulo">
          <span class="ideias-coluna__dot ${DOT_CLASS[status]}"></span> ${status} (${doStatus.length})
        </div>
        <div class="ideias-coluna__lista">
          ${doStatus.map(cardIdeiaHTML).join('') || '<p class="card__empty">Vazio</p>'}
        </div>
      </div>`;
  }).join('');

  board.querySelectorAll('.ideia-card').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.btn--transformar') || e.target.closest('.card-arquivar-btn')) return;
      abrirDetalheIdeia(el.dataset.id);
    });
  });
  board.querySelectorAll('.btn--transformar').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); transformarEmEvento(btn.dataset.id); });
  });
  board.querySelectorAll('.card-arquivar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmarDialog(
        { titulo: 'Arquivar ideia', mensagem: 'A ideia sai do board, mas nada é perdido.', textoConfirmar: 'Arquivar' },
        async (confirmado) => {
          if (confirmado) {
            await arquivarIdeia(btn.dataset.id);
            await renderBoard();
            toast.sucesso('Ideia arquivada.');
          }
        }
      );
    });
  });
}

async function transformarEmEvento(ideiaId) {
  const ideias = await listarIdeias();
  const ideia = ideias.find(i => i.id === ideiaId);
  if (!ideia) return;
  const evento = await criarEventoAPartirDeIdeia(ideia);
  await renderBoard();
  toast.sucesso(`Evento "${evento.nome}" criado! Complete os detalhes em Eventos.`);
}

function abrirFormularioNovaIdeia() {
  abrirModal({
    titulo: 'Nova ideia', textoConfirmar: 'Registrar ideia',
    conteudoHTML: `
      <div class="field"><label>Título</label><input type="text" id="f-titulo"></div>
      <div class="field-row">
        <div class="field"><label>Categoria</label><select id="f-categoria">${['Geral','Evento','Discipulado','Melhoria'].map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div>
        <div class="field"><label>Prioridade</label><select id="f-prioridade">${['Baixa','Média','Alta'].map(p=>`<option value="${p}" ${p==='Média'?'selected':''}>${p}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Descrição</label><textarea id="f-descricao" rows="3"></textarea></div>
    `,
    aoConfirmar: async (overlay) => {
      try {
        await criarIdeia({
          titulo: overlay.querySelector('#f-titulo').value.trim(),
          categoria: overlay.querySelector('#f-categoria').value,
          prioridade: overlay.querySelector('#f-prioridade').value,
          descricao: overlay.querySelector('#f-descricao').value.trim(),
        });
        await renderBoard();
        toast.sucesso('Ideia registrada.');
      } catch (e) { toast.erro(e.message); return false; }
    }
  });
}

async function abrirDetalheIdeia(id) {
  const ideias = await listarIdeias();
  const ideia = ideias.find(i => i.id === id);
  if (!ideia) return;

  abrirModal({
    titulo: ideia.titulo, textoConfirmar: 'Fechar',
    conteudoHTML: `
      <p class="text-sm text-secondary">${ideia.categoria} · Prioridade ${ideia.prioridade}</p>
      ${ideia.descricao ? `<p class="text-sm mt-2">${ideia.descricao}</p>` : ''}
      <div class="field mt-4">
        <label>Alterar status</label>
        <select id="select-status">${STATUS.map(s=>`<option value="${s}" ${ideia.status===s?'selected':''}>${s}</option>`).join('')}</select>
      </div>`,
    aoConfirmar: async (overlay) => {
      const novoStatus = overlay.querySelector('#select-status').value;
      if (novoStatus !== ideia.status) {
        await atualizarStatus(ideia.id, novoStatus);
        await renderBoard();
        toast.sucesso('Status atualizado.');
      }
    }
  });
}

async function init() {
  registrarListenersGlobais();
  await renderBoard();
  document.getElementById('btn-nova-ideia').addEventListener('click', abrirFormularioNovaIdeia);
  document.getElementById('filtro-categoria').addEventListener('change', async (e) => {
    filtroAtual.categoria = e.target.value;
    await renderBoard();
  });
}

document.addEventListener('DOMContentLoaded', init);
