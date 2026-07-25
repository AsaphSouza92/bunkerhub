-- ============================================================================
-- BUNKERHUB — MIGRAÇÃO INICIAL PARA SUPABASE (MVP v1.0)
-- Baseado no "Documento de Arquitetura e Especificação Funcional — MVP v1.0"
-- ============================================================================
-- Como usar: cole este arquivo INTEIRO no SQL Editor do Supabase e rode uma
-- única vez, em um projeto novo. A ordem dos blocos importa (FKs dependem de
-- tabelas criadas em blocos anteriores). Cada bloco explica o "porquê" antes
-- do "como", conforme pedido.
-- ============================================================================


-- ############################################################################
-- BLOCO 0 — EXTENSÕES E TIPOS BASE
-- ############################################################################
-- Por quê: pgcrypto dá gen_random_uuid() para chaves primárias UUID.
-- pg_trgm permite busca por nome tolerante a acentos/erros de digitação
-- (ex: buscar "joao" e encontrar "João").
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Papel do usuário DENTRO DE UMA IGREJA (RBAC do MVP).
-- Reparem que 'lider_ministerio' NÃO está aqui — a explicação está no
-- comentário da tabela `ministerios` (Bloco 5): esse papel é sempre
-- relativo a UM ministério específico, então ele não vive num enum solto,
-- vive como atributo do próprio ministério (lider_responsavel_id).
-- 'membro' é reservado para quando pessoas comuns ganharem login (v2/v3) —
-- podemos adicionar 'voluntario' depois com um simples ALTER TYPE ... ADD
-- VALUE, sem remodelar nada.
create type public.papel_usuario as enum (
  'administrador',
  'lider_geral',
  'secretario',
  'membro'
);

-- Status de tarefa: 4 estados, conforme a seção 35 do documento
-- (Pendente / Em andamento / Concluída / Cancelada). Isso substitui o
-- antigo boolean "concluida" do localStorage — ver Bloco 9 para como
-- isso é feito SEM quebrar o código que ainda lê "concluida".
create type public.status_tarefa as enum (
  'Pendente', 'Em andamento', 'Concluída', 'Cancelada'
);


