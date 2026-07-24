import { activeProvider as db } from '../providers/index.js';
const COLLECTION = 'biblioteca';

export const bibliotecaRepository = {
  async listar(filtro = () => true) { return db.listAtivos(COLLECTION, filtro); },
  async buscarPorId(id) { return db.get(COLLECTION, id); },

  async criar(dados) {
    return db.create(COLLECTION, {
      titulo: dados.titulo, categoria: dados.categoria || 'Geral', tipo: dados.tipo || 'Documento',
      url: dados.url || '', descricao: dados.descricao || '', autor: dados.autor || '',
    });
  },

  async atualizar(id, patch) { return db.update(COLLECTION, id, patch); },
  async arquivar(id) { return db.desativar(COLLECTION, id); },

  async seedIfEmpty() {
    const existentes = await db.list(COLLECTION);
    if (existentes.length === 0) {
      await db.create(COLLECTION, {
        titulo: 'Guia de Discipulado — Fundamentos da Fé', categoria: 'Discipulado', tipo: 'Documento',
        url: '', descricao: 'Material base para acompanhamento de novos convertidos.', autor: 'Liderança Bunker',
      });
    }
  },
};
