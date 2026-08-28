import {
  listarEventos,
  criarEvento,
  atualizarEvento,
  arquivarEvento,
  eventoEstaIncompleto,
  adicionarItemChecklist,
  alternarItemChecklist
} from '../modules/eventos.module.js';

import { listarPessoas } from '../modules/pessoas.module.js';
import { registrarListenersGlobais } from '../core/bootstrap-listeners.js';
import { abrirModal } from '../components/Modal.js';
import { confirmarDialog } from '../components/Dialog.js';
import { toast } from '../components/Toast.js';

const MESES = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
];

async function carregarPessoas() {
  return listarPessoas();
}

function checklistHTML(evento) {
  const itens = evento.checklist || [];

  return `
    <div id="checklist-container">
      ${
        itens.length
          ? itens.map(item => `
              <div
                class="checklist-item ${item.feito ? 'checklist-item--feito' : ''}"
                data-item-id="${item.id}"
              >
                <input
                  type="checkbox"
                  ${item.feito ? 'checked' : ''}
                  class="chk-toggle"
                >
                <span>${item.texto}</span>
              </div>
            `).join('')
          : '<p class="card__empty">Nenhum item ainda.</p>'
      }
    </div>

    <div class="add-item-row">
      <input
        type="text"
        id="novo-item-input"
        placeholder="Adicionar item..."
      >
      <button
        class="btn btn--ghost"
        id="add-item-btn"
      >
        +
      </button>
    </div>
  `;
}

async function renderLista() {
  const container = document.getElementById('eventos-lista');

  if (!container) {
    console.error('[Eventos] Container #eventos-lista não encontrado.');
    return;
  }

  try {
    const eventos = await listarEventos();

    if (!eventos || eventos.length === 0) {
      container.innerHTML =
        '<p class="card__empty">Nenhum evento cadastrado ainda.</p>';
      return;
    }

    container.innerHTML = eventos.map(ev => {
      const data = ev.data
        ? new Date(`${ev.data}T00:00:00`)
        : null;

      return `
        <div class="card evento-card" data-id="${ev.id}">

          <button
            type="button"
            class="card-arquivar-btn"
            data-id="${ev.id}"
            title="Arquivar"
          >
            🗑
          </button>

          <div class="evento-card__data">
            <div class="evento-card__data-dia">
              ${data ? data.getDate() : '?'}
            </div>

            <div class="evento-card__data-mes">
              ${data ? MESES[data.getMonth()] : '—'}
            </div>
          </div>

          <div class="evento-card__info">
            <div class="evento-card__nome">
              ${ev.nome || 'Evento sem nome'}
            </div>

            <div class="text-xs text-secondary">
              ${ev.local || 'Local a definir'}
              ${ev.horario ? ` · ${ev.horario}` : ''}
            </div>

            ${
              eventoEstaIncompleto(ev)
                ? `
                  <div class="evento-card__tag-incompleto">
                    ⚠ Complete os detalhes
                  </div>
                `
                : ''
            }
          </div>

          ${
            ev.origemIdeiaId
              ? '<span class="badge">Vindo do Banco de Ideias</span>'
              : ''
          }

        </div>
      `;
    }).join('');

    container.querySelectorAll('.evento-card').forEach(card => {
      card.addEventListener('click', event => {
        if (event.target.closest('.card-arquivar-btn')) {
          return;
        }

        abrirDetalheEvento(card.dataset.id);
      });
    });

    container.querySelectorAll('.card-arquivar-btn').forEach(btn => {
      btn.addEventListener('click', event => {
        event.stopPropagation();

        confirmarDialog(
          {
            titulo: 'Arquivar evento',
            mensagem: 'O evento sai das listagens, mas nada é perdido.',
            textoConfirmar: 'Arquivar'
          },
          async confirmado => {
            if (!confirmado) return;

            try {
              await arquivarEvento(btn.dataset.id);
              await renderLista();
              toast.sucesso('Evento arquivado.');
            } catch (erro) {
              console.error('[Eventos] Erro ao arquivar:', erro);
              toast.erro(erro.message || 'Não foi possível arquivar o evento.');
            }
          }
        );
      });
    });

  } catch (erro) {
    console.error('[Eventos] Erro ao carregar eventos:', erro);

    container.innerHTML =
      '<p class="card__empty">Não foi possível carregar os eventos.</p>';

    toast.erro(erro.message || 'Não foi possível carregar os eventos.');
  }
}

