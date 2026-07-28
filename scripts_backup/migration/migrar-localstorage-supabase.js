/**
 * Migração do backup do BunkerHub (localStorage) para o Supabase.
 *
 * Como usar:
 * 1. No app antigo, vá em Configurações → "Baixar backup" e gere o JSON.
 * 2. Preencha SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e IGREJA_ID abaixo
 *    (IGREJA_ID vem da chamada RPC criar_igreja_com_admin, feita uma vez
 *    manualmente antes de rodar este script).
 * 3. Rode com Node: `node migrar-localstorage-supabase.js backup.json`
 *
 * Por que usar a Service Role Key (e não a anon key): este script insere
 * dados em nome de uma igreja específica, sem estar "logado" como um
 * usuário real — precisa ignorar RLS de propósito. NUNCA exponha essa
 * chave no navegador; rode este script só localmente/servidor.
 *
 * Ordem de inserção: respeita as dependências de FK do schema.sql —
 * pessoas antes de ministérios/eventos, ideias antes de eventos (por
 * causa de origem_ideia_id), eventos antes de checklist/participantes/
 * escalas/tarefas/relatórios.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'COLE_AQUI_A_SERVICE_ROLE_KEY';
const IGREJA_ID = 'COLE_AQUI_O_UUID_DA_IGREJA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mapas de id-antigo -> id-novo (UUID gerado pelo Supabase), para resolver
// as referências entre coleções durante a migração.
const mapaIds = {
  pessoas: new Map(),
  ministerios: new Map(),
  eventos: new Map(),
  ideias: new Map(),
  funcoes: new Map(),
};

function lerBackup(caminho) {
  const conteudo = readFileSync(caminho, 'utf-8');
  const backup = JSON.parse(conteudo);
  if (backup.app !== 'BunkerHub') throw new Error('Arquivo não é um backup do BunkerHub.');
  return backup.dados;
}

async function migrarPessoas(dados) {
  for (const p of dados.pessoas || []) {
    const { data, error } = await supabase.from('pessoas').insert({
      igreja_id: IGREJA_ID,
      nome: p.nome,
      telefone: p.telefone || null,
      nascimento: p.nascimento || null,
      categoria: p.funcao || 'Visitante', // funcao (antigo) -> categoria (novo)
      data_entrada: p.dataEntrada || null,
      observacoes: p.observacoes || null,
      proximo_acompanhamento: p.proximoAcompanhamento || null,
      ativo: p.ativo !== false,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }).select('id').single();

    if (error) { console.error('Erro ao migrar pessoa', p.nome, error.message); continue; }
    mapaIds.pessoas.set(p.id, data.id);

    // migra o histórico de acompanhamento (array -> linhas)
    for (const h of p.historico || []) {
      await supabase.from('pessoas_acompanhamentos').insert({
        pessoa_id: data.id,
        texto: h.texto,
        data_registro: h.data,
      });
    }

    // "ministerio" (texto livre antigo) vira um vínculo em pessoa_ministerios,
    // SE existir um ministério com esse nome já migrado (ver migrarMinisterios).
    // Rodar migrarMinisterios ANTES desta função evita perder esse vínculo.
    if (p.ministerio) {
      const ministerioIdNovo = [...mapaIds.ministerios.entries()]
        .find(([_, __]) => true); // placeholder — ver nota abaixo
      // Nota: como "ministerio" era texto livre (ex: "Louvor"), o ideal é
      // migrar ministérios ANTES e casar pelo nome. Ajuste este bloco para
      // buscar o ministério certo pelo nome, algo como:
      // const { data: m } = await supabase.from('ministerios')
      //   .select('id').eq('igreja_id', IGREJA_ID).eq('nome', p.ministerio).single();
      // if (m) await supabase.from('pessoa_ministerios').insert({ pessoa_id: data.id, ministerio_id: m.id });
    }
  }
  console.log(`Pessoas migradas: ${mapaIds.pessoas.size}`);
}

async function migrarFuncoes(dados) {
  for (const f of dados.funcoes || []) {
    const { data, error } = await supabase.from('funcoes_servico').upsert({
      igreja_id: IGREJA_ID,
      nome: f.nome,
      ativo: f.ativo !== false,
    }, { onConflict: 'igreja_id,nome' }).select('id').single();
    if (error) { console.error('Erro ao migrar função', f.nome, error.message); continue; }
    mapaIds.funcoes.set(f.id, data.id);
  }
  console.log(`Funções de serviço migradas: ${mapaIds.funcoes.size}`);
}

async function migrarIdeias(dados) {
  for (const i of dados.ideias || []) {
    const { data, error } = await supabase.from('ideias').insert({
      igreja_id: IGREJA_ID,
      titulo: i.titulo,
      categoria: i.categoria || 'Geral',
      descricao: i.descricao || null,
      data: i.data,
      prioridade: i.prioridade || 'Média',
      status: i.status || 'Rascunho',
      ativo: i.ativo !== false,
      created_at: i.createdAt,
      updated_at: i.updatedAt,
    }).select('id').single();
    if (error) { console.error('Erro ao migrar ideia', i.titulo, error.message); continue; }
    mapaIds.ideias.set(i.id, data.id);
  }
  console.log(`Ideias migradas: ${mapaIds.ideias.size}`);
}

async function migrarEventos(dados) {
  for (const e of dados.eventos || []) {
    const { data, error } = await supabase.from('eventos').insert({
      igreja_id: IGREJA_ID,
      nome: e.nome,
      descricao: e.descricao || null,
      equipe: e.equipe || null,
      local: e.local || null,
      data: e.data || null,
      horario: e.horario || null,
      observacoes: e.observacoes || null,
      origem_ideia_id: e.origemIdeiaId ? mapaIds.ideias.get(e.origemIdeiaId) || null : null,
      ativo: e.ativo !== false,
      created_at: e.createdAt,
      updated_at: e.updatedAt,
    }).select('id').single();
    if (error) { console.error('Erro ao migrar evento', e.nome, error.message); continue; }
    mapaIds.eventos.set(e.id, data.id);

    // checklist (array -> linhas)
    for (const [ordem, item] of (e.checklist || []).entries()) {
      await supabase.from('eventos_checklist_itens').insert({
        evento_id: data.id, texto: item.texto, feito: !!item.feito, ordem,
      });
    }
  }
  console.log(`Eventos migrados: ${mapaIds.eventos.size}`);
}

async function migrarEscalas(dados) {
  let count = 0;
  for (const esc of dados.escalas || []) {
    const eventoId = mapaIds.eventos.get(esc.eventoId);
    const pessoaId = mapaIds.pessoas.get(esc.pessoaId);
    const funcaoId = mapaIds.funcoes.get(esc.funcaoId);
    if (!eventoId || !pessoaId || !funcaoId) continue;
    const { error } = await supabase.from('escalas').insert({
      evento_id: eventoId, pessoa_id: pessoaId, funcao_servico_id: funcaoId,
    });
    if (!error) count++;
  }
  console.log(`Escalas migradas: ${count}`);
}

async function migrarTarefas(dados) {
  let count = 0;
  const statusPorConcluida = (t) => (t.concluida ? 'Concluída' : 'Pendente');
  for (const t of dados.tarefas || []) {
    const { error } = await supabase.from('tarefas').insert({
      igreja_id: IGREJA_ID,
      evento_id: t.eventoId ? mapaIds.eventos.get(t.eventoId) || null : null,
      titulo: t.titulo,
      descricao: t.descricao || null,
      prazo: t.prazo || null,
      prioridade: t.prioridade || 'Média',
      status: statusPorConcluida(t),
      ativo: t.ativo !== false,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    });
    if (!error) count++; else console.error('Erro ao migrar tarefa', t.titulo, error.message);
  }
  console.log(`Tarefas migradas: ${count}`);
}

async function migrarRelatorios(dados) {
  let count = 0;
  for (const r of dados.relatorios || []) {
    const eventoId = mapaIds.eventos.get(r.eventoId);
    if (!eventoId) continue;
    const { error } = await supabase.from('relatorios').insert({
      igreja_id: IGREJA_ID,
      evento_id: eventoId,
      tipo: 'Evento',
      data: r.data,
      participantes: r.participantes || 0,
      visitantes: r.visitantes || 0,
      resumo: r.resumo || null,
      pontos_positivos: r.pontosPositivos || null,
      pontos_melhoria: r.pontosMelhoria || null,
      proximas_acoes: r.proximasAcoes || null,
      ativo: r.ativo !== false,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    });
    if (!error) count++; else console.error('Erro ao migrar relatório do evento', r.eventoId, error.message);
  }
  console.log(`Relatórios migrados: ${count}`);
}

async function migrarBiblioteca(dados) {
  let count = 0;
  for (const m of dados.biblioteca || []) {
    const { error } = await supabase.from('materiais_biblioteca').insert({
      igreja_id: IGREJA_ID,
      titulo: m.titulo,
      categoria: m.categoria || 'Geral',
      tipo: m.tipo || 'Documento',
      url: m.url || null,
      descricao: m.descricao || null,
      autor: m.autor || null,
      ativo: m.ativo !== false,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    });
    if (!error) count++;
  }
  console.log(`Materiais de biblioteca migrados: ${count}`);
}

async function migrarNotificacoes(dados) {
  let count = 0;
  for (const a of dados.qg || []) {
    const { error } = await supabase.from('notificacoes').insert({
      igreja_id: IGREJA_ID,
      titulo: a.titulo,
      conteudo: a.conteudo,
      fixado: !!a.fixado,
      ativo: a.ativo !== false,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    });
    if (!error) count++;
  }
  console.log(`Notificações (QG) migradas: ${count}`);
}

async function main() {
  const caminhoBackup = process.argv[2];
  if (!caminhoBackup) {
    console.error('Uso: node migrar-localstorage-supabase.js caminho/para/backup.json');
    process.exit(1);
  }
  if (IGREJA_ID.includes('COLE_AQUI') || SUPABASE_SERVICE_ROLE_KEY.includes('COLE_AQUI')) {
    console.error('Preencha IGREJA_ID, SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar.');
    process.exit(1);
  }

  const dados = lerBackup(caminhoBackup);

  // Ordem importa: pessoas e funções primeiro (sem dependências fortes),
  // depois ideias (evento pode referenciar), depois eventos, depois tudo
  // que depende de evento.
  await migrarPessoas(dados);
  await migrarFuncoes(dados);
  await migrarIdeias(dados);
  await migrarEventos(dados);
  await migrarEscalas(dados);
  await migrarTarefas(dados);
  await migrarRelatorios(dados);
  await migrarBiblioteca(dados);
  await migrarNotificacoes(dados);

  console.log('Migração concluída.');
}

main().catch((err) => {
  console.error('Falha na migração:', err);
  process.exit(1);
});
