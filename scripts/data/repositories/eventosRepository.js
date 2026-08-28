import { activeProvider as db } from '../providers/index.js';

const COLLECTION = 'eventos';
const CHECKLIST_COLLECTION = 'eventos_checklist_itens';

function vazioParaNull(valor) {
  return valor === '' || valor === undefined ? null : valor;
}

function paraSupabase(dados) {
  const payload = {};

  if (dados.nome !== undefined) {
    payload.nome = dados.nome;
  }

  if (dados.descricao !== undefined) {
    payload.descricao = dados.descricao;
  }

  if (dados.responsavelPessoaId !== undefined) {
    payload.responsavel_pessoa_id = vazioParaNull(
      dados.responsavelPessoaId
    );
  }

  if (dados.responsavel_pessoa_id !== undefined) {
    payload.responsavel_pessoa_id = vazioParaNull(
      dados.responsavel_pessoa_id
    );
  }

  if (dados.equipe !== undefined) {
    payload.equipe = dados.equipe;
  }

  if (dados.local !== undefined) {
    payload.local = dados.local;
  }

  if (dados.data !== undefined) {
    payload.data = vazioParaNull(dados.data);
  }

  if (dados.horario !== undefined) {
    payload.horario = vazioParaNull(dados.horario);
  }

  if (dados.observacoes !== undefined) {
    payload.observacoes = dados.observacoes;
  }

  if (dados.origemIdeiaId !== undefined) {
    payload.origem_ideia_id = vazioParaNull(
      dados.origemIdeiaId
    );
  }

  if (dados.origem_ideia_id !== undefined) {
    payload.origem_ideia_id = vazioParaNull(
      dados.origem_ideia_id
    );
  }

  return payload;
}

function paraApp(evento) {
  if (!evento) return evento;

  return {
    ...evento,

    responsavelPessoaId:
      evento.responsavel_pessoa_id ??
      evento.responsavelPessoaId ??
      null,

    origemIdeiaId:
      evento.origem_ideia_id ??
      evento.origemIdeiaId ??
      null,

    checklist: evento.checklist || [],
  };
}

function checklistParaApp(item) {
  if (!item) return item;

  return {
    ...item,
    eventoId: item.evento_id,
  };
}

async function carregarChecklist(evento) {
  if (!evento) return evento;

  const itens = await db.list(
    CHECKLIST_COLLECTION,
    item => item.evento_id === evento.id
  );

  return {
    ...paraApp(evento),
    checklist: itens
      .map(checklistParaApp)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0)),
  };
}

export const eventosRepository = {
  async listar(filtro = () => true) {
    const itens = await db.listAtivos(
      COLLECTION,
      () => true
    );

    const eventos = itens
      .map(paraApp)
      .filter(filtro);

    const eventosComChecklist = await Promise.all(
      eventos.map(carregarChecklist)
    );

    return eventosComChecklist;
  },

  async listarIncluindoArquivados(filtro = () => true) {
    const itens = await db.list(
      COLLECTION,
      () => true
    );

    const eventos = itens
      .map(paraApp)
      .filter(filtro);

    const eventosComChecklist = await Promise.all(
      eventos.map(carregarChecklist)
    );

    return eventosComChecklist;
  },

  async buscarPorId(id) {
    const evento = await db.get(
      COLLECTION,
      id
    );

    return carregarChecklist(evento);
  },

  async criar(dados) {
    const evento = await db.create(
      COLLECTION,
      paraSupabase(dados)
    );

    return carregarChecklist(evento);
  },

  async atualizar(id, patch) {
    const evento = await db.update(
      COLLECTION,
      id,
      paraSupabase(patch)
    );

    return carregarChecklist(evento);
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

  async listarChecklist(eventoId) {
    const itens = await db.list(
      CHECKLIST_COLLECTION,
      item => item.evento_id === eventoId
    );

    return itens
      .map(checklistParaApp)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  },

  async adicionarChecklist(eventoId, texto) {
    const existentes = await this.listarChecklist(eventoId);

    return checklistParaApp(
      await db.create(
        CHECKLIST_COLLECTION,
        {
          evento_id: eventoId,
          texto,
          feito: false,
          ordem: existentes.length,
        }
      )
    );
  },

  async alternarChecklist(itemId) {
    const item = await db.get(
      CHECKLIST_COLLECTION,
      itemId
    );

    if (!item) {
      throw new Error('Item de checklist não encontrado.');
    }

    return checklistParaApp(
      await db.update(
        CHECKLIST_COLLECTION,
        itemId,
        {
          feito: !item.feito,
        }
      )
    );
  },

  async removerChecklist(itemId) {
    return db.delete(
      CHECKLIST_COLLECTION,
      itemId
    );
  },
};