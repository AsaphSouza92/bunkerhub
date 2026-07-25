import { listarFuncoes, criarFuncao, arquivarFuncao, getEscalaDoEvento, escalarPessoa, removerEscala, listarEventosParaEscala } from '../modules/servico.module.js';
import { listarPessoas } from '../modules/pessoas.module.js';
import { funcoesRepository } from '../data/repositories/funcoesRepository.js';
import { promptDialog, confirmarDialog } from '../components/Dialog.js';
import { toast } from '../components/Toast.js';

let eventoSelecionadoId = null;

async function renderFuncoes() {
  const container = document.getElementById('funcoes-lista');
  const funcoes = await listarFuncoes({ apenasAtivas: true });

  container.innerHTML = funcoes.length
    ? funcoes.map(f => `
        <div class="card funcao-item" data-id="${f.id}">
          <span>${f.nome}</span>
          <div class="funcao-item__acoes">
            <button class="btn-editar-funcao">Editar</button>
            <button class="btn-remover-funcao">Remover</button>
          </div>
        </div>`).join('')
    : `<p class="card__empty">Nenhuma função cadastrada ainda.</p>`;

  container.querySelectorAll('.btn-editar-funcao').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.target.closest('.funcao-item');
      const nomeAtual = item.querySelector('span').textContent;
      promptDialog({ titulo: 'Editar função', label: 'Nome da função', valorInicial: nomeAtual }, async (novoNome) => {
        if (novoNome) {
          await funcoesRepository.atualizar(item.dataset.id, { nome: novoNome });
          await renderFuncoes();
          await popularSelectFuncoes();
          toast.sucesso('Função atualizada.');
        }
      });
    });
  });

  container.querySelectorAll('.btn-remover-funcao').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.funcao-item').dataset.id;
      confirmarDialog(
        { titulo: 'Remover função', mensagem: 'Escalas existentes vão perder a referência a essa função. Deseja continuar?', textoConfirmar: 'Remover', perigo: true },
        async (confirmado) => {
          if (confirmado) {
            await arquivarFuncao(id);
            await renderFuncoes();
            await popularSelectFuncoes();
            toast.sucesso('Função removida.');
          }
        }
      );
    });
  });
}

async function popularSelectEventos() {
  const select = document.getElementById('select-evento');
  const eventos = await listarEventosParaEscala();
  select.innerHTML = eventos.length
    ? eventos.map(e => `<option value="${e.id}">${e.nome} ${e.data ? '· ' + e.data : ''}</option>`).join('')
    : `<option value="">Nenhum evento futuro</option>`;
  eventoSelecionadoId = eventos[0]?.id || null;
}

async function popularSelectPessoas() {
  const select = document.getElementById('select-pessoa');
  const pessoas = await listarPessoas();
  select.innerHTML = pessoas.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
}

async function popularSelectFuncoes() {
  const select = document.getElementById('select-funcao');
  const funcoes = await listarFuncoes();
  select.innerHTML = funcoes.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
}

async function renderEscala() {
  const container = document.getElementById('lista-escala');
  if (!eventoSelecionadoId) {
    container.innerHTML = `<p class="card__empty">Selecione um evento para montar a escala.</p>`;
    return;
  }
  const escala = await getEscalaDoEvento(eventoSelecionadoId);
  container.innerHTML = escala.length
    ? escala.map(e => `
        <div class="escala-item" data-id="${e.id}">
          <div><strong>${e.pessoa?.nome || 'Pessoa removida'}</strong><span class="text-xs text-secondary"> · ${e.funcao?.nome || 'Função removida'}</span></div>
          <button class="btn-remover-escala text-xs text-secondary">✕</button>
        </div>`).join('')
    : `<p class="card__empty">Ninguém escalado ainda para este evento.</p>`;

  container.querySelectorAll('.btn-remover-escala').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      await removerEscala(e.target.closest('.escala-item').dataset.id);
      await renderEscala();
    });
  });
}

function setupTabs() {
  document.querySelectorAll('.servico-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.servico-tabs button').forEach(b => b.classList.remove('is-active'));
      document.querySelectorAll('.servico-painel').forEach(p => p.classList.remove('is-visible'));
      btn.classList.add('is-active');
      document.getElementById(`painel-${btn.dataset.painel}`).classList.add('is-visible');
    });
  });
}

async function init() {
  await funcoesRepository.seedPadrao();
  await popularSelectEventos();
  await popularSelectPessoas();
  await popularSelectFuncoes();
  await renderFuncoes();
  await renderEscala();
  setupTabs();

  document.getElementById('select-evento').addEventListener('change', async (e) => {
    eventoSelecionadoId = e.target.value;
    await renderEscala();
  });

  document.getElementById('btn-adicionar-escala').addEventListener('click', async () => {
    const pessoaId = document.getElementById('select-pessoa').value;
    const funcaoId = document.getElementById('select-funcao').value;
    try {
      await escalarPessoa(eventoSelecionadoId, pessoaId, funcaoId);
      await renderEscala();
      toast.sucesso('Pessoa escalada.');
    } catch (err) { toast.erro(err.message); }
  });

  document.getElementById('btn-add-funcao').addEventListener('click', async () => {
    const input = document.getElementById('nova-funcao-input');
    try {
      await criarFuncao(input.value);
      input.value = '';
      await renderFuncoes();
      await popularSelectFuncoes();
      toast.sucesso('Função criada.');
    } catch (err) { toast.erro(err.message); }
  });
}

document.addEventListener('DOMContentLoaded', init);
