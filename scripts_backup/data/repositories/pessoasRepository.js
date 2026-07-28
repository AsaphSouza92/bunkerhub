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
      nascimento: dados.nascimento || null,
      funcao: dados.funcao || '',
      ministerio: dados.ministerio || '',
      dataEntrada: dados.dataEntrada || new Date().toISOString().slice(0, 10),
      observacoes: dados.observacoes || '',
      historico: [],
      proximoAcompanhamento: dados.proximoAcompanhamento || null,
    });
  },

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
