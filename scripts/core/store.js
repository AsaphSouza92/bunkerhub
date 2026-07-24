const state = {
  sidebarOpen: false,
  usuarioAtual: { nome: "Liderança", id: "mock-user" },
  filtrosAtivos: {},
};

export function getState() { return state; }
export function setState(partial) { Object.assign(state, partial); }
