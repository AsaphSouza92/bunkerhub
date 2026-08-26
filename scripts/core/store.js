const state = {
  sidebarOpen: false,

  // usuarioAtual e igrejaAtual começam nulos e são preenchidos pelo
  // scripts/auth/auth.module.js assim que a sessão é confirmada.
  usuarioAtual: null,
  igrejaAtual: null,

  // Permissões carregadas de acordo com o papel do usuário.
  permissoes: [],

  filtrosAtivos: {},
};

export function getState() {
  return state;
}

export function setState(partial) {
  Object.assign(state, partial);
}