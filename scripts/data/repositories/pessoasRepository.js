import { activeProvider as db } from '../providers/index.js';
const COLLECTION = 'pessoas';

// Datas vazias vindas do formulário chegam como "" (não undefined),
// e a coluna `date` no Postgres rejeita "" com erro 22007.
// Valores vazios são convertidos para null antes de serem enviados.
function vazioParaNull(valor) {
  return valor === '' || valor === undefined ? null : valor;
}

// O schema do Supabase usa `categoria`, `data_entrada` e
// `proximo_acompanhamento` (ver supabase/schema.sql, Bloco 4).
// O app usa `funcao`, `dataEntrada` e `proximoAcompanhamento` —
// em vez de reescrever module.js/page.js, o repositório traduz nos
// dois sentidos, que é a responsabilidade dele.
function paraSupabase(dados) {
  const payload = {};

  if (dados.nome !== undefined) {
    payload.nome = dados.nome;
  }

  if (dados.telefone !== undefined) {
    payload.telefone = dados.telefone;
  }

  if (dados.nascimento !== undefined) {
    payload.nascimento = vazioParaNull(dados.nascimento);
  }

  if (dados.funcao !== undefined || dados.categoria !== undefined) {
    payload.categoria = dados.categoria || dados.funcao || 'Visitante';
  }

  if (dados.dataEntrada !== undefined || dados.data_entrada !== undefined) {
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

  // `ministerio` (texto livre) e `historico` (array) NÃO existem mais como
  // colunas em `pessoas` — viraram `pessoa_ministerios` e
  // `pessoas_acompanhamentos` no schema novo. Enviá-los quebrava o INSERT
  // inteiro. Ficam de fora por ora (ver docs/SUPABASE-ARQUITETURA-E-MIGRACAO.md,
  // seção 5.1 — adaptação pendente, não implementada nesta correção para não
  // expandir o escopo de um fix de sincronização).

  return payload;
}

function paraApp(pessoa) {
  if (!pessoa) return pessoa;

  return {
    ...pessoa,
    funcao: pessoa.categoria ?? pessoa.funcao,
    dataEntrada: pessoa.data_entrada ?? pessoa.dataEntrada,
    proximoAcompanhamento:
      pessoa.proximo_acompanhamento ??
      pessoa.proximoAcompanhamento ??
      null,
    historico: pessoa.historico || [],
  };
}

export const pessoasRepository = {
  async listar(filtro = () => true) {
    const itens = await db.listAtivos(COLLECTION, () => true);
    return itens.map(paraApp).filter(filtro);
  },

  async listarIncluindoArquivadas(filtro = () => true) {
    const itens = await db.list(COLLECTION, () => true);
    return itens.map(paraApp).filter(filtro);
  },

  async buscarPorId(id) {
    return paraApp(await db.get(COLLECTION, id));
  },

  async criar(dados) {
    return paraApp(
      await db.create(COLLECTION, paraSupabase(dados))
    );
  },

  async atualizar(id, patch) {
    return paraApp(
      await db.update(COLLECTION, id, paraSupabase(patch))
    );
  },

  async arquivar(id) {
    return db.desativar(COLLECTION, id);
  },

  async reativar(id) {
    return db.reativar(COLLECTION, id);
  },

  async adicionarHistorico(id, entrada) {
    // Continua funcionando só em modo localStorage — em modo Supabase,
    // sem a tabela pessoas_acompanhamentos ligada, esse histórico não
    // persiste ainda (pendência já documentada, fora do escopo deste fix).

    const pessoa = await this.buscarPorId(id);

    if (!pessoa) return null;

    const historico = [
      ...(pessoa.historico || []),
      {
        data: new Date().toISOString().slice(0, 10),
        texto: entrada
      }
    ];

    return this.atualizar(id, { historico });
  },
};