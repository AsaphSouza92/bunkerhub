import { listarEventos, criarEvento, atualizarEvento, arquivarEvento, eventoEstaIncompleto,
  adicionarItemChecklist, alternarItemChecklist } from '../modules/eventos.module.js';
import { registrarListenersGlobais } from '../core/bootstrap-listeners.js';
import { abrirModal } from '../components/Modal.js';
import { confirmarDialog } from '../components/Dialog.js';
import { toast } from '../components/Toast.js';

const MESES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

function checklistHTML(evento) {
  const itens = evento.checklist || [];
  return `
    <div id="checklist-container">
      ${itens.map(item => `
        <div class="checklist-item ${item.feito ? 'checklist-item--feito' : ''}" data-item-id="${item.id}">
          <input type="checkbox" ${item.feito ? 'checked' : ''} class="chk-toggle">
          <span>${item.texto}</span>
        </div>
      `).join('') || '<p class="card__empty">Nenhum item ainda.</p>'}
    </div>
    <div class="add-item-row">
      <input type="text" id="novo-item-input" placeholder="Adicionar item...">
      <button class="btn btn--ghost" id="add-item-btn">+</button>
    </div>
  `;
}

async function renderLista() {
  const container = document.getElementById('eventos-lista');
  const eventos = await listarEventos();

  if (eventos.length === 0) {
    container.innerHTML = `<p class="card__empty">Nenhum evento cadastrado ainda.</p>`;
    return;
  }

  container.innerHTML = eventos.map(ev => {
    const data = ev.data ? new Date(ev.data + 'T00:00:00') : null;
    return `
      <div class="card evento-card" data-id="${ev.id}">
        <button class="card-arquivar-btn" data-id="${ev.id}" title="Arquivar">🗄</button>
        <div class="evento-card__data">
          <div class="evento-card__data-dia">${data ? data.getDate() : '?'}</div>
          <div class="evento-card__data-mes">${data ? MESES[data.getMonth()] : '—'}</div>
        </div>
        <div class="evento-card__info">
          <div class="evento-card__nome">${ev.nome}</div>
          <div class="text-xs text-secondary">${ev.local || 'Local a definir'} ${ev.horario ? '· ' + ev.horario : ''}</div>
          ${eventoEstaIncompleto(ev) ? `<div class="evento-card__tag-incompleto">⚠ Complete os detalhes</div>` : ''}
        </div>
        ${ev.origemIdeiaId ? `<span class="badge">Vindo do Banco de Ideias</span>` : ''}
      </div>`;
  }).join('');

  container.querySelectorAll('.evento-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-arquivar-btn')) return;
      abrirDetalheEvento(card.dataset.id);
    });
  });

  container.querySelectorAll('.card-arquivar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmarDialog(
        { titulo: 'Arquivar evento', mensagem: 'O evento sai das listagens, mas nada é perdido.', textoConfirmar: 'Arquivar' },
        async (confirmado) => {
          if (confirmado) {
            await arquivarEvento(btn.dataset.id);
            await renderLista();
            toast.sucesso('Evento arquivado.');
          }
        }
      );
    });
  });
}

async function abrirDetalheEvento(id) {
  const eventos = await listarEventos();
  const evento = eventos.find(e => e.id === id);
  if (!evento) return;

  abrirModal({
    titulo: evento.nome,
    textoConfirmar: 'Salvar alterações',
    conteudoHTML: `
      <div class="field-row">
        <div class="field"><label>Data</label><input type="date" id="f-data" value="${evento.data || ''}"></div>
        <div class="field"><label>Horário</label><input type="time" id="f-horario" value="${evento.horario || ''}"></div>
      </div>
      <div class="field"><label>Local</label><input type="text" id="f-local" value="${evento.local || ''}" placeholder="Ex: Templo Sede"></div>
      <div class="field-row">
        <div class="field"><label>Responsável</label><input type="text" id="f-responsavel" value="${evento.responsavel || ''}"></div>
        <div class="field"><label>Equipe</label><input type="text" id="f-equipe" value="${evento.equipe || ''}" placeholder="Ex: Aspirantes"></div>
      </div>
      <div class="field"><label>Descrição</label><textarea id="f-descricao" rows="2">${evento.descricao || ''}</textarea></div>

      <div class="mt-3">
        <h3 class="mb-2">Checklist</h3>
        ${checklistHTML(evento)}
      </div>
    `,
    aoConfirmar: async (overlay) => {
      await atualizarEvento(evento.id, {
        data: overlay.querySelector('#f-data').value,
        horario: overlay.querySelector('#f-horario').value,
        local: overlay.querySelector('#f-local').value.trim(),
        responsavel: overlay.querySelector('#f-responsavel').value.trim(),
        equipe: overlay.querySelector('#f-equipe').value.trim(),
        descricao: overlay.querySelector('#f-descricao').value.trim(),
      });
      await renderLista();
      toast.sucesso('Evento atualizado.');
    }
  });

  setTimeout(() => {
    const overlay = document.getElementById('active-modal');
    if (!overlay) return;

    overlay.addEventListener('change', async (e) => {
      if (e.target.classList.contains('chk-toggle')) {
        const itemId = e.target.closest('.checklist-item').dataset.itemId;
        await alternarItemChecklist(evento.id, itemId);
        e.target.closest('.checklist-item').classList.toggle('checklist-item--feito');
      }
    });

    overlay.querySelector('#add-item-btn')?.addEventListener('click', async () => {
      const input = overlay.querySelector('#novo-item-input');
      if (input.value.trim()) {
        await adicionarItemChecklist(evento.id, input.value.trim());
        const container = overlay.querySelector('#checklist-container');
        const novo = document.createElement('div');
        novo.className = 'checklist-item';
        novo.innerHTML = `<input type="checkbox" class="chk-toggle"><span>${input.value.trim()}</span>`;
        container.appendChild(novo);
        input.value = '';
      }
    });
  }, 0);
}

function abrirFormularioNovoEvento() {
  abrirModal({
    titulo: 'Novo evento',
    textoConfirmar: 'Criar evento',
    conteudoHTML: `
      <div class="field"><label>Nome</label><input type="text" id="f-nome" placeholder="Ex: Culto de Jovens"></div>
      <div class="field-row">
        <div class="field"><label>Data</label><input type="date" id="f-data"></div>
        <div class="field"><label>Horário</label><input type="time" id="f-horario"></div>
      </div>
      <div class="field"><label>Local</label><input type="text" id="f-local"></div>
    `,
    aoConfirmar: async (overlay) => {
      try {
        await criarEvento({
          nome: overlay.querySelector('#f-nome').value.trim(),
          data: overlay.querySelector('#f-data').value,
          horario: overlay.querySelector('#f-horario').value,
          local: overlay.querySelector('#f-local').value.trim(),
        });
        await renderLista();
        toast.sucesso('Evento criado.');
      } catch (e) { toast.erro(e.message); return false; }
    }
  });
}

async function init() {
  registrarListenersGlobais();
  await renderLista();
  document.getElementById('btn-novo-evento').addEventListener('click', abrirFormularioNovoEvento);
}

document.addEventListener('DOMContentLoaded', init);
