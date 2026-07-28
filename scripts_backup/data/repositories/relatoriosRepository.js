import { activeProvider as db } from '../providers/index.js';
const COLLECTION = 'relatorios';

export const relatoriosRepository = {
  async listar(filtro = () => true) { return db.listAtivos(COLLECTION, filtro); },

  async buscarPorEvento(eventoId) {
    const todos = await db.listAtivos(COLLECTION, r => r.eventoId === eventoId);
    return todos[0] || null;
  },

  async criar(dados) {
    return db.create(COLLECTION, {
      eventoId: dados.eventoId, data: new Date().toISOString().slice(0, 10),
      participantes: dados.participantes || 0, visitantes: dados.visitantes || 0,
      resumo: dados.resumo || '', pontosPositivos: dados.pontosPositivos || '',
      pontosMelhoria: dados.pontosMelhoria || '', proximasAcoes: dados.proximasAcoes || '',
    });
  },

  async atualizar(id, patch) { return db.update(COLLECTION, id, patch); },
  async arquivar(id) { return db.desativar(COLLECTION, id); },
};