async function abrirDetalheEvento(id) {
  try {
    const eventos = await listarEventos();
    const evento = eventos.find(e => e.id === id);

    if (!evento) {
      toast.erro('Evento não encontrado.');
      return;
    }

    const pessoas = await carregarPessoas();

    const responsavelOptions = [
      '<option value="">Sem responsável definido</option>',
      ...pessoas.map(p => `
        <option
          value="${p.id}"
          ${p.id === evento.responsavelPessoaId ? 'selected' : ''}
        >
          ${p.nome}
        </option>
      `)
    ].join('');

    abrirModal({
      titulo: evento.nome,

      textoConfirmar: 'Salvar alterações',

      conteudoHTML: `
        <div class="field-row">
          <div class="field">
            <label>Data</label>
            <input
              type="date"
              id="f-data"
              value="${evento.data || ''}"
            >
          </div>

          <div class="field">
            <label>Horário</label>
            <input
              type="time"
              id="f-horario"
              value="${evento.horario || ''}"
            >
          </div>
        </div>

        <div class="field">
          <label>Local</label>
          <input
            type="text"
            id="f-local"
            value="${evento.local || ''}"
            placeholder="Ex: Templo Sede"
          >
        </div>

        <div class="field-row">
          <div class="field">
            <label>Responsável</label>
            <select id="f-responsavel">
              ${responsavelOptions}
            </select>
          </div>

          <div class="field">
            <label>Equipe</label>
            <input
              type="text"
              id="f-equipe"
              value="${evento.equipe || ''}"
              placeholder="Ex: Aspirantes"
            >
          </div>
        </div>

        <div class="field">
          <label>Descrição</label>
          <textarea
            id="f-descricao"
            rows="2"
          >${evento.descricao || ''}</textarea>
        </div>

        <div class="mt-3">
          <h3 class="mb-2">Checklist</h3>
          ${checklistHTML(evento)}
        </div>
      `,

      aoConfirmar: async overlay => {
        try {
          await atualizarEvento(evento.id, {
            data: overlay.querySelector('#f-data').value,
            horario: overlay.querySelector('#f-horario').value,
            local: overlay.querySelector('#f-local').value.trim(),

            responsavelPessoaId:
              overlay.querySelector('#f-responsavel').value || null,

            equipe:
              overlay.querySelector('#f-equipe').value.trim(),

            descricao:
              overlay.querySelector('#f-descricao').value.trim()
          });

          await renderLista();

          toast.sucesso('Evento atualizado.');
        } catch (erro) {
          console.error('[Eventos] Erro ao atualizar:', erro);
          toast.erro(erro.message || 'Não foi possível atualizar o evento.');
          return false;
        }
      }
    });

    setTimeout(() => {
      const overlay = document.getElementById('active-modal');

      if (!overlay) return;

      overlay.addEventListener('change', async event => {
        if (!event.target.classList.contains('chk-toggle')) {
          return;
        }

        const item = event.target.closest('.checklist-item');

        if (!item) return;

        const itemId = item.dataset.itemId;

        if (!itemId) {
          toast.erro(
            'Não foi possível identificar o item do checklist.'
          );
          return;
        }

        try {
          await alternarItemChecklist(
            evento.id,
            itemId
          );

          item.classList.toggle(
            'checklist-item--feito',
            event.target.checked
          );
        } catch (erro) {
          event.target.checked = !event.target.checked;
          toast.erro(
            erro.message || 'Não foi possível alterar o item.'
          );
        }
      });

      const addButton = overlay.querySelector('#add-item-btn');

      if (addButton) {
        addButton.addEventListener('click', async () => {
          const input =
            overlay.querySelector('#novo-item-input');

          if (!input) return;

          const texto = input.value.trim();

          if (!texto) return;

          try {
            const item = await adicionarItemChecklist(
              evento.id,
              texto
            );

            const container =
              overlay.querySelector('#checklist-container');

            if (!container) return;

            const vazio =
              container.querySelector('.card__empty');

            if (vazio) {
              vazio.remove();
            }

            const novo =
              document.createElement('div');

            novo.className = 'checklist-item';
            novo.dataset.itemId = item.id;

            novo.innerHTML = `
              <input
                type="checkbox"
                class="chk-toggle"
              >
              <span>${item.texto}</span>
            `;

            container.appendChild(novo);

            input.value = '';
            input.focus();

            toast.sucesso('Item adicionado.');
          } catch (erro) {
            console.error('[Eventos] Erro ao adicionar checklist:', erro);
            toast.erro(
              erro.message || 'Não foi possível adicionar o item.'
            );
          }
        });
      }
    }, 0);

  } catch (erro) {
    console.error('[Eventos] Erro ao abrir evento:', erro);
    toast.erro(
      erro.message || 'Não foi possível abrir o evento.'
    );
  }
}

