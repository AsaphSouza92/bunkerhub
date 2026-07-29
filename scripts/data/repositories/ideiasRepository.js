import { activeProvider as db } from '../providers/index.js';

const COLLECTION = 'ideias';

export const ideiasRepository = {
  async listar(filtro = () => true) {
    return db.listAtivos(COLLECTION, filtro);
  },

  async buscarPorId(id) {
    return db.get(COLLECTION, id);
  },

  async criar(dados) {
    return db.create(COLLECTION, {
      titulo: dados.titulo,
      categoria: dados.categoria || 'Geral',
      descricao: dados.descricao || '',
      data: new Date().toISOString().slice(0, 10),
      prioridade: dados.prioridade || 'Média',
      status: 'Rascunho',
      transformada_evento_id: null,
    });
  },

  async atualizar(id, patch) {
    return db.update(COLLECTION, id, patch);
  },

  async arquivar(id) {
    return db.desativar(COLLECTION, id);
  },
};