import { pessoasRepository } from '../data/repositories/pessoasRepository.js';
import { eventosRepository } from '../data/repositories/eventosRepository.js';
import { tarefasRepository } from '../data/repositories/tarefasRepository.js';
import { getVersiculoDoDia } from './versiculo.module.js';

function proximoAniversario(pessoas) {
  const hoje = new Date();

  return pessoas
    .map(p => {
      const [ano, mes, dia] = p.nascimento.split('-').map(Number);

      const proximo = new Date(
        hoje.getFullYear(),
        mes - 1,
        dia
      );

      if (proximo < hoje) {
        proximo.setFullYear(hoje.getFullYear() + 1);
      }

      return {
        ...p,
        proximaData: proximo
      };
    })
    .sort((a, b) => a.proximaData - b.proximaData)
    .slice(0, 3);
}

export async function getDashboardData() {
  const [pessoas, eventos, tarefasPendentes, versiculo] =
    await Promise.all([
      pessoasRepository.listar(),
      eventosRepository.listar(),
      tarefasRepository.listar(t => !t.concluida),
      getVersiculoDoDia(),
    ]);

  return {
    versiculo,
    proximoEvento:
      eventos.sort(
        (a, b) => new Date(a.data) - new Date(b.data)
      )[0] || null,

    aniversariantes: proximoAniversario(
      pessoas.filter(p => p.nascimento)
    ),

    tarefasPendentes,
  };
}