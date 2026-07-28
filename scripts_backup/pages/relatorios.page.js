import { listarRelatorios, eventosSemRelatorio, criarRelatorio, atualizarRelatorio, arquivarRelatorio } from '../modules/relatorios.module.js';
import { abrirModal } from '../components/Modal.js';
import { confirmarDialog } from '../components/Dialog.js';
import { toast } from '../components/Toast.js';

async function renderLista() {
  const container = document.getElementById('relatorios-lista');
  const relatorios = await listarRelatorios();

  if (relatorios.length === 0) {
    container.innerHTML = `<p class="card__empty">Nenhum relatório registrado ainda.</p>`;
    return;
  }

  container.innerHTML = relatorios.map(r => `
    <div class="card relatorio-card" data-id="${r.id}">
      <button class="card-arquivar-btn" data-id="${r.id}" title="Arquivar">🗄</button>
      <div class="relatorio-card__header">
        <div>
          <div class="relatorio-card__evento">${r.evento?.nome || 'Evento removido'}</div>
          <div class="relatorio-card__data">${r.data}</div>
        </div>
      </div>
      <div class="relatorio-card__stats">
        <div class="relatorio-stat"><strong>${r.participantes}</strong>participantes</div>
        <div class="relatorio-stat"><strong>${r.visitantes}</strong>visitantes</div>
      </div>
      ${r.resumo ? `<div class="relatorio-card__resumo">${r.resumo}</div>` : ''}
    </div>`).join('');

  container.querySelectorAll('.relatorio-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-arquivar-btn')) return;
      abrirDetalheRelatorio(card.dataset.id);
    });
  });

  container.querySelectorAll('.card-arquivar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmarDialog(
        { titulo: 'Arquivar relatório', mensagem: 'O relatório sai das listagens, mas nada é perdido.', textoConfirmar: 'Arquivar' },
        async (confirmado) => {
          if (confirmado) {
            await arquivarRelatorio(btn.dataset.id);
            await renderLista();
            toast.sucesso('Relatório arquivado.');
          }
        }
      );
    });
  });
}

async function abrirDetalheRelatorio(id) {
  const relatorios = await listarRelatorios();
  const relatorio = relatorios.find(r => r.id === id);
  if (!relatorio) return;

  abrirModal({
    titulo: relatorio.evento?.nome || 'Relatório', textoConfirmar: 'Salvar alterações',
    conteudoHTML: `
      <div class="field-numeros">
        <div class="field"><label>Participantes</label><input type="number" id="f-participantes" value="${relatorio.participantes}" min="0"></div>
        <div class="field"><label>Visitantes</label><input type="number" id="f-visitantes" value="${relatorio.visitantes}" min="0"></div>
      </div>
      <div class="field"><label>Resumo</label><textarea id="f-resumo" rows="2">${relatorio.resumo}</textarea></div>
      <div class="field"><label>Pontos positivos</label><textarea id="f-positivos" rows="2">${relatorio.pontosPositivos}</textarea></div>
      <div class="field"><label>Pontos de melhoria</label><textarea id="f-melhoria" rows="2">${relatorio.pontosMelhoria}</textarea></div>
      <div class="field"><label>Próximas ações</label><textarea id="f-acoes" rows="2">${relatorio.proximasAcoes}</textarea></div>
    `,
    aoConfirmar: async (overlay) => {
      await atualizarRelatorio(relatorio.id, {
        participantes: Number(overlay.querySelector('#f-participantes').value) || 0,
        visitantes: Number(overlay.querySelector('#f-visitantes').value) || 0,
        resumo: overlay.querySelector('#f-resumo').value.trim(),
        pontosPositivos: overlay.querySelector('#f-positivos').value.trim(),
        pontosMelhoria: overlay.querySelector('#f-melhoria').value.trim(),
        proximasAcoes: overlay.querySelector('#f-acoes').value.trim(),
      });
      await renderLista();
      toast.sucesso('Relatório atualizado.');
    }
  });
}

async function abrirFormularioNovoRelatorio() {
  const eventosDisponiveis = await eventosSemRelatorio();
  if (eventosDisponiveis.length === 0) {
    toast.info('Todos os eventos já realizados possuem relatório, ou não há eventos passados ainda.');
    return;
  }

  abrirModal({
    titulo: 'Novo relatório', textoConfirmar: 'Criar relatório',
    conteudoHTML: `
      <div class="field"><label>Evento</label><select id="f-evento">${eventosDisponiveis.map(e=>`<option value="${e.id}">${e.nome} · ${e.data}</option>`).join('')}</select></div>
      <div class="field-numeros">
        <div class="field"><label>Participantes</label><input type="number" id="f-participantes" value="0" min="0"></div>
        <div class="field"><label>Visitantes</label><input type="number" id="f-visitantes" value="0" min="0"></div>
      </div>
      <div class="field"><label>Resumo</label><textarea id="f-resumo" rows="2"></textarea></div>
      <div class="field"><label>Pontos positivos</label><textarea id="f-positivos" rows="2"></textarea></div>
      <div class="field"><label>Pontos de melhoria</label><textarea id="f-melhoria" rows="2"></textarea></div>
      <div class="field"><label>Próximas ações</label><textarea id="f-acoes" rows="2"></textarea></div>
    `,
    aoConfirmar: async (overlay) => {
      try {
        await criarRelatorio({
          eventoId: overlay.querySelector('#f-evento').value,
          participantes: Number(overlay.querySelector('#f-participantes').value) || 0,
          visitantes: Number(overlay.querySelector('#f-visitantes').value) || 0,
          resumo: overlay.querySelector('#f-resumo').value.trim(),
          pontosPositivos: overlay.querySelector('#f-positivos').value.trim(),
          pontosMelhoria: overlay.querySelector('#f-melhoria').value.trim(),
          proximasAcoes: overlay.querySelector('#f-acoes').value.trim(),
        });
        await renderLista();
        toast.sucesso('Relatório criado.');
      } catch (e) { toast.erro(e.message); return false; }
    }
  });
}

async function init() {
  await renderLista();
  document.getElementById('btn-novo-relatorio').addEventListener('click', abrirFormularioNovoRelatorio);
}

document.addEventListener('DOMContentLoaded', init);
