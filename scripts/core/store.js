const state = {
  sidebarOpen: false,
  // usuarioAtual e igrejaAtual começam nulos e são preenchidos pelo
  // scripts/auth/auth.module.js assim que a sessão é confirmada.
  // Em modo localStorage (DB_PROVIDER !== 'supabase') eles permanecem
  // nulos — nenhuma tela hoje depende deles para funcionar.
  usuarioAtual: null,
  igrejaAtual: null,
  filtrosAtivos: {},
};

export function getState() { return state; }
export function setState(partial) { Object.assign(state, partial); }
