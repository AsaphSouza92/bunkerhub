const COLECOES_COM_MODELO_PADRAO = [
  'pessoas', 'eventos', 'ideias', 'tarefas',
  'relatorios', 'funcoes', 'biblioteca', 'qg'
];

const CHAVE_VERSAO_MIGRACAO = 'bunkerhub:migracao-modelo-dados-v1';

function backfillColecao(nomeColecao) {
  const chave = `bunkerhub:${nomeColecao}`;
  const raw = localStorage.getItem(chave);
  if (!raw) return;

  const registros = JSON.parse(raw);
  const agora = new Date().toISOString();

  const atualizados = registros.map(registro => ({
    ...registro,
    createdAt: registro.createdAt || registro.data || agora,
    updatedAt: registro.updatedAt || agora,
    ativo: registro.ativo === undefined ? true : registro.ativo,
  }));

  localStorage.setItem(chave, JSON.stringify(atualizados));
}

export function rodarMigracoes() {
  if (localStorage.getItem(CHAVE_VERSAO_MIGRACAO)) return;
  COLECOES_COM_MODELO_PADRAO.forEach(backfillColecao);
  localStorage.setItem(CHAVE_VERSAO_MIGRACAO, new Date().toISOString());
}
