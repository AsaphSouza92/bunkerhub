import { eventosRepository } from '../data/repositories/eventosRepository.js';
import { marcarComoTransformada } from './ideias.module.js';
import { on, emit } from '../core/events.js';

export async function listarEventos(filtro = () => true) {
  const eventos = await eventosRepository.listar(filtro);
  return eventos.sort((a, b) => new Date(a.data) - new Date(b.data));
}
export async function buscarEvento(id) { return eventosRepository.buscarPorId(id); }
export function eventoEstaIncompleto(evento) { return !evento.data || !evento.local; }

export async function criarEvento(dados) {
  if (!dados.nome || dados.nome.trim().length < 3) throw new Error('Dê um nome mais descritivo ao evento.');
  const evento = await eventosRepository.criar(dados);
  emit('evento:criado', evento);
  return evento;
}

export async function criarEventoAPartirDeIdeia(ideia) {
  const evento = await eventosRepository.criar({ nome: ideia.titulo, descricao: ideia.descricao, origemIdeiaId: ideia.id });
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

export async function adicionarItemChecklist(eventoId, texto) {
  const evento = await eventosRepository.buscarPorId(eventoId);
  const checklist = [...(evento.checklist || []), { id: crypto.randomUUID(), texto, feito: false }];
  return atualizarEvento(eventoId, { checklist });
}
export async function alternarItemChecklist(eventoId, itemId) {
  const evento = await eventosRepository.buscarPorId(eventoId);
  const checklist = (evento.checklist || []).map(i => i.id === itemId ? { ...i, feito: !i.feito } : i);
  return atualizarEvento(eventoId, { checklist });
}

let listenerRegistrado = false;
export function registrarListenersEventos() {
  if (listenerRegistrado) return;
  listenerRegistrado = true;
  on('ideia:aprovada:evento', (ideia) => console.log(`[eventos.module] "${ideia.titulo}" pronta para virar evento.`));
}
