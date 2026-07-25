import { funcoesRepository } from '../data/repositories/funcoesRepository.js';
import { escalasRepository } from '../data/repositories/escalasRepository.js';
import { listarPessoas } from './pessoas.module.js';
import { listarEventos } from './eventos.module.js';
import { emit } from '../core/events.js';

export async function listarFuncoes({ apenasAtivas = true } = {}) {
  const funcoes = apenasAtivas ? await funcoesRepository.listar() : await funcoesRepository.listar(() => true);
  return funcoes.sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function criarFuncao(nome) {
  if (!nome || nome.trim().length < 2) throw new Error('Dê um nome válido para a função.');
  const funcao = await funcoesRepository.criar(nome.trim());
  emit('funcao:criada', funcao);
  return funcao;
}

export async function arquivarFuncao(id) {
  await funcoesRepository.arquivar(id);
  emit('funcao:arquivada', { id });
}

export async function getEscalaDoEvento(eventoId) {
  const [escalas, pessoas, funcoes] = await Promise.all([
    escalasRepository.listarPorEvento(eventoId), listarPessoas(), listarFuncoes({ apenasAtivas: false })
  ]);
  return escalas.map(e => ({
    ...e,
    pessoa: pessoas.find(p => p.id === e.pessoaId) || null,
    funcao: funcoes.find(f => f.id === e.funcaoId) || null,
  }));
}

export async function escalarPessoa(eventoId, pessoaId, funcaoId) {
  if (!pessoaId || !funcaoId) throw new Error('Selecione uma pessoa e uma função.');
  const escala = await escalasRepository.criar({ eventoId, pessoaId, funcaoId });
  emit('escala:criada', escala);
  return escala;
}

export async function removerEscala(id) {
  await escalasRepository.remover(id);
  emit('escala:removida', { id });
}

export async function listarEventosParaEscala() {
  const hoje = new Date().toISOString().slice(0, 10);
  return listarEventos(e => !e.data || e.data >= hoje);
}
