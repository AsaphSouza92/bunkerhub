import { bibliotecaRepository } from '../data/repositories/bibliotecaRepository.js';
import { emit } from '../core/events.js';

export async function listarMateriais({ busca = '', categoria = '' } = {}) {
  const materiais = await bibliotecaRepository.listar(m => {
    const bateBusca = busca ? m.titulo.toLowerCase().includes(busca.toLowerCase()) : true;
    const bateCategoria = categoria ? m.categoria === categoria : true;
    return bateBusca && bateCategoria;
  });
  return materiais.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function criarMaterial(dados) {
  if (!dados.titulo || dados.titulo.trim().length < 3) throw new Error('Dê um título mais descritivo ao material.');
  const material = await bibliotecaRepository.criar(dados);
  emit('biblioteca:material-criado', material);
  return material;
}

export async function atualizarMaterial(id, dados) {
  const material = await bibliotecaRepository.atualizar(id, dados);
  emit('biblioteca:material-atualizado', material);
  return material;
}

export async function arquivarMaterial(id) {
  await bibliotecaRepository.arquivar(id);
  emit('biblioteca:material-arquivado', { id });
}

export async function listarCategorias() {
  const materiais = await bibliotecaRepository.listar();
  return [...new Set(materiais.map(m => m.categoria))].sort();
}
