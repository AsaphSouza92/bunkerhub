import { listarEventos } from './eventos.module.js';
import { listarPessoas } from './pessoas.module.js';

async function eventosNoIntervalo(inicio, fim) {
  const eventos = await listarEventos(e => e.data && e.data >= inicio && e.data <= fim);
  return eventos.map(e => ({ data: e.data, tipo: 'evento', titulo: e.nome, ref: e }));
}

async function aniversariosNoMes(ano, mes) {
  const pessoas = await listarPessoas();
  return pessoas.reduce((acc, p) => {
    if (!p.nascimento) return acc;
    const nasc = new Date(p.nascimento + 'T00:00:00');
    if (nasc.getMonth() === mes) {
      const dataFormatada = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(nasc.getDate()).padStart(2, '0')}`;
      acc.push({ data: dataFormatada, tipo: 'aniversario', titulo: `🎂 ${p.nome}`, ref: p });
    }
    return acc;
  }, []);
}

export async function getItensDoMes(ano, mes) {
  const inicio = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const fim = `${ano}-${String(mes + 1).padStart(2, '0')}-${ultimoDia}`;

  const [eventos, aniversarios] = await Promise.all([eventosNoIntervalo(inicio, fim), aniversariosNoMes(ano, mes)]);
  const itens = [...eventos, ...aniversarios];

  return itens.reduce((mapa, item) => {
    if (!mapa[item.data]) mapa[item.data] = [];
    mapa[item.data].push(item);
    return mapa;
  }, {});
}
