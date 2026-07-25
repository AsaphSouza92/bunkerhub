# BunkerHub — Arquitetura Supabase: Análise, Modelo, Migração e Adaptação

Este documento acompanha `supabase/schema.sql` e responde aos 6 artefatos
pedidos: (1) análise da arquitetura atual, (2) modelo de dados, (3) SQL —
está no arquivo `.sql` separado, comentado bloco a bloco, (4) plano de
migração, (5) plano de adaptação do código, (6) checklist de validação.

Baseado no "Documento de Arquitetura e Especificação Funcional — MVP v1.0".

---

## 1. Análise da arquitetura atual

**A estrutura em camadas do código (`page.js` → `module.js` → `repository`
→ `provider`) é compatível com o documento.** Ela já isola a UI da lógica
de negócio, e a lógica de negócio do formato de armazenamento — é
exatamente o padrão que permite trocar `localStorageProvider` por
`supabaseProvider` sem reescrever telas. Isso não muda.

O que **não** é compatível e precisa de ajuste (com justificativa):

| Decisão antiga (localStorage) | Decisão nova (documento) | Por quê muda |
|---|---|---|
| `pessoa.ministerio` era texto livre único ("Louvor") | `pessoa_ministerios` (N:N) | Seção 14.X do documento: uma pessoa pode estar em vários ministérios ao mesmo tempo, com uma função em cada um. Texto livre único não representa isso. |
| `pessoa.funcao` (Jovem/Líder de Célula/Aspirante/Visitante) | Renomeado para `pessoa.categoria` | Evita colisão de nome com o novo conceito de `papel_usuario` (permissão de sistema) e com `pessoa_ministerios.funcao` (papel dentro de um ministério). O **conceito em si não mudou** — é o mesmo status que já existia. |
| `tarefa.concluida` (boolean) | `tarefa.status` (4 estados) | Seção 35 do documento pede Pendente/Em andamento/Concluída/Cancelada. Mantivemos `concluida` como coluna **gerada** a partir de `status`, então nada quebra até a tela ser atualizada. |
| Array `participantes[]` dentro do evento (nunca usado de fato pela UI) | Tabela `eventos_participantes` | Seção 13.6: "tabela de relacionamento... evita duplicação e facilita relatórios". Formaliza algo que já era um placeholder vazio. |
| Array `historico[]` dentro da pessoa | Tabela `pessoas_acompanhamentos` | Um array dentro de uma coluna não pode ser indexado, ordenado no banco, nem ter RLS por linha. |
| Tela "QG" (avisos fixados) | Tabela `notificacoes` | O documento nomeia essa entidade como `notificacoes` (seção 13.9). É o mesmo conceito, só o nome muda. |
| Usuário mockado (`mock-user`) fixo no `store.js` | `auth.uid()` real via Supabase Auth | Login deixa de ser simulado. |

Módulos do app atual **fora do escopo do documento** (Banco de Ideias,
Biblioteca, Serviço/Escalas, Versículos) não conflitam com a arquitetura
nova — foram mantidos como extensões, e classificados no plano de
migração (seção 4) conforme a prioridade que o próprio documento já dá a
conceitos parecidos (ex: Biblioteca já é "futuro próximo" no documento).

---

## 2. Modelo de dados

### 2.1 Tabelas e finalidade

| Tabela | Finalidade | Módulo(s) do app |
|---|---|---|
| `igrejas` | Tenant raiz. Mesmo com 1 igreja hoje, isola dados de futuras igrejas. | Configurações (futuro: seletor de igreja) |
| `profiles` | Estende `auth.users`. É "quem tem login". | Login/Auth |
| `usuarios_igreja` | Papel (Administrador/Líder Geral/Secretário/Membro) de um `profile` **dentro de uma igreja**. Um profile pode pertencer a mais de uma igreja no futuro. | Controle de acesso (RBAC) |
| `pessoas` | Cadastro de membros — **separado** de `profiles`. Nem toda pessoa tem login. | Pessoas |
| `pessoas_acompanhamentos` | Histórico de acompanhamento (linha por registro, não array). | Pessoas |
| `ministerios` | Equipes (Louvor, Comunicação...). `lider_responsavel_id` identifica o Líder de Ministério. | Ministérios (novo módulo — hoje só existe "Serviço") |
| `pessoa_ministerios` | **N:N** entre pessoas e ministérios, com função e histórico (data_inicio/data_fim). | Pessoas + Ministérios |
| `eventos` | Agenda. Pertence à igreja; ministério é opcional/filtro. | Eventos |
| `eventos_checklist_itens` | Itens de checklist de um evento. | Eventos |
| `eventos_participantes` | N:N pessoas × eventos (confirmação/presença). | Eventos (novo — antes era array vazio) |
| `funcoes_servico` | Catálogo de papéis de serviço por evento (Recepção, Abertura...). | Serviço |
| `escalas` | Quem serve em qual função em qual evento. | Serviço |
| `tarefas` | Controle operacional, com status de 4 estados. | Tarefas |
| `relatorios` | Registro pós-atividade; `tipo` distingue Evento/Ministério/Célula. | Relatórios |
| `ideias` | Banco de Ideias (extensão além do documento). | Banco de Ideias |
| `notificacoes` | Comunicação/avisos, com alvo opcional por ministério. | QG (renomeado) |
| `materiais_biblioteca` | Documentos/links/vídeos. | Biblioteca |
| `versiculos` | Conteúdo devocional, compartilhado por padrão. | Dashboard |

