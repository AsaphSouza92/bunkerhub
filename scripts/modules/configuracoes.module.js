import { activeProvider as db } from '../data/providers/index.js';
import { DB_PROVIDER } from '../data/db.config.js';

const APP_NOME = 'BunkerHub';
const VERSAO_BACKUP_ATUAL = 1;
export const VERSAO_APP = '1.0.0';

const COLLECTIONS = ['pessoas', 'eventos', 'ideias', 'tarefas', 'relatorios', 'funcoes', 'escalas', 'biblioteca', 'qg', 'versiculos'];

const NOMES_COLECAO = {
  pessoas: 'Pessoas', eventos: 'Eventos', ideias: 'Ideias', tarefas: 'Tarefas',
  relatorios: 'Relatórios', funcoes: 'Funções', escalas: 'Escalas',
  biblioteca: 'Materiais na Biblioteca', qg: 'Avisos no QG', versiculos: 'Versículos cadastrados',
};

const COLECOES_ARQUIVAVEIS = ['pessoas', 'eventos', 'ideias', 'tarefas', 'relatorios', 'funcoes', 'biblioteca', 'qg'];

export function getNomeColecao(colecao) { return NOMES_COLECAO[colecao] || colecao; }

export function getInfoSincronizacao() {
  const rotulos = { localStorage: 'Local (apenas este dispositivo)', firebase: 'Firebase (sincronizado)', supabase: 'Supabase (sincronizado)' };
  return { provider: DB_PROVIDER, rotulo: rotulos[DB_PROVIDER] || DB_PROVIDER, sincronizado: DB_PROVIDER !== 'localStorage' };
}

export async function getResumoDados() {
  return Promise.all(
    COLLECTIONS.map(async col => {
      try {
        return {
          colecao: col,
          quantidade: (await db.listAtivos(col)).length
        };
      } catch {
        return {
          colecao: col,
          quantidade: null
        };
      }
    })
  );
}


export async function getColecoesArquivaveis() {
  return Promise.all(
    COLECOES_ARQUIVAVEIS.map(async col => {
      try {
        return {
          id: col,
          label: getNomeColecao(col),
          total: (await db.list(col, item => item.ativo === false)).length,
        };
      } catch {
        return {
          id: col,
          label: getNomeColecao(col),
          total: 0,
        };
      }
    })
  );
}

export async function listarArquivados(colecao) {
  const campoTitulo = {
    pessoas: 'nome', eventos: 'nome', ideias: 'titulo', tarefas: 'titulo',
    relatorios: 'eventoId', funcoes: 'nome', biblioteca: 'titulo', qg: 'titulo',
  }[colecao] || 'nome';

  const itens = await db.list(colecao, item => item.ativo === false);
  return itens.map(item => ({ id: item.id, titulo: item[campoTitulo] || '(sem título)', updatedAt: item.updatedAt }));
}

export async function reativarItem(colecao, id) { return db.reativar(colecao, id); }

export async function excluirItemArquivado(colecao, id) {

return db.delete(colecao, id);

}

export async function exportarDados() {
  const dados = {};
  for (const col of COLLECTIONS) dados[col] = await db.list(col);
  return { app: APP_NOME, versao: VERSAO_BACKUP_ATUAL, dataExportacao: new Date().toISOString(), dados };
}

export async function baixarBackup() {
  const backup = await exportarDados();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bunkerhub-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function validarEstruturaBackup(objeto) {
  if (!objeto || typeof objeto !== 'object') throw new Error('Arquivo inválido: não é um JSON reconhecível.');
  if (objeto.app !== APP_NOME) throw new Error(`Este arquivo não é um backup do ${APP_NOME}.`);
  if (typeof objeto.versao !== 'number') throw new Error('Backup sem informação de versão. Não é possível importar com segurança.');
  if (objeto.versao > VERSAO_BACKUP_ATUAL) throw new Error(`Este backup foi gerado por uma versão mais nova do ${APP_NOME} (v${objeto.versao}). Atualize a plataforma antes de importar.`);
  if (!objeto.dados || typeof objeto.dados !== 'object') throw new Error('Backup corrompido: seção de dados ausente.');
  const colecoesInvalidas = Object.keys(objeto.dados).filter(k => !COLLECTIONS.includes(k));
  if (colecoesInvalidas.length > 0) throw new Error(`Backup contém coleções desconhecidas: ${colecoesInvalidas.join(', ')}.`);
}

export async function importarDados(jsonTexto) {
  let backup;
  try { backup = JSON.parse(jsonTexto); }
  catch { throw new Error('Arquivo inválido. Certifique-se de que é um backup do BunkerHub (.json).'); }

  validarEstruturaBackup(backup);

  COLLECTIONS.forEach(col => {
    if (backup.dados[col]) localStorage.setItem(`bunkerhub:${col}`, JSON.stringify(backup.dados[col]));
  });

  return { dataOriginal: backup.dataExportacao, versaoOriginal: backup.versao };
}

export function limparTodosOsDados() {
  COLLECTIONS.forEach(col => localStorage.removeItem(`bunkerhub:${col}`));
}
