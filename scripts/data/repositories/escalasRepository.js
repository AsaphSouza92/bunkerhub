import { activeProvider as db } from '../providers/index.js';
const COLLECTION = 'escalas';

export const escalasRepository = {
  async listarPorEvento(eventoId) { return db.list(COLLECTION, e => e.eventoId === eventoId); },
  async criar(dados) { return db.create(COLLECTION, { eventoId: dados.eventoId, pessoaId: dados.pessoaId, funcaoId: dados.funcaoId }); },
  async remover(id) { return db.delete(COLLECTION, id); },
};
