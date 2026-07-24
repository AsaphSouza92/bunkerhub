import { seedDatabase } from '../data/db.seed.js';
import { getDashboardData } from '../modules/dashboard.module.js';
import { rodarMigracoes } from './migrations.js';

function formatarData(dataStr) {
  const d = new Date(dataStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

async function renderDashboard() {
  const data = await getDashboardData();

  const versiculoEl = document.getElementById('widget-versiculo');
  versiculoEl.innerHTML = data.versiculo
    ? `<p class="text-sm" style="font-style: italic;">"${data.versiculo.texto}"</p>
       <p class="text-xs text-secondary mt-2">— ${data.versiculo.referencia}</p>`
    : `<p class="card__empty">Nenhum versículo cadastrado.</p>`;

  const eventoEl = document.getElementById('widget-evento');
  eventoEl.innerHTML = data.proximoEvento
    ? `<div class="list-item">
         <div><div>${data.proximoEvento.nome}</div>
         <div class="text-xs text-muted">${data.proximoEvento.local} · ${data.proximoEvento.horario}</div></div>
         <span class="badge">${formatarData(data.proximoEvento.data)}</span>
       </div>`
    : `<p class="card__empty">Nenhum evento agendado.</p>`;

  const aniversEl = document.getElementById('widget-aniversarios');
  aniversEl.innerHTML = data.aniversariantes.length
    ? data.aniversariantes.map(p => `
        <div class="list-item"><span>${p.nome}</span>
        <span class="text-xs text-secondary">${p.proximaData.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span></div>`).join('')
    : `<p class="card__empty">Sem aniversários próximos.</p>`;

  const tarefasEl = document.getElementById('widget-tarefas');
  tarefasEl.innerHTML = data.tarefasPendentes.length
    ? data.tarefasPendentes.map(t => `<div class="list-item"><span>${t.titulo}</span></div>`).join('')
    : `<p class="card__empty">Tudo em dia por aqui 🙌</p>`;
}

async function init() {
  rodarMigracoes();
  await seedDatabase();
  await renderDashboard();
}

document.addEventListener('DOMContentLoaded', init);
