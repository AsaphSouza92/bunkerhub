import { ideiasRepository } from '../data/repositories/ideiasRepository.js';
import { emit } from '../core/events.js';

export const STATUS = ['Rascunho', 'Em análise', 'Aprovado', 'Arquivado'];

export async function listarIdeias({ status = '', categoria = '' } = {}) {
  const ideias = await ideiasRepository.listar(i => {
    const bateStatus = status ? i.status === status : true;
    const bateCategoria = categoria ? i.categoria === categoria : true;
    return bateStatus && bateCategoria;
  });
  return ideias.sort((a, b) => new Date(b.data) - new Date(a.data));
}

export async function criarIdeia(dados) {
  if (!dados.titulo || dados.titulo.trim().length < 3) throw new Error('Dê um título mais descritivo para a ideia.');
  const ideia = await ideiasRepository.criar(dados);
  emit('ideia:criada', ideia);
  return ideia;
}

export async function atualizarStatus(id, novoStatus) {
  const ideia = await ideiasRepository.atualizar(id, { status: novoStatus });
  emit('ideia:status-alterado', ideia);
  if (novoStatus === 'Aprovado' && ideia.categoria === 'Evento') emit('ideia:aprovada:evento', ideia);
  return ideia;
}

export function podeVirarEvento(ideia) {
  return ideia.status === 'Aprovado' && ideia.categoria === 'Evento' && !ideia.transformadaEmEventoId;
}

export async function marcarComoTransformada(ideiaId, eventoId) {
  return ideiasRepository.atualizar(ideiaId, { transformadaEmEventoId: eventoId });
}

export async function arquivarIdeia(id) {
  await ideiasRepository.arquivar(id);
  emit('ideia:arquivada', { id });
}