async function abrirFormularioNovoEvento() {
  try {
    const pessoas = await carregarPessoas();

    const responsavelOptions = [
      '<option value="">Sem responsável definido</option>',
      ...pessoas.map(p => `
        <option value="${p.id}">
          ${p.nome}
        </option>
      `)
    ].join('');

    abrirModal({
      titulo: 'Novo evento',

      textoConfirmar: 'Criar evento',

      conteudoHTML: `
        <div class="field">
          <label>Nome</label>
          <input
            type="text"
            id="f-nome"
            placeholder="Ex: Culto de Jovens"
          >
        </div>

        <div class="field-row">
          <div class="field">
            <label>Data</label>
            <input
              type="date"
              id="f-data"
            >
          </div>

          <div class="field">
            <label>Horário</label>
            <input
              type="time"
              id="f-horario"
            >
          </div>
        </div>

        <div class="field">
          <label>Local</label>
          <input
            type="text"
            id="f-local"
          >
        </div>

        <div class="field">
          <label>Responsável</label>
          <select id="f-responsavel">
            ${responsavelOptions}
          </select>
        </div>
      `,

      aoConfirmar: async overlay => {
        try {
          const nome =
            overlay.querySelector('#f-nome').value.trim();

          if (!nome) {
            toast.erro('Informe o nome do evento.');
            return false;
          }

          await criarEvento({
            nome,

            data:
              overlay.querySelector('#f-data').value,

            horario:
              overlay.querySelector('#f-horario').value,

            local:
              overlay.querySelector('#f-local').value.trim(),

            responsavelPessoaId:
              overlay.querySelector('#f-responsavel').value || null
          });

          await renderLista();

          toast.sucesso('Evento criado.');
        } catch (erro) {
          console.error('[Eventos] Erro ao criar:', erro);
          toast.erro(
            erro.message || 'Não foi possível criar o evento.'
          );
          return false;
        }
      }
    });

  } catch (erro) {
    console.error('[Eventos] Erro ao abrir formulário:', erro);
    toast.erro(
      erro.message || 'Não foi possível abrir o formulário.'
    );
  }
}

async function init() {
  try {
    registrarListenersGlobais();

    await renderLista();

    const botaoNovo =
      document.getElementById('btn-novo-evento');

    if (!botaoNovo) {
      console.error(
        '[Eventos] Botão #btn-novo-evento não encontrado.'
      );
      return;
    }

    botaoNovo.addEventListener(
      'click',
      abrirFormularioNovoEvento
    );

  } catch (erro) {
    console.error('[Eventos] Erro ao inicializar página:', erro);
  }
}

document.addEventListener(
  'DOMContentLoaded',
  init
);