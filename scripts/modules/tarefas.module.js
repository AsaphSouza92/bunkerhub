import { tarefasRepository } from '../data/repositories/tarefasRepository.js';
import { emit } from '../core/events.js';

export async function listarTarefas({
  apenasPendentes = false
} = {}) {
  const tarefas = await tarefasRepository.listar(t => {
    const bateConcluida = apenasPendentes ? !t.concluida : true;
    return bateConcluida;
  });

  return tarefas.sort((a, b) => {
    if (a.concluida !== b.concluida) {
      return a.concluida ? 1 : -1;
    }

    if (!a.prazo) return 1;
    if (!b.prazo) return -1;

    return new Date(a.prazo) - new Date(b.prazo);
  });
}

export async function criarTarefa(dados) {
  if (!dados.titulo || dados.titulo.trim().length < 3) {
    throw new Error('Descreva a tarefa com um pouco mais de detalhe.');
  }

  const tarefa = await tarefasRepository.criar(dados);
  emit('tarefa:criada', tarefa);

  return tarefa;
}

export async function atualizarTarefa(id, patch) {
  const tarefa = await tarefasRepository.atualizar(id, patch);
  emit('tarefa:atualizada', tarefa);

  return tarefa;
}

export async function alternarConclusao(id) {
  const tarefa = await tarefasRepository.buscarPorId(id);

  if (!tarefa) {
    return null;
  }

  const novoStatus =
    tarefa.status === 'Concluída'
      ? 'Pendente'
      : 'Concluída';

  const atualizada = await tarefasRepository.atualizar(id, {
    status: novoStatus
  });

  emit('tarefa:atualizada', atualizada);

  return atualizada;
}

export async function arquivarTarefa(id) {
  await tarefasRepository.arquivar(id);
  emit('tarefa:arquivada', { id });
}

export function tarefaEstaAtrasada(tarefa) {
  if (!tarefa.prazo || tarefa.concluida) {
    return false;
  }

  return tarefa.prazo < new Date().toISOString().slice(0, 10);
}