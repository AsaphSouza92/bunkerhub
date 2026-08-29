import { getItensDoMes } from '../modules/calendario.module.js';
import {
  criarEvento,
  atualizarEvento
} from '../modules/eventos.module.js';
import { listarPessoas } from '../modules/pessoas.module.js';
import { abrirModal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';

const MESES_NOME = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

const DIAS_SEMANA = [
  'DOM',
  'SEG',
  'TER',
  'QUA',
  'QUI',
  'SEX',
  'SAB'
];

let anoAtual = new Date().getFullYear();
let mesAtual = new Date().getMonth();

async function renderCalendario() {
  const titulo = document.getElementById('mes-titulo');
  const grid = document.getElementById('calendario-grid');

  if (!titulo || !grid) {
    console.error('[Calendario] Elementos principais nao encontrados.');
    return;
  }

  titulo.textContent = `${MESES_NOME[mesAtual]} ${anoAtual}`;

  try {
    const itensPorDia = await getItensDoMes(anoAtual, mesAtual);

    const hoje = new Date();

    const hojeStr =
      `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const primeiroDiaSemana =
      new Date(anoAtual, mesAtual, 1).getDay();

    const totalDias =
      new Date(anoAtual, mesAtual + 1, 0).getDate();

    let html = DIAS_SEMANA
      .map(dia => `<div class="calendario-dia-nome">${dia}</div>`)
      .join('');

    for (let i = 0; i < primeiroDiaSemana; i++) {
      html += `
        <div class="calendario-celula calendario-celula--vazia"></div>
      `;
    }

    for (let dia = 1; dia <= totalDias; dia++) {
      const dataStr =
        `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

      const itens = itensPorDia[dataStr] || [];
      const ehHoje = dataStr === hojeStr;

      html += `
        <div
          class="calendario-celula
            ${ehHoje ? 'calendario-celula--hoje' : ''}
            ${itens.length ? 'tem-itens' : ''}"
          data-data="${dataStr}"
        >
          <div class="calendario-celula__numero">
            ${dia}
          </div>

          ${itens.map(item => `
            <div
              class="calendario-item
                ${item.tipo === 'aniversario'
                  ? 'calendario-item--aniversario'
                  : ''}"
              data-tipo="${item.tipo}"
              data-id="${item.ref?.id || ''}"
            >
              ${item.titulo}
            </div>
          `).join('')}
        </div>
      `;
    }

    grid.innerHTML = html;

    grid
      .querySelectorAll('.calendario-celula[data-data]')
      .forEach(celula => {
        celula.addEventListener('click', evento => {
          const itemClicado =
            evento.target.closest('.calendario-item');

          if (itemClicado) {
            const tipo = itemClicado.dataset.tipo;
            const id = itemClicado.dataset.id;

            if (tipo === 'evento' && id) {
              const itens =
                itensPorDia[celula.dataset.data] || [];

              const item = itens.find(
                itemAtual =>
                  itemAtual.tipo === 'evento' &&
                  String(itemAtual.ref?.id) === String(id)
              );

              if (item?.ref) {
                abrirEdicaoEvento(item.ref);
              }

              return;
            }
          }

          abrirResumoDia(
            celula.dataset.data,
            itensPorDia[celula.dataset.data] || []
          );
        });
      });

  } catch (erro) {
    console.error(
      '[Calendario] Erro ao carregar calendario:',
      erro
    );

    grid.innerHTML = `
      <p class="card__empty">
        Nao foi possivel carregar o calendario.
      </p>
    `;

    toast.erro(erro.message);
  }
}

function formatarData(data) {
  return new Date(
    `${data}T00:00:00`
  ).toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }
  );
}

