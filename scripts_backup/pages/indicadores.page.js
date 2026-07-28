import { getIndicadores, getSerieParticipacao } from '../modules/indicadores.module.js';

const LABELS = {
  jovensAtivos: 'Jovens ativos',
  visitantesTotais: 'Visitantes',
  eventosRealizados: 'Eventos realizados',
  participacaoMedia: 'Participação média',
  novosJovens: 'Novos jovens (30 dias)',
  equipesAtivas: 'Equipes ativas',
};

async function renderIndicadores() {
  const dados = await getIndicadores();
  const grid = document.getElementById('indicadores-grid');

  grid.innerHTML = Object.entries(dados).map(([chave, valor]) => `
    <div class="card indicador-card">
      <div class="indicador-card__valor">${valor}</div>
      <div class="indicador-card__label">${LABELS[chave] || chave}</div>
    </div>
  `).join('');
}

async function renderGrafico() {
  const serie = await getSerieParticipacao(6);
  const container = document.getElementById('grafico-participacao');

  if (serie.length === 0) {
    container.innerHTML = `<p class="card__empty">Ainda não há relatórios suficientes para gerar o gráfico.</p>`;
    return;
  }

  const maxValor = Math.max(...serie.map(s => s.participantes), 1);

  container.innerHTML = serie.map(s => {
    const alturaPct = Math.max((s.participantes / maxValor) * 100, 4);
    return `
      <div class="grafico-barra-wrap">
        <span class="grafico-valor">${s.participantes}</span>
        <div class="grafico-barra" style="height:${alturaPct}%;"></div>
        <span class="grafico-label">${s.label}</span>
      </div>
    `;
  }).join('');
}

async function init() {
  await renderIndicadores();
  await renderGrafico();
}

document.addEventListener('DOMContentLoaded', init);
