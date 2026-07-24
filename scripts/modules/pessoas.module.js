import { pessoasRepository } from '../data/repositories/pessoasRepository.js';
import { emit } from '../core/events.js';

export async function listarPessoas({ busca = '', funcao = '' } = {}) {
  const pessoas = await pessoasRepository.listar(p => {
    const bateBusca = busca ? p.nome.toLowerCase().includes(busca.toLowerCase()) : true;
    const bateFuncao = funcao ? p.funcao === funcao : true;
    return bateBusca && bateFuncao;
  });
  return pessoas.sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function pessoasComAcompanhamentoAtrasado() {
  const hoje = new Date().toISOString().slice(0, 10);
  return pessoasRepository.listar(p => p.proximoAcompanhamento && p.proximoAcompanhamento <= hoje);
}

export async function salvarPessoa(dados, id = null) {
  if (!dados.nome || dados.nome.trim().length < 2) throw new Error('Informe um nome válido.');
  const pessoa = id ? await pessoasRepository.atualizar(id, dados) : await pessoasRepository.criar(dados);
  emit('pessoa:salva', pessoa);
  return pessoa;
}

export async function arquivarPessoa(id) {
  await pessoasRepository.arquivar(id);
  emit('pessoa:arquivada', { id });
}

export async function registrarAcompanhamento(id, nota, proximaData) {
  await pessoasRepository.adicionarHistorico(id, nota);
  await pessoasRepository.atualizar(id, { proximoAcompanhamento: proximaData || null });
  emit('pessoa:acompanhamento-registrado', { id });
}
