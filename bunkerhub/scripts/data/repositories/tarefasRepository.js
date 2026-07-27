import { activeProvider as db } from '../providers/index.js';
const COLLECTION = 'tarefas';

export const tarefasRepository = {
  async listar(filtro = () => true) { return db.listAtivos(COLLECTION, filtro); },
  async buscarPorId(id) { return db.get(COLLECTION, id); },

async criar(dados) {
  return db.create(COLLECTION, {
    titulo: dados.titulo,
    descricao: dados.descricao || '',
    responsavel_pessoa_id: dados.responsavel_pessoa_id || null,
    prazo: dados.prazo || null,
    prioridade: dados.prioridade || 'Média',
    status: dados.status || 'Pendente',
    concluida: false,
    evento_id: dados.evento_id || null,
  });
},

  async atualizar(id, patch) { return db.update(COLLECTION, id, patch); },
  async arquivar(id) { return db.desativar(COLLECTION, id); },
};
