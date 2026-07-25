import { listarPessoas } from './pessoas.module.js';
import { listarEventos } from './eventos.module.js';
import { listarFuncoes } from './servico.module.js';
import { relatoriosRepository } from '../data/repositories/relatoriosRepository.js';

function diasAtras(dataStr) {
  return Math.round((new Date() - new Date(dataStr + 'T00:00:00')) / 86400000);
}

export async function getIndicadores() {
  const [pessoas, eventos, relatorios, funcoes] = await Promise.all([
    listarPessoas(), listarEventos(), relatoriosRepository.listar(), listarFuncoes({ apenasAtivas: true })
  ]);
  const hoje = new Date().toISOString().slice(0, 10);

  return {
    jovensAtivos: pessoas.filter(p => p.funcao === 'Jovem').length,
    visitantesTotais: relatorios.reduce((s, r) => s + (r.visitantes || 0), 0),
    eventosRealizados: eventos.filter(e => e.data && e.data <= hoje).length,
    participacaoMedia: relatorios.length ? Math.round(relatorios.reduce((s, r) => s + (r.participantes || 0), 0) / relatorios.length) : 0,
    novosJovens: pessoas.filter(p => p.dataEntrada && diasAtras(p.dataEntrada) <= 30).length,
    equipesAtivas: funcoes.length,
  };
}

export async function getSerieParticipacao(limite = 6) {
  const [relatoriosRaw, eventos] = await Promise.all([relatoriosRepository.listar(), listarEventos()]);
  const relatorios = relatoriosRaw.sort((a, b) => new Date(a.data) - new Date(b.data)).slice(-limite);
  return relatorios.map(r => ({ label: eventos.find(e => e.id === r.eventoId)?.nome?.slice(0, 12) || r.data, participantes: r.participantes || 0 }));
}
