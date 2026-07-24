import { getItensDoMes } from '../modules/calendario.module.js';
import { abrirModal } from '../components/Modal.js';

const MESES_NOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
let anoAtual = new Date().getFullYear();
let mesAtual = new Date().getMonth();

async function renderCalendario() {
  document.getElementById('mes-titulo').textContent = `${MESES_NOME[mesAtual]} ${anoAtual}`;

  const itensPorDia = await getItensDoMes(anoAtual, mesAtual);
  const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();
  const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const hojeStr = new Date().toISOString().slice(0, 10);

  const grid = document.getElementById('calendario-grid');
  let html = DIAS_SEMANA.map(d => `<div class="calendario-dia-nome">${d}</div>`).join('');

  for (let i = 0; i < primeiroDiaSemana; i++) {
    html += `<div class="calendario-celula calendario-celula--vazia"></div>`;
  }

  for (let dia = 1; dia <= totalDias; dia++) {
    const dataStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const itens = itensPorDia[dataStr] || [];
    const ehHoje = dataStr === hojeStr;

    html += `
      <div class="calendario-celula ${ehHoje ? 'calendario-celula--hoje' : ''} ${itens.length ? 'tem-itens' : ''}" data-data="${dataStr}">
        <div class="calendario-celula__numero">${dia}</div>
        ${itens.map(item => `
          <div class="calendario-item ${item.tipo === 'aniversario' ? 'calendario-item--aniversario' : ''}">${item.titulo}</div>
        `).join('')}
      </div>
    `;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.calendario-celula[data-data]').forEach(cel => {
    cel.addEventListener('click', () => abrirResumoDia(cel.dataset.data, itensPorDia[cel.dataset.data] || []));
  });
}

function abrirResumoDia(data, itens) {
  const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  abrirModal({
    titulo: dataFormatada,
    textoConfirmar: 'Fechar',
    conteudoHTML: itens.length
      ? itens.map(i => `<div class="list-item"><span>${i.titulo}</span><span class="text-xs text-secondary">${i.tipo}</span></div>`).join('')
      : `<p class="card__empty">Nada agendado para este dia.</p>`,
    aoConfirmar: () => {}
  });
}

async function init() {
  await renderCalendario();

  document.getElementById('mes-anterior').addEventListener('click', async () => {
    mesAtual--;
    if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
    await renderCalendario();
  });

  document.getElementById('mes-proximo').addEventListener('click', async () => {
    mesAtual++;
    if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
    await renderCalendario();
  });
}

document.addEventListener('DOMContentLoaded', init);
