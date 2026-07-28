import { qgRepository } from '../data/repositories/qgRepository.js';
import { emit } from '../core/events.js';

export async function listarAvisos() {
  const avisos = await qgRepository.listar();
  return avisos.sort((a, b) => {
    if (a.fixado !== b.fixado) return a.fixado ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export async function criarAviso(dados) {
  if (!dados.titulo || dados.titulo.trim().length < 3) throw new Error('Dê um título ao aviso.');
  const aviso = await qgRepository.criar(dados);
  emit('qg:aviso-criado', aviso);
  return aviso;
}

export async function atualizarAviso(id, dados) {
  const aviso = await qgRepository.atualizar(id, dados);
  emit('qg:aviso-atualizado', aviso);
  return aviso;
}

export async function arquivarAviso(id) {
  await qgRepository.arquivar(id);
  emit('qg:aviso-arquivado', { id });
}

export async function alternarFixado(id) {
  const avisos = await qgRepository.listar();
  const aviso = avisos.find(a => a.id === id);
  if (!aviso) return null;
  return qgRepository.atualizar(id, { fixado: !aviso.fixado });
}
