import { ministeriosRepository } from '../data/repositories/ministeriosRepository.js';
import { emit } from '../core/events.js';

export async function listarMinisterios() {
  const ministerios = await ministeriosRepository.listar();
  return ministerios.sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function criarMinisterio(dados) {
  if (!dados.nome || dados.nome.trim().length < 2) throw new Error('Dê um nome válido ao ministério.');
  const ministerio = await ministeriosRepository.criar(dados);
  emit('ministerio:criado', ministerio);
  return ministerio;
}

export async function arquivarMinisterio(id) {
  await ministeriosRepository.arquivar(id);
  emit('ministerio:arquivado', { id });
}
