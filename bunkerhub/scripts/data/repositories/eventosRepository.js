import { activeProvider as db } from '../providers/index.js';
const COLLECTION = 'eventos';

export const eventosRepository = {
  async listar(filtro = () => true) { return db.listAtivos(COLLECTION, filtro); },
  async buscarPorId(id) { return db.get(COLLECTION, id); },

  async criar(dados) {
    return db.create(COLLECTION, {
      nome: dados.nome, descricao: dados.descricao || '', responsavel: dados.responsavel || '',
      equipe: dados.equipe || '', local: dados.local || '', data: dados.data || '',
      horario: dados.horario || '', checklist: dados.checklist || [], participantes: dados.participantes || [],
      observacoes: dados.observacoes || '', origemIdeiaId: dados.origemIdeiaId || null,
    });
  },

  async atualizar(id, patch) { return db.update(COLLECTION, id, patch); },
  async arquivar(id) { return db.desativar(COLLECTION, id); },
};
