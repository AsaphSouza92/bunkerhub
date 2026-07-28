import {
  getResumoDados, getNomeColecao, baixarBackup, importarDados, limparTodosOsDados,
  getColecoesArquivaveis, listarArquivados, reativarItem, getInfoSincronizacao, VERSAO_APP
} from '../modules/configuracoes.module.js';
import { confirmarDialog } from '../components/Dialog.js';
import { toast } from '../components/Toast.js';

async function renderResumo() {
  const container = document.getElementById('resumo-dados');
  const resumo = await getResumoDados();
  container.innerHTML = resumo.map(r => `
    <div class="config-resumo-item">
      <span>${getNomeColecao(r.colecao)}</span>
      <span class="text-secondary">${r.quantidade}</span>
    </div>
  `).join('');
}

function renderSincronizacao() {
  const info = getInfoSincronizacao();
  document.getElementById('status-sincronizacao').textContent = info.rotulo;
}

function renderVersao() {
  const el = document.getElementById('versao-app');
  if (el) el.textContent = `Versão ${VERSAO_APP}`;
}

async function popularSelectColecoes() {
  const select = document.getElementById('select-colecao-arquivada');
  const colecoes = await getColecoesArquivaveis();
  select.innerHTML = colecoes.map(c => `<option value="${c.id}">${c.label} (${c.total})</option>`).join('');
  select.onchange = () => renderArquivados(select.value);
  if (colecoes.length > 0) await renderArquivados(colecoes[0].id);
}

async function renderArquivados(colecao) {
  const container = document.getElementById('lista-arquivados');
  const itens = await listarArquivados(colecao);

  container.innerHTML = itens.length
    ? itens.map(i => `
        <div class="arquivado-item" data-id="${i.id}">
          <span>${i.titulo}</span>
          <button class="arquivado-item__acao" data-colecao="${colecao}">Reativar</button>
        </div>`).join('')
    : `<p class="card__empty">Nenhum item arquivado nesta coleção.</p>`;

  container.querySelectorAll('.arquivado-item__acao').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.closest('.arquivado-item').dataset.id;
      await reativarItem(btn.dataset.colecao, id);
      await renderArquivados(colecao);
      await popularSelectColecoes();
      await renderResumo();
      toast.sucesso('Item reativado.');
    });
  });
}

function setupBackup() {
  document.getElementById('btn-exportar').addEventListener('click', async () => {
    await baixarBackup();
    toast.sucesso('Backup baixado com sucesso.');
  });

  document.getElementById('input-importar').addEventListener('change', (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = async () => {
      try {
        const resultado = await importarDados(leitor.result);
        toast.sucesso(`Backup de ${new Date(resultado.dataOriginal).toLocaleDateString('pt-BR')} importado. Recarregando...`);
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        toast.erro(err.message);
      }
    };
    leitor.readAsText(arquivo);
    e.target.value = '';
  });
}

function setupZonaDeRisco() {
  document.getElementById('btn-limpar').addEventListener('click', () => {
    confirmarDialog(
      { titulo: 'Apagar todos os dados', mensagem: 'Isso apaga PERMANENTEMENTE todos os dados cadastrados neste dispositivo, incluindo arquivados. Essa ação não pode ser desfeita.', textoConfirmar: 'Sim, apagar tudo', perigo: true },
      (confirmado) => {
        if (confirmado) {
          limparTodosOsDados();
          toast.sucesso('Dados apagados. Recarregando...');
          setTimeout(() => location.reload(), 1200);
        }
      }
    );
  });
}

async function init() {
  await renderResumo();
  renderSincronizacao();
  renderVersao();
  await popularSelectColecoes();
  setupBackup();
  setupZonaDeRisco();
}

document.addEventListener('DOMContentLoaded', init);