async function abrirResumoDia(data, itens) {
  const eventos = itens.filter(
    item => item.tipo === 'evento'
  );

  const aniversarios = itens.filter(
    item => item.tipo === 'aniversario'
  );

  abrirModal({
    titulo: formatarData(data),

    textoConfirmar: 'Fechar',

    conteudoHTML: `
      ${
        eventos.length
          ? `
            <div class="mb-3">
              <h3 class="mb-2">Eventos</h3>

              ${eventos.map(item => `
                <div
                  class="list-item calendario-resumo-item"
                  data-evento-id="${item.ref?.id || ''}"
                >
                  <span>${item.titulo}</span>

                  <span class="text-xs text-secondary">
                    ${item.ref?.horario || 'Sem horario'}
                  </span>
                </div>
              `).join('')}
            </div>
          `
          : ''
      }

      ${
        aniversarios.length
          ? `
            <div class="mb-3">
              <h3 class="mb-2">Aniversarios</h3>

              ${aniversarios.map(item => `
                <div class="list-item">
                  <span>${item.titulo}</span>

                  <span class="text-xs text-secondary">
                    Aniversario
                  </span>
                </div>
              `).join('')}
            </div>
          `
          : ''
      }

      ${
        !itens.length
          ? `
            <p class="card__empty">
              Nada agendado para este dia.
            </p>
          `
          : ''
      }

      <div class="mt-3">
        <button
          type="button"
          class="btn btn--primary"
          id="btn-agendar-dia"
        >
          + Agendar evento
        </button>
      </div>
    `,

    aoConfirmar: () => {}
  });

  setTimeout(() => {
    const botao =
      document.getElementById('btn-agendar-dia');

    if (botao) {
      botao.addEventListener(
        'click',
        () => abrirFormularioNovoEvento(data)
      );
    }

    document
      .querySelectorAll('.calendario-resumo-item')
      .forEach(item => {
        item.addEventListener('click', () => {
          const eventoId =
            item.dataset.eventoId;

          const evento =
            eventos.find(
              eventoAtual =>
                String(eventoAtual.ref?.id) ===
                String(eventoId)
            );

          if (evento?.ref) {
            abrirEdicaoEvento(evento.ref);
          }
        });
      });
  }, 0);
}

async function carregarPessoas() {
  return listarPessoas();
}

async function abrirFormularioNovoEvento(dataInicial = '') {
  const pessoas = await carregarPessoas();

  const responsavelOptions = [
    '<option value="">Sem responsavel definido</option>',
    ...pessoas.map(pessoa => `
      <option value="${pessoa.id}">
        ${pessoa.nome}
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
            value="${dataInicial}"
          >
        </div>

        <div class="field">
          <label>Horario</label>

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
          placeholder="Ex: Templo Sede"
        >
      </div>

      <div class="field">
        <label>Responsavel</label>

        <select id="f-responsavel">
          ${responsavelOptions}
        </select>
      </div>
    `,

    aoConfirmar: async overlay => {
      try {
        await criarEvento({
          nome:
            overlay
              .querySelector('#f-nome')
              .value
              .trim(),

          data:
            overlay
              .querySelector('#f-data')
              .value,

          horario:
            overlay
              .querySelector('#f-horario')
              .value,

          local:
            overlay
              .querySelector('#f-local')
              .value
              .trim(),

          responsavelPessoaId:
            overlay
              .querySelector('#f-responsavel')
              .value || null
        });

        await renderCalendario();

        toast.sucesso('Evento criado.');
      } catch (erro) {
        toast.erro(erro.message);
        return false;
      }
    }
  });
}

async function abrirEdicaoEvento(evento) {
  const pessoas = await carregarPessoas();

  const responsavelOptions = [
    '<option value="">Sem responsavel definido</option>',
    ...pessoas.map(pessoa => `
      <option
        value="${pessoa.id}"
        ${String(pessoa.id) === String(evento.responsavelPessoaId)
          ? 'selected'
          : ''}
      >
        ${pessoa.nome}
      </option>
    `)
  ].join('');

  abrirModal({
    titulo: evento.nome,

    textoConfirmar: 'Salvar alteracoes',

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
          <label>Horario</label>

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
        >
      </div>

      <div class="field">
        <label>Responsavel</label>

        <select id="f-responsavel">
          ${responsavelOptions}
        </select>
      </div>

      <div class="field">
        <label>Descricao</label>

        <textarea
          id="f-descricao"
          rows="3"
        >${evento.descricao || ''}</textarea>
      </div>
    `,

    aoConfirmar: async overlay => {
      try {
        await atualizarEvento(
          evento.id,
          {
            data:
              overlay
                .querySelector('#f-data')
                .value,

            horario:
              overlay
                .querySelector('#f-horario')
                .value,

            local:
              overlay
                .querySelector('#f-local')
                .value
                .trim(),

            responsavelPessoaId:
              overlay
                .querySelector('#f-responsavel')
                .value || null,

            descricao:
              overlay
                .querySelector('#f-descricao')
                .value
                .trim()
          }
        );

        await renderCalendario();

        toast.sucesso('Evento atualizado.');
      } catch (erro) {
        toast.erro(erro.message);
        return false;
      }
    }
  });
}

async function init() {
  await renderCalendario();

  const anterior =
    document.getElementById('mes-anterior');

  const proximo =
    document.getElementById('mes-proximo');

  anterior?.addEventListener(
    'click',
    async () => {
      mesAtual--;

      if (mesAtual < 0) {
        mesAtual = 11;
        anoAtual--;
      }

      await renderCalendario();
    }
  );

  proximo?.addEventListener(
    'click',
    async () => {
      mesAtual++;

      if (mesAtual > 11) {
        mesAtual = 0;
        anoAtual++;
      }

      await renderCalendario();
    }
  );
}

document.addEventListener(
  'DOMContentLoaded',
  init
);