### 2.2 Relacionamentos principais

```
igrejas 1──N usuarios_igreja N──1 profiles
igrejas 1──N pessoas ──(profile_id opcional)──> profiles
igrejas 1──N ministerios
pessoas N──N ministerios   (via pessoa_ministerios, com função e histórico)
igrejas 1──N eventos ──(ministerio_id opcional)──> ministerios
eventos 1──N eventos_checklist_itens
eventos N──N pessoas       (via eventos_participantes)
eventos 1──N escalas N──1 pessoas, escalas N──1 funcoes_servico
igrejas 1──N tarefas ──(pessoa responsável, ministério e evento opcionais)
igrejas 1──N relatorios ──(evento opcional, único por evento quando tipo='Evento')
igrejas 1──N ideias ──(pode virar um evento: transformada_evento_id)
igrejas 1──N notificacoes ──(ministerio_alvo_id opcional = null significa "todos")
```

---

## 4. Plano de migração (substituição do localStorage)

### 4.1 Ordem recomendada (igual à seção 43 do documento)

| Fase | Módulo | Por quê nessa ordem |
|---|---|---|
| **1 — Base** | Auth → Profiles → Pessoas → Ministérios | Tudo depende de pessoas existirem e de haver um usuário autenticado. |
| **2 — Operação** | Eventos → Tarefas → Dashboard | Dependem de Pessoas/Ministérios já migrados. |
| **3 — Gestão** | Relatórios → Notificações (QG) | Dependem de Eventos existirem (relatório referencia evento). |
| **4 — Expansão** | Serviço (Escalas/Funções) → Banco de Ideias → Biblioteca → Versículos | Módulos que já funcionam sozinhos e não bloqueiam os demais — podem esperar, exatamente como o documento já classifica Biblioteca. |

### 4.2 Etapas técnicas (por módulo)

1. **Mapear dados existentes** — usar o botão "Baixar backup" já existente
   em Configurações (`configuracoes.module.js` → `exportarDados()`), que
   já exporta um JSON com todas as coleções do `localStorage`.
2. **Rodar o `schema.sql`** no SQL Editor do Supabase (uma vez).
3. **Criar a primeira igreja**: após o primeiro login, chamar
   `supabase.rpc('criar_igreja_com_admin', { p_nome: '...', p_slug: '...' })`
   — isso cria a igreja e já torna o usuário logado `administrador` dela.
4. **Rodar o script de migração** (`scripts/migration/migrar-localstorage-supabase.js`,
   entregue junto) apontando para o backup JSON baixado — ele insere os
   dados respeitando a ordem de dependência das FKs (ver comentários no
   próprio script).
5. **Trocar o provider**: `scripts/data/db.config.js` → `DB_PROVIDER =
   'supabase'` (a troca de chave já existia; o que muda é o que está
   *dentro* do `supabaseProvider`, ver seção 5).
6. **Testar módulo por módulo**, na mesma ordem das fases acima.
7. **Remover a dependência do localStorage** só depois de todos os
   módulos migrados e validados (o documento pede migração gradual, não
   um "big bang").

---

## 5. Plano de adaptação do código

### 5.1 Arquivos que precisam mudar

