import { activeProvider as db } from '../providers/index.js';
const COLLECTION = 'escalas';

export const escalasRepository = {
  async listarPorEvento(eventoId) { return db.list(COLLECTION, e => e.evento_id === eventoId); },

  async criar(dados) {
    return db.create(COLLECTION, {
      evento_id: dados.evento_id,
      pessoa_id: dados.pessoa_id,
      funcao_servico_id: dados.funcao_servico_id
    });
  },

  async remover(id) { return db.delete(COLLECTION, id); },
};