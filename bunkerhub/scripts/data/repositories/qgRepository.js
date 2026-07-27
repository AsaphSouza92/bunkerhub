import { activeProvider as db } from '../providers/index.js';
const COLLECTION = 'notificacoes';

export const qgRepository = {
  async listar(filtro = () => true) { return db.listAtivos(COLLECTION, filtro); },
  async buscarPorId(id) { return db.get(COLLECTION, id); },
  async criar(dados) { return db.create(COLLECTION, { titulo: dados.titulo, conteudo: dados.conteudo || '', autor: dados.autor || 'Liderança', fixado: dados.fixado || false }); },
  async atualizar(id, patch) { return db.update(COLLECTION, id, patch); },
  async arquivar(id) { return db.desativar(COLLECTION, id); },
};
