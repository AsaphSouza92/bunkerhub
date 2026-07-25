import { getState } from './store.js';

// Usado pelos repositórios Supabase para saber "de qual igreja" buscar
// e gravar dados. Lança um erro claro se, por algum motivo, uma tela for
// carregada sem igreja ativa no estado — não deveria acontecer, já que o
// guard de login (auth.module.js) preenche isso antes de qualquer página
// renderizar (ver Sidebar.js).
export function obterIgrejaAtualId() {
  const { igrejaAtual } = getState();
  if (!igrejaAtual) {
    throw new Error('Nenhuma igreja ativa. Faça login novamente.');
  }
  return igrejaAtual.id;
}

// Usado por filtros como "Minhas tarefas" — devolve o id do profile
// logado (auth.users.id), ou null se ninguém estiver logado (modo
// localStorage, por exemplo, onde esse conceito não existe).
export function obterUsuarioAtualId() {
  const { usuarioAtual } = getState();
  return usuarioAtual?.id || null;
}
