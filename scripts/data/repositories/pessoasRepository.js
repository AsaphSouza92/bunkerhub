import { activeProvider as db } from '../providers/index.js';
const COLLECTION = 'pessoas';

export const pessoasRepository = {
  async listar(filtro = () => true) { return db.listAtivos(COLLECTION, filtro); },
  async listarIncluindoArquivadas(filtro = () => true) { return db.list(COLLECTION, filtro); },
  async buscarPorId(id) { return db.get(COLLECTION, id); },

async criar(dados) {
  return db.create(COLLECTION, {
    nome: dados.nome,
    telefone: dados.telefone || '',
    email: dados.email || '',
    nascimento: dados.nascimento || null,

    categoria: dados.categoria || dados.funcao || 'Visitante',

    data_entrada:
      dados.data_entrada ||
      dados.dataEntrada ||
      new Date().toISOString().slice(0, 10),

    observacoes: dados.observacoes || '',

    proximo_acompanhamento:
      dados.proximo_acompanhamento ||
      dados.proximoAcompanhamento ||
      null,
  });
}

  async atualizar(id, patch) { return db.update(COLLECTION, id, patch); },
  async arquivar(id) { return db.desativar(COLLECTION, id); },
  async reativar(id) { return db.reativar(COLLECTION, id); },

  async adicionarHistorico(id, entrada) {
    const pessoa = await this.buscarPorId(id);
    if (!pessoa) return null;
    const historico = [...(pessoa.historico || []), { data: new Date().toISOString().slice(0, 10), texto: entrada }];
    return this.atualizar(id, { historico });
  },
};
