import { relatoriosRepository } from '../data/repositories/relatoriosRepository.js';
import { listarEventos } from './eventos.module.js';
import { emit } from '../core/events.js';

export async function listarRelatorios() {
  const [relatorios, eventos] = await Promise.all([relatoriosRepository.listar(), listarEventos()]);
  return relatorios
    .map(r => ({ ...r, evento: eventos.find(e => e.id === r.eventoId) || null }))
    .sort((a, b) => new Date(b.data) - new Date(a.data));
}

export async function eventosSemRelatorio() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [relatorios, eventos] = await Promise.all([relatoriosRepository.listar(), listarEventos()]);
  const idsComRelatorio = new Set(relatorios.map(r => r.eventoId));
  return eventos.filter(e => e.data && e.data <= hoje && !idsComRelatorio.has(e.id));
}

export async function criarRelatorio(dados) {
  if (!dados.eventoId) throw new Error('Selecione o evento ao qual este relatório se refere.');
  if (await relatoriosRepository.buscarPorEvento(dados.eventoId)) throw new Error('Este evento já possui um relatório.');
  const relatorio = await relatoriosRepository.criar(dados);
  emit('relatorio:criado', relatorio);
  return relatorio;
}

export async function atualizarRelatorio(id, patch) {
  const relatorio = await relatoriosRepository.atualizar(id, patch);
  emit('relatorio:atualizado', relatorio);
  return relatorio;
}

export async function arquivarRelatorio(id) {
  await relatoriosRepository.arquivar(id);
  emit('relatorio:arquivado', { id });
}
