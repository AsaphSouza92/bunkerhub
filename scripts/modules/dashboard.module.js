import { pessoasRepository } from '../data/repositories/pessoasRepository.js';
import { eventosRepository } from '../data/repositories/eventosRepository.js';
import { tarefasRepository } from '../data/repositories/tarefasRepository.js';
import { getVersiculoDoDia } from './versiculo.module.js';

function criarDataLocal(dataString) {
  if (!dataString) return null;

  const [ano, mes, dia] = String(dataString).split('-').map(Number);

  if (!ano || !mes || !dia) return null;

  return new Date(ano, mes - 1, dia);
}

function aniversariantesDoMes(pessoas) {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  return pessoas
    .filter(p => {
      if (!p?.nascimento) return false;

      const partes = String(p.nascimento).split('-').map(Number);

      if (partes.length !== 3) return false;

      const mes = partes[1];

      return mes - 1 === mesAtual;
    })
    .map(p => {
      const dataAniversario = criarDataLocal(p.nascimento);

      return {
        ...p,
        proximaData: new Date(
          anoAtual,
          dataAniversario.getMonth(),
          dataAniversario.getDate()
        ),
        diaAniversario: dataAniversario.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
        }),
      };
    })
    .sort((a, b) => a.proximaData - b.proximaData);
}

function proximoEventoFuturo(eventos) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return eventos
    .filter(evento => {
      if (!evento?.data) return false;

      const dataEvento = criarDataLocal(evento.data);

      if (!dataEvento) return false;

      dataEvento.setHours(0, 0, 0, 0);

      return dataEvento >= hoje;
    })
    .sort((a, b) => {
      const dataA = criarDataLocal(a.data);
      const dataB = criarDataLocal(b.data);

      return dataA - dataB;
    })[0] || null;
}

export async function getDashboardData() {
  const [pessoas, eventos, tarefasPendentes, versiculo] =
    await Promise.all([
      pessoasRepository.listar(),
      eventosRepository.listar(),
      tarefasRepository.listar(t => !t.concluida),
      getVersiculoDoDia(),
    ]);

  const aniversariantes = aniversariantesDoMes(pessoas);

  const proximoEvento = proximoEventoFuturo(eventos);

  console.log('[Dashboard] Pessoas carregadas:', pessoas);
  console.log('[Dashboard] Eventos carregados:', eventos);
  console.log('[Dashboard] Aniversariantes do mês:', aniversariantes);
  console.log('[Dashboard] Próximo evento:', proximoEvento);

  return {
    versiculo,
    proximoEvento,
    aniversariantes,
    tarefasPendentes,
  };
}