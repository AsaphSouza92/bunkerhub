import { eventosRepository } from '../data/repositories/eventosRepository.js';
import { marcarComoTransformada } from './ideias.module.js';
import { on, emit } from '../core/events.js';

export async function listarEventos(filtro = () => true) {
  const eventos = await eventosRepository.listar(filtro);

  return eventos.sort((a, b) => {
    const dataA = a.data
      ? new Date(`${a.data}T00:00:00`)
      : new Date(8640000000000000);

    const dataB = b.data
      ? new Date(`${b.data}T00:00:00`)
      : new Date(8640000000000000);

    return dataA - dataB;
  });
}

export async function buscarEvento(id) {
  return eventosRepository.buscarPorId(id);
}

export function eventoEstaIncompleto(evento) {
  return !evento.data || !evento.local;
}

export async function criarEvento(dados) {
  if (!dados.nome || dados.nome.trim().length < 3) {
    throw new Error('Dê um nome mais descritivo ao evento.');
  }

  const evento = await eventosRepository.criar(dados);

  emit('evento:criado', evento);

  return evento;
}

export async function criarEventoAPartirDeIdeia(ideia) {
  const evento = await eventosRepository.criar({
    nome: ideia.titulo,
    descricao: ideia.descricao,
    origemIdeiaId: ideia.id,
  });

  await marcarComoTransformada(ideia.id, evento.id);

  emit('evento:criado-de-ideia', evento);

  return evento;
}

export async function atualizarEvento(id, patch) {
  const evento = await eventosRepository.atualizar(id, patch);

  emit('evento:atualizado', evento);

  return evento;
}

export async function arquivarEvento(id) {
  await eventosRepository.arquivar(id);

  emit('evento:arquivado', { id });
}

export async function listarItensChecklist(eventoId) {
  return eventosRepository.listarChecklist(eventoId);
}

export async function adicionarItemChecklist(eventoId, texto) {
  if (!texto || !texto.trim()) {
    throw new Error('Digite uma descrição para o item.');
  }

  const item = await eventosRepository.adicionarChecklist(
    eventoId,
    texto.trim()
  );

  emit('evento:checklist-adicionado', {
    eventoId,
    item,
  });

  return item;
}

export async function alternarItemChecklist(eventoId, itemId) {
  const item = await eventosRepository.alternarChecklist(itemId);

  emit('evento:checklist-alterado', {
    eventoId,
    item,
  });

  return item;
}

export async function removerItemChecklist(eventoId, itemId) {
  await eventosRepository.removerChecklist(itemId);

  emit('evento:checklist-removido', {
    eventoId,
    itemId,
  });
}

let listenerRegistrado = false;

export function registrarListenersEventos() {
  if (listenerRegistrado) return;

  listenerRegistrado = true;

  on(
    'ideia:aprovada:evento',
    ideia =>
      console.log(
        `[eventos.module] "${ideia.titulo}" pronta para virar evento.`
      )
  );
}