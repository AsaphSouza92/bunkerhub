import { activeProvider as db } from '../providers/index.js';
import { getState } from '../../core/store.js';

const COLLECTION = 'pessoas';
const COLLECTION_ACOMPANHAMENTOS = 'pessoas_acompanhamentos';

function vazioParaNull(valor) {
  return valor === '' || valor === undefined ? null : valor;
}

// Supabase uses categoria, data_entrada, proximo_acompanhamento.
// App uses funcao, dataEntrada, proximoAcompanhamento.
function paraSupabase(dados) {
  const payload = {};

  if (dados.nome !== undefined) payload.nome = dados.nome;
  if (dados.telefone !== undefined) payload.telefone = dados.telefone;
  if (dados.nascimento !== undefined) {
    payload.nascimento = vazioParaNull(dados.nascimento);
  }

  if (dados.funcao !== undefined || dados.categoria !== undefined) {
    payload.categoria = dados.categoria || dados.funcao || 'Visitante';
  }

  if (
    dados.dataEntrada !== undefined ||
    dados.data_entrada !== undefined
  ) {
    payload.data_entrada = vazioParaNull(
      dados.data_entrada ?? dados.dataEntrada
    );
  }

  if (dados.observacoes !== undefined) {
    payload.observacoes = dados.observacoes;
  }

  if (
    dados.proximoAcompanhamento !== undefined ||
    dados.proximo_acompanhamento !== undefined
  ) {
    payload.proximo_acompanhamento = vazioParaNull(
      dados.proximo_acompanhamento ??
      dados.proximoAcompanhamento
    );
  }

  // ministerio e historico não existem mais diretamente
  // na tabela pessoas.
  return payload;
}

function paraApp(pessoa) {
  if (!pessoa) return pessoa;

  return {
    ...pessoa,

    funcao: pessoa.categoria ?? pessoa.funcao,

    dataEntrada:
      pessoa.data_entrada ??
      pessoa.dataEntrada,

    proximoAcompanhamento:
      pessoa.proximo_acompanhamento ??
      pessoa.proximoAcompanhamento ??
      null,

    historico: pessoa.historico || [],
  };
}

async function carregarHistorico(pessoaId) {
  const acompanhamentos = await db.list(
    COLLECTION_ACOMPANHAMENTOS,
    acompanhamento => acompanhamento.pessoa_id === pessoaId
  );

  return acompanhamentos
    .map(acompanhamento => ({
      id: acompanhamento.id,
      texto: acompanhamento.texto,
      data:
        acompanhamento.data_registro ??
        acompanhamento.dataRegistro ??
        null,
      autorProfileId:
        acompanhamento.autor_profile_id ??
        acompanhamento.autorProfileId ??
        null,
      createdAt: acompanhamento.createdAt ?? null,
    }))
    .sort((a, b) => {
      if (!a.data) return 1;
      if (!b.data) return -1;

      return String(b.data).localeCompare(String(a.data));
    });
}

async function pessoaComHistorico(pessoa) {
  if (!pessoa) return pessoa;

  const pessoaApp = paraApp(pessoa);

  pessoaApp.historico = await carregarHistorico(pessoa.id);

  return pessoaApp;
}

export const pessoasRepository = {
  async listar(filtro = () => true) {
    const itens = await db.listAtivos(
      COLLECTION,
      () => true
    );

    return itens
      .map(paraApp)
      .filter(filtro);
  },

  async listarIncluindoArquivadas(filtro = () => true) {
    const itens = await db.list(
      COLLECTION,
      () => true
    );

    return itens
      .map(paraApp)
      .filter(filtro);
  },

  async buscarPorId(id) {
    const pessoa = await db.get(
      COLLECTION,
      id
    );

    return pessoaComHistorico(pessoa);
  },

  async criar(dados) {
    const pessoa = await db.create(
      COLLECTION,
      paraSupabase(dados)
    );

    return paraApp(pessoa);
  },

  async atualizar(id, patch) {
    const pessoa = await db.update(
      COLLECTION,
      id,
      paraSupabase(patch)
    );

    return paraApp(pessoa);
  },

  async arquivar(id) {
    return db.desativar(
      COLLECTION,
      id
    );
  },

  async reativar(id) {
    return db.reativar(
      COLLECTION,
      id
    );
  },

  async adicionarHistorico(
    id,
    entrada,
    dataRegistro = null
  ) {
    const state = getState();

    const autorProfileId =
      state.usuarioAtual?.id;

    if (!autorProfileId) {
      throw new Error(
        'Não foi possível identificar o usuário responsável pelo acompanhamento.'
      );
    }

    if (!entrada || !String(entrada).trim()) {
      throw new Error(
        'Informe uma observação para registrar o acompanhamento.'
      );
    }

    const acompanhamento =
      await db.create(
        COLLECTION_ACOMPANHAMENTOS,
        {
          pessoa_id: id,
          autor_profile_id: autorProfileId,
          texto: String(entrada).trim(),
          data_registro:
            dataRegistro ||
            new Date()
              .toISOString()
              .slice(0, 10),
        }
      );

    return {
      id: acompanhamento.id,
      texto: acompanhamento.texto,
      data:
        acompanhamento.data_registro ??
        acompanhamento.dataRegistro ??
        null,
      autorProfileId:
        acompanhamento.autor_profile_id ??
        acompanhamento.autorProfileId ??
        null,
      createdAt:
        acompanhamento.createdAt ?? null,
    };
  },
};