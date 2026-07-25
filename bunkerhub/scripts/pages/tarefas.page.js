import { listarTarefas, criarTarefa, atualizarTarefa, alternarConclusao, arquivarTarefa, tarefaEstaAtrasada } from '../modules/tarefas.module.js';
import { abrirModal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';

let filtroAtivo = 'minhas';

function formatarPrazo(prazo) {
  if (!prazo) return '';
  return new Date(prazo + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getOpcoesFiltro() {
  switch (filtroAtivo) {
    case 'minhas': return { apenasMinhas: true };
    case 'pendentes': return { apenasPendentes: true };
    default: return {};
  }
}

async function renderLista() {
  const container = document.getElementById('tarefas-lista');
  const tarefas = await listarTarefas(getOpcoesFiltro());

  if (tarefas.length === 0) {
    container.innerHTML = `<p class="card__empty">Nenhuma tarefa por aqui. Tudo em dia 🙌</p>`;
    return;
  }

  container.innerHTML = tarefas.map(t => {
    const atrasada = tarefaEstaAtrasada(t);
    return `
      <div class="card tarefa-item ${t.concluida ? 'tarefa-item--concluida' : ''}" data-id="${t.id}">
        <input type="checkbox" class="chk-concluir" ${t.concluida ? 'checked' : ''}>
        <div class="tarefa-item__info">
          <div class="tarefa-item__titulo">${t.titulo}</div>
          ${t.prazo ? `<div class="tarefa-item__prazo ${atrasada ? 'tarefa-item__prazo--atrasado' : ''}">${atrasada ? '⚠ Atrasada · ' : ''}${formatarPrazo(t.prazo)}</div>` : ''}
        </div>
        <button class="tarefa-item__excluir" title="Arquivar">✕</button>
      </div>`;
  }).join('');

  container.querySelectorAll('.chk-concluir').forEach(chk => {
    chk.addEventListener('change', async (e) => {
      await alternarConclusao(e.target.closest('.tarefa-item').dataset.id);
      await renderLista();
    });
  });
  container.querySelectorAll('.tarefa-item__excluir').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      await arquivarTarefa(e.target.closest('.tarefa-item').dataset.id);
      await renderLista();
      toast.sucesso('Tarefa arquivada.');
    });
  });
}

function abrirFormularioNovaTarefa() {
  abrirModal({
    titulo: 'Nova tarefa', textoConfirmar: 'Criar tarefa',
    conteudoHTML: `
      <div class="field"><label>O que precisa ser feito?</label><input type="text" id="f-titulo"></div>
      <div class="field-row">
        <div class="field"><label>Prazo</label><input type="date" id="f-prazo"></div>
        <div class="field"><label>Prioridade</label><select id="f-prioridade">${['Baixa','Média','Alta'].map(p=>`<option value="${p}" ${p==='Média'?'selected':''}>${p}</option>`).join('')}</select></div>
      </div>`,
    aoConfirmar: async (overlay) => {
      try {
        await criarTarefa({
          titulo: overlay.querySelector('#f-titulo').value.trim(),
          prazo: overlay.querySelector('#f-prazo').value,
          prioridade: overlay.querySelector('#f-prioridade').value,
        });
        await renderLista();
        toast.sucesso('Tarefa criada.');
      } catch (e) { toast.erro(e.message); return false; }
    }
  });
}

function setupFiltros() {
  document.querySelectorAll('.tarefas-toolbar button').forEach(btn => {
    btn.addEventListener('click', async () => {
      filtroAtivo = btn.dataset.filtro;
      document.querySelectorAll('.tarefas-toolbar button').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      await renderLista();
    });
  });
}

async function init() {
  await renderLista();
  setupFiltros();
  document.getElementById('btn-nova-tarefa').addEventListener('click', abrirFormularioNovaTarefa);
}

document.addEventListener('DOMContentLoaded', init);
