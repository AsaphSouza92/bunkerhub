import { listarPessoas, salvarPessoa, arquivarPessoa, registrarAcompanhamento } from '../modules/pessoas.module.js';
import { abrirModal } from '../components/Modal.js';
import { confirmarDialog } from '../components/Dialog.js';
import { toast } from '../components/Toast.js';

let filtroAtual = { busca: '', funcao: '' };

function diasParaAcompanhamento(dataStr) {
  if (!dataStr) return null;
  const hoje = new Date().setHours(0,0,0,0);
  const alvo = new Date(dataStr + 'T00:00:00').getTime();
  return Math.round((alvo - hoje) / 86400000);
}

function formularioPessoaHTML(pessoa = {}) {
  return `
    <div class="field">
      <label>Nome completo</label>
      <input type="text" id="f-nome" value="${pessoa.nome || ''}" placeholder="Ex: João Silva">
    </div>
    <div class="field-row">
      <div class="field">
        <label>Telefone</label>
        <input type="text" id="f-telefone" value="${pessoa.telefone || ''}" placeholder="(21) 90000-0000">
      </div>
      <div class="field">
        <label>Nascimento</label>
        <input type="date" id="f-nascimento" value="${pessoa.nascimento || ''}">
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Função</label>
        <select id="f-funcao">
          ${['', 'Jovem', 'Líder de Célula', 'Aspirante', 'Visitante'].map(f =>
            `<option value="${f}" ${pessoa.funcao === f ? 'selected' : ''}>${f || 'Selecione'}</option>`
          ).join('')}
        </select>
      </div>
      <div class="field">
        <label>Ministério</label>
        <input type="text" id="f-ministerio" value="${pessoa.ministerio || ''}" placeholder="Ex: Louvor">
      </div>
    </div>
    <div class="field">
      <label>Próximo acompanhamento</label>
      <input type="date" id="f-acompanhamento" value="${pessoa.proximoAcompanhamento || ''}">
    </div>
    <div class="field">
      <label>Observações</label>
      <textarea id="f-observacoes" rows="3" placeholder="Notas gerais sobre a pessoa...">${pessoa.observacoes || ''}</textarea>
    </div>
  `;
}

function lerFormulario(overlay) {
  return {
    nome: overlay.querySelector('#f-nome').value.trim(),
    telefone: overlay.querySelector('#f-telefone').value.trim(),
    nascimento: overlay.querySelector('#f-nascimento').value,
    funcao: overlay.querySelector('#f-funcao').value,
    ministerio: overlay.querySelector('#f-ministerio').value.trim(),
    proximoAcompanhamento: overlay.querySelector('#f-acompanhamento').value,
    observacoes: overlay.querySelector('#f-observacoes').value.trim(),
  };
}