| Arquivo | O que muda | Por quê |
|---|---|---|
| `scripts/data/db.config.js` | Adicionar `SUPABASE_CONFIG` real + trocar `DB_PROVIDER` | Já existia a estrutura; só falta preencher com o projeto real. |
| `scripts/data/providers/supabaseProvider.js` | Deixar de ser genérico por "collection" — agora precisa injetar `igreja_id` automaticamente em todo `create`, e filtrar por `igreja_id` em todo `list`/`listAtivos`. Precisa de um "contexto atual" (igreja ativa + usuário logado). | O provider genérico atual assume tabelas "soltas"; o novo modelo é multi-tenant por padrão. |
| `scripts/core/store.js` | `usuarioAtual` deixa de ser mock (`{ nome: "Liderança", id: "mock-user" }`) e passa a vir de `supabase.auth.getUser()`; adicionar `igrejaAtual` ao estado. | Login real substitui o usuário simulado. |
| `scripts/data/repositories/pessoasRepository.js` | `criar()`/`atualizar()` passam a mandar `categoria` (não `funcao`); adicionar métodos para gerenciar `pessoa_ministerios` (vincular/desvincular ministério) em vez de um campo `ministerio` de texto. | Reflete a tabela N:N. |
| `scripts/pages/pessoas.page.js` | Formulário passa a ter um seletor multi-select de ministérios (com campo de função por vínculo) em vez do campo de texto único "Ministério". | Mesma razão acima — é mudança de UI, não só de dados. |
| `scripts/modules/tarefas.module.js` + `scripts/pages/tarefas.page.js` | Checkbox único de "concluída" vira um seletor de status (Pendente/Em andamento/Concluída/Cancelada). | `tarefa.status` substitui `tarefa.concluida` como fonte da verdade (o boolean continua existindo, gerado pelo banco, só para não quebrar nada durante a transição). |
| `scripts/data/repositories/eventosRepository.js` | Checklist e participantes deixam de ser arrays dentro do objeto evento e passam a ser chamadas separadas (`listarChecklist(eventoId)`, `listarParticipantes(eventoId)`, etc.), como já acontece com `escalasRepository`. | Reflete as novas tabelas filhas. |
| `scripts/modules/qg.module.js`, `scripts/pages/qg.page.js`, `pages/qg.html` | Renomear referências de "qg"/"avisos" para "notificacoes" (nome da coleção no banco). Pode ser feito como um alias na camada de repositório para não precisar renomear a URL/tela imediatamente. | Alinhamento de nome com o documento — mudança de rótulo, não de conceito. |
| **Novo:** `scripts/pages/ministerios.page.js` + `ministerios.html` | O documento pede um módulo próprio de Ministérios (criar, definir líder, adicionar integrantes) — hoje só existe "Serviço", que é outra coisa (escala por evento). | Módulo previsto no documento (seção 8.3) que ainda não existe na v1 atual do app. |
| Todos os `*.module.js` que fazem `db.create(...)` | Deixar de montar objetos "achatados" e passar a lidar com o `igreja_id` do contexto atual (injetado pelo provider, não pelo módulo — ver linha do `supabaseProvider.js` acima). | Nenhuma tela deveria precisar saber o `igreja_id` manualmente. |

### 5.2 O que **não** muda

- A separação `page.js` → `module.js` → `repository` → `provider`.
- `scripts/components/*` (Modal, Toast, Dialog, Sidebar) — são puramente
  de UI, não sabem de onde vêm os dados.
- `scripts/core/events.js` (barramento de eventos pub/sub).
- Toda a camada de estilos (`styles/`).

---

## 6. Checklist de validação

Depois de rodar `schema.sql` no SQL Editor, verificar:

- [ ] `select count(*) from information_schema.tables where table_schema = 'public';`
      retorna as 18 tabelas esperadas.
- [ ] `select * from pg_policies where schemaname = 'public';` mostra
      políticas para todas as tabelas com `igreja_id` (nenhuma tabela de
      dados sem RLS habilitado).
- [ ] Criar um usuário de teste via Supabase Auth → confirmar que uma
      linha aparece automaticamente em `profiles` (testa o trigger
      `on_auth_user_created`).
- [ ] Chamar `criar_igreja_com_admin('Igreja Teste', 'igreja-teste')` →
      confirmar que aparece 1 linha em `igrejas` e 1 linha em
      `usuarios_igreja` com `papel = 'administrador'`.
- [ ] Confirmar que a mesma chamada também populou `funcoes_servico` com
      as 10 funções padrão (testa o trigger de seed).
- [ ] Inserir uma `pessoa` e tentar vinculá-la, via `pessoa_ministerios`,
      a um `ministerio` de **outra** igreja → deve falhar com a mensagem
      "Pessoa e ministério pertencem a igrejas diferentes." (testa o
      trigger de integridade do Bloco 6).
- [ ] Criar duas pessoas de teste com usuários diferentes (dois
      `profiles`, dois `usuarios_igreja` em igrejas diferentes) →
      confirmar que um usuário **não** consegue ver os dados do outro
      (testa RLS de fato, não só a existência da política).
- [ ] Criar uma tarefa e mudar `status` para `'Concluída'` → confirmar
      que a coluna `concluida` vira `true` sozinha (testa a coluna
      gerada).
- [ ] Criar um relatório do tipo `'Evento'` para um evento que já tem
      relatório → deve falhar (testa o índice único parcial).
- [ ] Rodar o script de migração contra um backup JSON pequeno de teste
      (2–3 registros por coleção) antes de rodar contra o backup real.
