import { seedDatabase } from '../data/db.seed.js';
import { DB_PROVIDER } from '../data/db.config.js';
import { getDashboardData } from '../modules/dashboard.module.js';
import { rodarMigracoes } from './migrations.js';
import { getState } from './store.js';
import { exigirLogin } from '../auth/auth.module.js';

// Verifica se o usuário atual possui uma permissão específica.
export function can(permissaoChave) {
  const state = getState();

  const permissoes = state.usuarioAtual?.permissoes || [];

  // Administrador possui acesso total.
  if (state.igrejaAtual?.papel === 'administrador') {
    return true;
  }

  return permissoes.includes(permissaoChave);
}

function formatarData(dataStr) {
  if (!dataStr) return '';

  const [ano, mes, dia] = String(dataStr).split('-').map(Number);

  if (!ano || !mes || !dia) return '';

  const d = new Date(ano, mes - 1, dia);

  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

async function renderDashboard() {
  const data = await getDashboardData();

  const versiculoEl = document.getElementById('widget-versiculo');

  if (versiculoEl) {
    versiculoEl.innerHTML = data.versiculo
      ? `
        <p class="text-sm" style="font-style: italic;">
          "${data.versiculo.texto}"
        </p>
        <p class="text-xs text-secondary mt-2">
          — ${data.versiculo.referencia}
        </p>
      `
      : `
        <p class="card__empty">
          Nenhum versículo cadastrado.
        </p>
      `;
  }

  const eventoEl = document.getElementById('widget-evento');

  if (eventoEl) {
    eventoEl.innerHTML = data.proximoEvento
      ? `
        <div class="list-item">
          <div>
            <div>${data.proximoEvento.nome}</div>

            <div class="text-xs text-muted">
              ${data.proximoEvento.local || 'Local não informado'}
              ${
                data.proximoEvento.horario
                  ? ` · ${data.proximoEvento.horario}`
                  : ''
              }
            </div>
          </div>

          <span class="badge">
            ${formatarData(data.proximoEvento.data)}
          </span>
        </div>
      `
      : `
        <p class="card__empty">
          Nenhum evento futuro agendado.
        </p>
      `;
  }

  const aniversEl = document.getElementById('widget-aniversarios');

  if (aniversEl) {
    aniversEl.innerHTML = data.aniversariantes.length
      ? data.aniversariantes
          .map(
            p => `
              <div class="list-item">
                <span>${p.nome}</span>

                <span class="text-xs text-secondary">
                  ${p.diaAniversario}
                </span>
              </div>
            `
          )
          .join('')
      : `
        <p class="card__empty">
          Nenhum aniversariante neste mês.
        </p>
      `;
  }

  const tarefasEl = document.getElementById('widget-tarefas');

  if (tarefasEl) {
    tarefasEl.innerHTML = data.tarefasPendentes.length
      ? data.tarefasPendentes
          .map(
            t => `
              <div class="list-item">
                <span>${t.titulo}</span>
              </div>
            `
          )
          .join('')
      : `
        <p class="card__empty">
          Tudo em dia por aqui 🙌
        </p>
      `;
  }
}

async function init() {
  try {
    rodarMigracoes();

    if (DB_PROVIDER === 'supabase') {
      const autorizado = await exigirLogin();

      if (!autorizado) {
        return;
      }
    }

    if (DB_PROVIDER === 'localStorage') {
      await seedDatabase();
    }

    const state = getState();

    console.log('[BunkerHub] Dashboard iniciado.');
    console.log('[BunkerHub] Usuário:', state.usuarioAtual);
    console.log('[BunkerHub] Igreja:', state.igrejaAtual);

    await renderDashboard();
  } catch (erro) {
    console.error('[BunkerHub] Erro ao iniciar Dashboard:', erro);

    const elementos = [
      'widget-versiculo',
      'widget-evento',
      'widget-aniversarios',
      'widget-tarefas',
    ];

    elementos.forEach(id => {
      const elemento = document.getElementById(id);

      if (elemento) {
        elemento.innerHTML = `
          <p class="card__empty">
            Não foi possível carregar este conteúdo.
          </p>
        `;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', init);