-- ############################################################################
-- BLOCO 1 — IGREJAS (multi-tenant desde o dia 1)
-- ############################################################################
-- Por quê: o documento é explícito (seção 16 — "Preparar para múltiplas
-- igrejas") — mesmo que o MVP rode com uma única igreja, TODA tabela de
-- dados abaixo referencia igreja_id (direta ou indiretamente) desde já.
-- Isso evita a pior forma de dívida técnica: adicionar isolamento
-- multi-tenant depois, com dados de produção já existentes.
create table public.igrejas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  cidade text,
  estado text,
  fuso_horario text not null default 'America/Sao_Paulo',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_igrejas_ativo on public.igrejas (ativo) where deleted_at is null;


-- ############################################################################
-- BLOCO 2 — PROFILES (usuários com login) + integração com auth.users
-- ############################################################################
-- Por quê: a seção 16 do documento é categórica — profiles ≠ pessoas.
-- profiles é "quem tem login" (via Supabase Auth). pessoas (Bloco 4) é
-- "quem está cadastrado na juventude". As duas coisas podem coincidir
-- (um líder tem os dois) ou não (um adolescente sem conta no sistema).
-- Nunca fundir essas duas tabelas — é uma decisão de arquitetura, não um
-- detalhe.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_completo text not null,
  telefone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cria automaticamente um profile quando alguém confirma cadastro no
-- Supabase Auth — evita que o app precise fazer isso manualmente toda vez.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome_completo)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome_completo', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ############################################################################
-- BLOCO 3 — USUARIOS_IGREJA (papel/permissão do usuário em cada igreja)
-- ############################################################################
-- Por quê: um profile pode, no futuro, existir em mais de uma igreja
-- (ex: um pastor de rede acompanhando duas congregações). Por isso o papel
-- (Administrador / Líder Geral / Secretário / Membro) não fica direto no
-- profile — fica numa tabela de relacionamento por igreja. Isso é o que
-- permite multi-igreja e multi-usuário sem remodelar nada depois.
create table public.usuarios_igreja (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references public.igrejas(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  papel public.papel_usuario not null default 'membro',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (igreja_id, profile_id)
);
create index idx_usuarios_igreja_profile on public.usuarios_igreja (profile_id) where ativo;
create index idx_usuarios_igreja_igreja on public.usuarios_igreja (igreja_id) where ativo;


-- ############################################################################
-- BLOCO 4 — PESSOAS (cadastro de membros — SEPARADO de profiles)
-- ############################################################################
-- Por quê: é o núcleo do sistema (seção 13.3). pessoas.profile_id é
-- OPCIONAL — só é preenchido quando essa pessoa também vira usuária do
-- sistema (ex: um Líder de Ministério que também é um jovem cadastrado).
-- "categoria" (Jovem / Líder de Célula / Aspirante / Visitante) é o
-- STATUS da pessoa dentro da juventude — CONCEITO DIFERENTE do vínculo
-- com ministérios (Bloco 6), que agora é N:N. Antes, no localStorage,
-- essas duas coisas já eram campos separados ("funcao" e "ministerio");
-- aqui só renomeamos "funcao" para "categoria" para não colidir com o
-- novo conceito de "papel_usuario", e formalizamos "ministerio" como
-- relacionamento de verdade em vez de texto livre.
create table public.pessoas (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references public.igrejas(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  nome text not null,
  telefone text,
  email text,
  nascimento date,
  categoria text not null default 'Visitante'
    check (categoria in ('Jovem','Líder de Célula','Aspirante','Visitante')),
  data_entrada date not null default current_date,
  observacoes text,
  proximo_acompanhamento date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_pessoas_igreja on public.pessoas (igreja_id) where deleted_at is null;
create index idx_pessoas_profile on public.pessoas (profile_id);
create index idx_pessoas_proximo_acompanhamento on public.pessoas (proximo_acompanhamento) where ativo;
create index idx_pessoas_nome_trgm on public.pessoas using gin (nome gin_trgm_ops);

-- Histórico de acompanhamento — substitui o array JSON "historico[]" do
-- localStorage por linhas de tabela de verdade. Isso é o que permite
-- consultar, ordenar e (no futuro) aplicar RLS por registro — algo que
-- um array dentro de uma coluna JSON não permite fazer bem.
create table public.pessoas_acompanhamentos (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  autor_profile_id uuid references public.profiles(id),
  texto text not null,
  data_registro date not null default current_date,
  created_at timestamptz not null default now()
);
create index idx_acompanhamentos_pessoa on public.pessoas_acompanhamentos (pessoa_id, data_registro desc);


-- ############################################################################
-- BLOCO 5 — MINISTÉRIOS
-- ############################################################################
-- Por quê: organiza as equipes (Louvor, Comunicação, Recepção...).
-- `lider_responsavel_id` identifica o "Líder de Ministério" — a 4ª função
-- descrita no documento (seção 7.3). DE PROPÓSITO não criamos um valor
-- 'lider_ministerio' no enum papel_usuario para representar isso. Motivo:
-- "líder de ministério" só faz sentido associado A UM ministério
-- específico; guardá-lo como um papel solto (sem saber de qual ministério)
-- geraria ambiguidade quando alguém lidera mais de um. Guardar aqui, como
-- atributo do próprio ministério, é a fonte única de verdade — e já
-- prepara o terreno para múltiplos colíderes no futuro (usando
-- pessoa_ministerios.funcao = 'Líder', Bloco 6) SEM precisar remodelar
-- nada quando isso for necessário.
create table public.ministerios (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references public.igrejas(id) on delete cascade,
  nome text not null,
  descricao text,
  tema text,
  lider_responsavel_id uuid references public.profiles(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (igreja_id, nome)
);
create index idx_ministerios_igreja on public.ministerios (igreja_id) where deleted_at is null;


-- ############################################################################
-- BLOCO 6 — PESSOA_MINISTERIOS (N:N — decisão central do documento, seção 14.X)
-- ############################################################################
-- Por quê: uma pessoa pode atuar em vários ministérios ao mesmo tempo
-- (ex: João é Fotógrafo em Comunicação E Voluntário na Recepção). Sem esta
-- tabela intermediária, cada pessoa só poderia ter UM ministério — era
-- exatamente essa a limitação do localStorage (campo "ministerio" como
-- texto livre único). Esta tabela corrige isso.
-- `data_fim` + `ativo` preservam histórico ("Anterior: Comunicação / Atual:
-- Louvor" — seção 32) em vez de sobrescrever o vínculo quando a pessoa
-- muda de equipe.
create table public.pessoa_ministerios (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  funcao text,                 -- ex: "Fotógrafo", "Voluntário", "Líder" (texto livre)
  data_inicio date not null default current_date,
  data_fim date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Só pode existir UM vínculo ATIVO por par pessoa/ministério (histórico de
-- vínculos antigos/inativos pode se acumular sem problema).
create unique index uq_pessoa_ministerio_ativo
  on public.pessoa_ministerios (pessoa_id, ministerio_id) where ativo;
create index idx_pessoa_ministerios_pessoa on public.pessoa_ministerios (pessoa_id) where ativo;
create index idx_pessoa_ministerios_ministerio on public.pessoa_ministerios (ministerio_id) where ativo;

-- Garantia de integridade: impede vincular uma pessoa a um ministério de
-- OUTRA igreja (proteção multi-tenant no nível do banco, não só na RLS).
create or replace function public.checar_pessoa_ministerio_mesma_igreja()
returns trigger language plpgsql as $$
declare
  v_igreja_pessoa uuid;
  v_igreja_ministerio uuid;
begin
  select igreja_id into v_igreja_pessoa from public.pessoas where id = new.pessoa_id;
  select igreja_id into v_igreja_ministerio from public.ministerios where id = new.ministerio_id;
  if v_igreja_pessoa is distinct from v_igreja_ministerio then
    raise exception 'Pessoa e ministério pertencem a igrejas diferentes.';
  end if;
  return new;
end;
$$;

create trigger trg_checar_pessoa_ministerio
  before insert or update on public.pessoa_ministerios
  for each row execute function public.checar_pessoa_ministerio_mesma_igreja();


-- ############################################################################
-- BLOCO 7 — FUNÇÕES DE SERVIÇO (extensão já existente no app atual)
-- ############################################################################
-- Por quê: o app atual já tem a tela "Serviço" (escalas de culto:
-- Recepção, Abertura, Louvor etc. POR EVENTO). O documento de arquitetura
-- não menciona esse módulo — mas ele não conflita em nada com a
-- arquitetura nova, então foi preservado. Diferença importante em relação
-- a pessoa_ministerios: "funcoes_servico" é um catálogo de PAPÉIS DE
-- SERVIÇO POR EVENTO ("quem vai abrir o culto de sábado"), não o vínculo
-- de longo prazo da pessoa com um ministério.
create table public.funcoes_servico (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references public.igrejas(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (igreja_id, nome)
);


-- ############################################################################
-- BLOCO 8 — EVENTOS (+ checklist, participantes, escalas)
-- ############################################################################
-- Por quê: a seção 34 do documento é explícita — "Evento deve possuir:
-- título, data, responsável, IGREJA VINCULADA". Ou seja, o evento
-- pertence à IGREJA, não a um ministério específico (um culto pode
-- envolver vários ministérios ao mesmo tempo). `ministerio_id` fica como
-- filtro OPCIONAL (ex: "Reunião interna do Ministério de Louvor").
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references public.igrejas(id) on delete cascade,
  ministerio_id uuid references public.ministerios(id) on delete set null,
  nome text not null,
  descricao text,
  responsavel_pessoa_id uuid references public.pessoas(id),
  criado_por uuid references public.profiles(id),
  equipe text,
  local text,
  data date,
  horario time,
  observacoes text,
  origem_ideia_id uuid,        -- FK adicionada no Bloco 11 (ideias ainda não existe aqui)
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_eventos_igreja_data on public.eventos (igreja_id, data) where deleted_at is null;
create index idx_eventos_ministerio on public.eventos (ministerio_id) where deleted_at is null;

-- Itens de checklist do evento — substitui o array JSON "checklist[]".
create table public.eventos_checklist_itens (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  texto text not null,
  feito boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_checklist_evento on public.eventos_checklist_itens (evento_id, ordem);

-- Participantes do evento — a tabela de relacionamento descrita na seção
-- 13.6 do documento ("evita duplicação de dados e facilita relatórios").
-- Substitui o array vazio "participantes[]" que só existia como
-- placeholder no localStorage (nunca foi de fato usado pela UI).
create table public.eventos_participantes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  confirmado boolean not null default false,
  presente boolean,
  created_at timestamptz not null default now(),
  unique (evento_id, pessoa_id)
);
create index idx_eventos_participantes_pessoa on public.eventos_participantes (pessoa_id);

-- Escalas de serviço (quem faz o quê em cada evento) — módulo "Serviço" já
-- existente no app.
create table public.escalas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  funcao_servico_id uuid not null references public.funcoes_servico(id) on delete restrict,
  confirmado boolean not null default false,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evento_id, pessoa_id, funcao_servico_id)
);
create index idx_escalas_evento on public.escalas (evento_id);
create index idx_escalas_pessoa on public.escalas (pessoa_id);


-- ############################################################################
-- BLOCO 9 — TAREFAS
-- ############################################################################
-- Por quê: seção 35 do documento — toda tarefa tem responsável (pessoa),
-- prazo, prioridade e status. O status agora tem 4 estados (Pendente / Em
-- andamento / Concluída / Cancelada) em vez do antigo boolean "concluida"
-- do app atual. Para NÃO quebrar o código existente enquanto a tela de
-- Tarefas ainda não for atualizada, criamos uma coluna GERADA
-- (generated column) que deriva "concluida" a partir do status — o app
-- antigo consegue ler item.concluida sem alteração imediata, e o campo
-- novo (status) já existe pronto para quando o JS for adaptado.
create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references public.igrejas(id) on delete cascade,
  ministerio_id uuid references public.ministerios(id) on delete set null,
  evento_id uuid references public.eventos(id) on delete set null,
  titulo text not null,
  descricao text,
  responsavel_pessoa_id uuid references public.pessoas(id),
  criado_por uuid references public.profiles(id),
  prazo date,
  prioridade text not null default 'Média' check (prioridade in ('Baixa','Média','Alta')),
  status public.status_tarefa not null default 'Pendente',
  concluida boolean generated always as (status = 'Concluída') stored,
  concluida_em timestamptz,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_tarefas_igreja_responsavel on public.tarefas (igreja_id, responsavel_pessoa_id) where deleted_at is null;
create index idx_tarefas_prazo on public.tarefas (prazo) where status not in ('Concluída','Cancelada') and deleted_at is null;


-- ############################################################################
-- BLOCO 10 — RELATÓRIOS
-- ############################################################################
-- Por quê: seção 36 e os exemplos do documento ("relatório de evento /
-- de célula / de ministério") — por isso relatorios não fica preso
-- apenas a um evento como antes. `tipo` indica a natureza do relatório;
-- `evento_id` continua único, mas SÓ quando tipo = 'Evento' (índice único
-- parcial), preservando a regra antiga do app ("um evento só pode ter um
-- relatório") sem impedir os novos tipos que o documento pede.
create table public.relatorios (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references public.igrejas(id) on delete cascade,
  ministerio_id uuid references public.ministerios(id) on delete set null,
  evento_id uuid references public.eventos(id) on delete cascade,
  tipo text not null default 'Evento' check (tipo in ('Evento','Ministério','Célula')),
  data date not null default current_date,
  participantes int not null default 0 check (participantes >= 0),
  visitantes int not null default 0 check (visitantes >= 0),
  resumo text,
  pontos_positivos text,
  pontos_melhoria text,
  proximas_acoes text,
  autor_profile_id uuid references public.profiles(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index uq_relatorio_evento_unico
  on public.relatorios (evento_id)
  where tipo = 'Evento' and evento_id is not null and deleted_at is null;
create index idx_relatorios_igreja_data on public.relatorios (igreja_id, data) where deleted_at is null;


-- ############################################################################
-- BLOCO 11 — BANCO DE IDEIAS (extensão já existente — fora do escopo do
-- documento, mas mantida por já estar em uso e não conflitar com a arquitetura)
-- ############################################################################
create table public.ideias (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references public.igrejas(id) on delete cascade,
  ministerio_id uuid references public.ministerios(id) on delete set null,
  titulo text not null,
  categoria text not null default 'Geral' check (categoria in ('Geral','Evento','Discipulado','Melhoria')),
  descricao text,
  criado_por uuid references public.profiles(id),
  data date not null default current_date,
  prioridade text not null default 'Média' check (prioridade in ('Baixa','Média','Alta')),
  status text not null default 'Rascunho' check (status in ('Rascunho','Em análise','Aprovado','Arquivado')),
  transformada_evento_id uuid references public.eventos(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_ideias_igreja_status on public.ideias (igreja_id, status) where deleted_at is null;

-- Agora sim: adiciona a FK pendente de eventos.origem_ideia_id -> ideias
-- (não podia ser criada no Bloco 8 porque a tabela ideias ainda não existia).
alter table public.eventos
  add constraint fk_eventos_origem_ideia
  foreign key (origem_ideia_id) references public.ideias(id) on delete set null;


-- ############################################################################
-- BLOCO 12 — NOTIFICAÇÕES (Comunicação — antigo "QG" do app)
-- ############################################################################
-- Por quê: a seção 13.9 e o módulo 8 do documento chamam essa entidade de
-- "notificações" — é o MESMO conceito da tela "QG" que já existe no app
-- (mural de avisos fixados). Renomeamos aqui para alinhar com o documento;
-- o JS precisa ser ajustado (ver plano de adaptação de código).
-- `ministerio_alvo_id = null` significa "para todos" (seção 37 — um
-- comunicado pode ser para todos, um ministério ou um grupo).
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references public.igrejas(id) on delete cascade,
  ministerio_alvo_id uuid references public.ministerios(id) on delete set null,
  titulo text not null,
  conteudo text not null,
  autor_profile_id uuid references public.profiles(id),
  fixado boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_notificacoes_igreja_fixado on public.notificacoes (igreja_id, fixado desc, created_at desc) where deleted_at is null;


-- ############################################################################
-- BLOCO 13 — BIBLIOTECA (documento classifica como "futuro próximo" — já
-- existe no app, mantida, mas com prioridade baixa na ordem de migração)
-- ############################################################################
create table public.materiais_biblioteca (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references public.igrejas(id) on delete cascade,
  ministerio_id uuid references public.ministerios(id) on delete set null,
  titulo text not null,
  categoria text not null default 'Geral',
  tipo text not null default 'Documento' check (tipo in ('Documento','Link','Vídeo','Áudio')),
  url text,
  arquivo_storage_path text,
  descricao text,
  autor text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_biblioteca_igreja_categoria on public.materiais_biblioteca (igreja_id, categoria) where deleted_at is null;


-- ############################################################################
-- BLOCO 14 — VERSÍCULOS (conteúdo devocional — compartilhado por padrão)
-- ############################################################################
-- Por quê: o documento cita "Devocionais" como entidade futura;
-- versículos já é uma versão simples disso, hoje compartilhada entre
-- todas as igrejas (igreja_id = null). Deixamos a coluna pronta para
-- quando uma igreja quiser cadastrar versículos próprios, sem remodelar.
create table public.versiculos (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid references public.igrejas(id) on delete cascade,
  referencia text not null,
  texto text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);


-- ############################################################################
-- BLOCO 15 — updated_at AUTOMÁTICO
-- ############################################################################
-- Por quê: em vez de cada repositório JS lembrar de setar updatedAt na mão
-- (como faz hoje o localStorageProvider), o próprio banco garante isso.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
  tabelas text[] := array[
    'igrejas','profiles','usuarios_igreja','pessoas',
    'ministerios','pessoa_ministerios','funcoes_servico','eventos',
    'eventos_checklist_itens','escalas','tarefas','relatorios','ideias',
    'notificacoes','materiais_biblioteca'
  ];
begin
  foreach t in array tabelas loop
    execute format(
      'create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t
    );
  end loop;
end $$;


-- ############################################################################
-- BLOCO 16 — FUNÇÕES AUXILIARES DE RLS
-- ############################################################################
-- Por quê: essas funções ficam "security definer" de propósito — é o
-- padrão recomendado pelo próprio Supabase para evitar RECURSÃO de RLS
-- (uma policy que consulta uma tabela que também tem RLS ativado).
create or replace function public.papel_na_igreja(p_igreja_id uuid)
returns public.papel_usuario
language sql stable security definer set search_path = public
as $$
  select ui.papel
  from public.usuarios_igreja ui
  where ui.igreja_id = p_igreja_id
    and ui.profile_id = auth.uid()
    and ui.ativo
  limit 1;
$$;

create or replace function public.pertence_a_igreja(p_igreja_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.usuarios_igreja ui
    where ui.igreja_id = p_igreja_id
      and ui.profile_id = auth.uid()
      and ui.ativo
  );
$$;

create or replace function public.e_admin_ou_lider_geral(p_igreja_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.papel_na_igreja(p_igreja_id) in ('administrador','lider_geral');
$$;

create or replace function public.e_lider_do_ministerio(p_ministerio_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.ministerios m
    where m.id = p_ministerio_id and m.lider_responsavel_id = auth.uid()
  );
$$;

-- Helpers para tabelas "filhas" que não têm igreja_id direto — usados
-- pelas políticas do Bloco 17.
create or replace function public.igreja_do_evento(p_evento_id uuid) returns uuid
language sql stable security definer set search_path = public
as $$ select igreja_id from public.eventos where id = p_evento_id; $$;

create or replace function public.igreja_da_pessoa(p_pessoa_id uuid) returns uuid
language sql stable security definer set search_path = public
as $$ select igreja_id from public.pessoas where id = p_pessoa_id; $$;


-- ############################################################################
-- BLOCO 17 — ROW LEVEL SECURITY (política simples, própria de MVP)
-- ############################################################################
-- Por quê: seguindo a orientação de não criar políticas excessivamente
-- complexas nesta primeira versão, a regra do MVP é:
--   SELECT / INSERT / UPDATE: qualquer usuário vinculado àquela igreja
--   (pertence_a_igreja) pode ver e mexer nos dados da própria igreja.
--   DELETE definitivo: só administrador ou líder geral.
-- As regras mais finas do documento (seção 39 — ex: secretário só
-- cadastra pessoas mas não acessa relatórios; líder de ministério só vê
-- o seu ministério) ficam DOCUMENTADAS no plano de adaptação como
-- políticas de v1.1, a aplicar DEPOIS que o MVP estiver validado em uso
-- real — exatamente como pedido.

alter table public.igrejas enable row level security;
create policy "igrejas_select" on public.igrejas for select
  using (public.pertence_a_igreja(id));
create policy "igrejas_update_admin" on public.igrejas for update
  using (public.e_admin_ou_lider_geral(id));

alter table public.usuarios_igreja enable row level security;
create policy "usuarios_igreja_select" on public.usuarios_igreja for select
  using (public.pertence_a_igreja(igreja_id));
create policy "usuarios_igreja_insert_admin" on public.usuarios_igreja for insert
  with check (public.e_admin_ou_lider_geral(igreja_id));
create policy "usuarios_igreja_update_admin" on public.usuarios_igreja for update
  using (public.e_admin_ou_lider_geral(igreja_id));

alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.usuarios_igreja ui1
      join public.usuarios_igreja ui2 on ui1.igreja_id = ui2.igreja_id
      where ui1.profile_id = auth.uid() and ui2.profile_id = profiles.id
    )
  );
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid());

-- Tabelas com igreja_id direto: mesmo padrão simples para todas, gerado
-- em loop para evitar repetição de 9 blocos idênticos.
do $$
declare
  t text;
  tabelas text[] := array[
    'pessoas','ministerios','eventos','tarefas','relatorios','ideias',
    'notificacoes','materiais_biblioteca','funcoes_servico'
  ];
begin
  foreach t in array tabelas loop
    execute format('alter table public.%I enable row level security;', t);

    execute format(
      'create policy %I on public.%I for select using (public.pertence_a_igreja(igreja_id));',
      t || '_select', t
    );
    execute format(
      'create policy %I on public.%I for insert with check (public.pertence_a_igreja(igreja_id));',
      t || '_insert', t
    );
    execute format(
      'create policy %I on public.%I for update using (public.pertence_a_igreja(igreja_id)) with check (public.pertence_a_igreja(igreja_id));',
      t || '_update', t
    );
    execute format(
      'create policy %I on public.%I for delete using (public.e_admin_ou_lider_geral(igreja_id));',
      t || '_delete_admin', t
    );
  end loop;
end $$;

-- Tabelas "filhas" sem igreja_id direto (RLS via join até o evento/pessoa).
alter table public.pessoas_acompanhamentos enable row level security;
create policy "acompanhamentos_select" on public.pessoas_acompanhamentos for select
  using (public.pertence_a_igreja(public.igreja_da_pessoa(pessoa_id)));
create policy "acompanhamentos_insert" on public.pessoas_acompanhamentos for insert
  with check (public.pertence_a_igreja(public.igreja_da_pessoa(pessoa_id)));

alter table public.pessoa_ministerios enable row level security;
create policy "pessoa_ministerios_select" on public.pessoa_ministerios for select
  using (public.pertence_a_igreja(public.igreja_da_pessoa(pessoa_id)));
create policy "pessoa_ministerios_insert" on public.pessoa_ministerios for insert
  with check (public.pertence_a_igreja(public.igreja_da_pessoa(pessoa_id)));
create policy "pessoa_ministerios_update" on public.pessoa_ministerios for update
  using (public.pertence_a_igreja(public.igreja_da_pessoa(pessoa_id)));

alter table public.eventos_checklist_itens enable row level security;
create policy "checklist_select" on public.eventos_checklist_itens for select
  using (public.pertence_a_igreja(public.igreja_do_evento(evento_id)));
create policy "checklist_insert" on public.eventos_checklist_itens for insert
  with check (public.pertence_a_igreja(public.igreja_do_evento(evento_id)));
create policy "checklist_update" on public.eventos_checklist_itens for update
  using (public.pertence_a_igreja(public.igreja_do_evento(evento_id)));

alter table public.eventos_participantes enable row level security;
create policy "participantes_select" on public.eventos_participantes for select
  using (public.pertence_a_igreja(public.igreja_do_evento(evento_id)));
create policy "participantes_insert" on public.eventos_participantes for insert
  with check (public.pertence_a_igreja(public.igreja_do_evento(evento_id)));
create policy "participantes_update" on public.eventos_participantes for update
  using (public.pertence_a_igreja(public.igreja_do_evento(evento_id)));

alter table public.escalas enable row level security;
create policy "escalas_select" on public.escalas for select
  using (public.pertence_a_igreja(public.igreja_do_evento(evento_id)));
create policy "escalas_insert" on public.escalas for insert
  with check (public.pertence_a_igreja(public.igreja_do_evento(evento_id)));
create policy "escalas_update" on public.escalas for update
  using (public.pertence_a_igreja(public.igreja_do_evento(evento_id)));

-- Versículos: conteúdo compartilhado, só leitura via app (gestão via
-- migração/service role, por isso não há policy de insert/update aqui).
alter table public.versiculos enable row level security;
create policy "versiculos_select" on public.versiculos for select
  using (igreja_id is null or public.pertence_a_igreja(igreja_id));


-- ############################################################################
-- BLOCO 18 — BOOTSTRAP (criar a primeira igreja + administrador) e seeds
-- ############################################################################
-- Por quê: alguém precisa criar a primeira igreja e virar administrador
-- dela de forma atômica — isso não deve ser feito por INSERTs soltos no
-- app (favoreceria erro/inconsistência), e sim por uma função assinada,
-- chamada via supabase.rpc(...) depois do primeiro login.
create or replace function public.criar_igreja_com_admin(
  p_nome text,
  p_slug text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_igreja_id uuid;
begin
  insert into public.igrejas (nome, slug) values (p_nome, p_slug)
  returning id into v_igreja_id;

  insert into public.usuarios_igreja (igreja_id, profile_id, papel)
  values (v_igreja_id, auth.uid(), 'administrador');

  return v_igreja_id;
end;
$$;

-- Semeia as funções de serviço padrão quando uma igreja nova é criada
-- (mesma lista que o app já usa hoje em funcoesRepository.seedPadrao).
-- security definer é necessário aqui: o trigger dispara ANTES de existir
-- um usuarios_igreja para o criador, então sem bypass de RLS o insert
-- seria bloqueado pela própria política que acabamos de criar.
create or replace function public.seed_funcoes_servico_padrao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.funcoes_servico (igreja_id, nome) values
    (new.id, 'Recepção'), (new.id, 'Abertura do culto'), (new.id, 'Leitura bíblica'),
    (new.id, 'Oração inicial'), (new.id, 'Oração final'), (new.id, 'Água'),
    (new.id, 'Ornamentação'), (new.id, 'Organização'), (new.id, 'Limpeza'), (new.id, 'Eventos');
  return new;
end;
$$;

create trigger trg_seed_funcoes_servico
  after insert on public.igrejas
  for each row execute function public.seed_funcoes_servico_padrao();

-- Semeia os versículos globais (idempotente: só roda se a tabela estiver vazia).
insert into public.versiculos (referencia, texto)
select * from (values
  ('Salmos 27:1', 'O Senhor é a minha luz e a minha salvação; a quem temerei?'),
  ('Provérbios 3:5-6', 'Confia no Senhor de todo o teu coração e não te apoies no teu próprio entendimento.'),
  ('Josué 1:9', 'Sê forte e corajoso; não temas, nem te espantes, porque o Senhor teu Deus é contigo.'),
  ('Filipenses 4:13', 'Tudo posso naquele que me fortalece.'),
  ('Isaías 41:10', 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.')
) as v(referencia, texto)
where not exists (select 1 from public.versiculos);

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================
