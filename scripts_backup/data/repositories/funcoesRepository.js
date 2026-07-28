import { activeProvider as db } from '../providers/index.js';
const COLLECTION = 'funcoes';

export const funcoesRepository = {
  async listar(filtro = () => true) { return db.listAtivos(COLLECTION, filtro); },
  async criar(nome) { return db.create(COLLECTION, { nome, ativo: true }); },
  async atualizar(id, patch) { return db.update(COLLECTION, id, patch); },
  async arquivar(id) { return db.desativar(COLLECTION, id); },

  async seedPadrao() {
    const existentes = await db.list(COLLECTION);
    if (existentes.length === 0) {
      const nomes = ['Recepção','Abertura do culto','Leitura bíblica','Oração inicial','Oração final','Água','Ornamentação','Organização','Limpeza','Eventos'];
      for (const nome of nomes) await db.create(COLLECTION, { nome, ativo: true });
    }
  }
};