async function renderLista() {
  const grid = document.getElementById('pessoas-grid');
  const pessoas = await listarPessoas(filtroAtual);

  if (pessoas.length === 0) {
    grid.innerHTML = `<p class="card__empty">Nenhuma pessoa encontrada.</p>`;
    return;
  }

  grid.innerHTML = pessoas.map(p => {
    const dias = diasParaAcompanhamento(p.proximoAcompanhamento);
    const alerta = dias !== null && dias <= 0
      ? `<div class="pessoa-card__alerta">⚠ Acompanhamento pendente</div>`
      : dias !== null
        ? `<div class="text-xs text-secondary mt-2">Próximo acompanhamento em ${dias}d</div>`
        : '';

    return `
      <div class="card pessoa-card" data-id="${p.id}">
        <button class="card-arquivar-btn" data-id="${p.id}" title="Arquivar">🗄</button>
        <div class="pessoa-card__nome">${p.nome}</div>
        <div class="pessoa-card__meta text-xs text-secondary">
          <span>${p.funcao || 'Sem função definida'}</span>
          ${p.telefone ? `<span>${p.telefone}</span>` : ''}
        </div>
        ${alerta}
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.pessoa-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-arquivar-btn')) return;
      abrirDetalhePessoa(card.dataset.id);
    });
  });

  grid.querySelectorAll('.card-arquivar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmarDialog(
        { titulo: 'Arquivar pessoa', mensagem: 'A pessoa sai das listagens, mas nada é perdido — pode reativar em Configurações.', textoConfirmar: 'Arquivar' },
        async (confirmado) => {
          if (confirmado) {
            await arquivarPessoa(btn.dataset.id);
            await renderLista();
            toast.sucesso('Pessoa arquivada.');
          }
        }
      );
    });
  });
}

function abrirFormularioNovo() {
  abrirModal({
    titulo: 'Nova pessoa',
    conteudoHTML: formularioPessoaHTML(),
    textoConfirmar: 'Cadastrar',
    aoConfirmar: async (overlay) => {
      const dados = lerFormulario(overlay);
      try {
        await salvarPessoa(dados);
        await renderLista();
        toast.sucesso('Pessoa cadastrada com sucesso.');
      } catch (e) {
        toast.erro(e.message);
        return false;
      }
    }
  });
}

function abrirFormularioEdicao(pessoa) {
  abrirModal({
    titulo: `Editar ${pessoa.nome}`,
    conteudoHTML: formularioPessoaHTML(pessoa),
    textoConfirmar: 'Salvar alterações',
    aoConfirmar: async (overlay) => {
      const dados = lerFormulario(overlay);
      try {
        await salvarPessoa(dados, pessoa.id);
        await renderLista();
        toast.sucesso('Dados atualizados.');
      } catch (e) {
        toast.erro(e.message);
        return false;
      }
    }
  });
}

async function abrirDetalhePessoa(id) {
  const pessoas = await listarPessoas();
  const pessoa = pessoas.find(p => p.id === id);
  if (!pessoa) return;

  const historicoHTML = (pessoa.historico || []).length
    ? pessoa.historico.map(h => `<div class="list-item"><span>${h.texto}</span><span class="text-xs text-muted">${h.data}</span></div>`).join('')
    : `<p class="card__empty">Nenhum registro de acompanhamento ainda.</p>`;

  abrirModal({
    titulo: pessoa.nome,
    textoConfirmar: 'Registrar acompanhamento',
    conteudoHTML: `
      <button class="btn btn--ghost w-full mb-3" id="btn-editar-dados-pessoa">✎ Editar dados básicos</button>
      <div class="text-sm text-secondary">${pessoa.funcao || 'Sem função'} ${pessoa.ministerio ? '· ' + pessoa.ministerio : ''}</div>
      ${pessoa.observacoes ? `<p class="text-sm mt-2">${pessoa.observacoes}</p>` : ''}

      <div class="mt-4">
        <h3 class="mb-2">Histórico de acompanhamento</h3>
        ${historicoHTML}
      </div>

      <div class="field mt-4">
        <label>Registrar novo acompanhamento</label>
        <textarea id="nova-nota" rows="2" placeholder="Ex: Conversamos sobre..."></textarea>
      </div>
      <div class="field">
        <label>Próximo acompanhamento</label>
        <input type="date" id="nova-data" value="${pessoa.proximoAcompanhamento || ''}">
      </div>
    `,
    aoConfirmar: async (overlay) => {
      const nota = overlay.querySelector('#nova-nota').value.trim();
      const novaData = overlay.querySelector('#nova-data').value;
      if (nota) {
        await registrarAcompanhamento(pessoa.id, nota, novaData);
        toast.sucesso('Acompanhamento registrado.');
      } else if (novaData !== pessoa.proximoAcompanhamento) {
        await registrarAcompanhamento(pessoa.id, 'Data de acompanhamento atualizada', novaData);
        toast.sucesso('Data atualizada.');
      }
      await renderLista();
    }
  });

  setTimeout(() => {
    const overlay = document.getElementById('active-modal');
    overlay?.querySelector('#btn-editar-dados-pessoa')?.addEventListener('click', () => {
      abrirFormularioEdicao(pessoa);
    });
  }, 0);
}

async function init() {
  await renderLista();

  document.getElementById('btn-nova-pessoa').addEventListener('click', abrirFormularioNovo);
  document.getElementById('busca-input').addEventListener('input', async (e) => {
    filtroAtual.busca = e.target.value;
    await renderLista();
  });
  document.getElementById('filtro-funcao').addEventListener('change', async (e) => {
    filtroAtual.funcao = e.target.value;
    await renderLista();
  });
}

document.addEventListener('DOMContentLoaded', init);
