# BunkerHub

Plataforma de apoio à liderança da Juventude Bunker (igreja cristã).
Tema: **Bunker Legacy** — construir uma geração que deixe um legado de fé,
discipulado, comunhão e serviço para as próximas gerações.

## Filosofia

Toda funcionalidade responde a duas perguntas:
1. Isso glorifica a Deus?
2. Isso ajuda a cuidar melhor das pessoas?

## Stack

HTML, CSS e JavaScript puro (ES Modules), sem frameworks.
Persistência hoje em `localStorage`, com arquitetura pronta para trocar
para Firebase ou Supabase sem alterar nenhuma tela (ver `docs/ARCHITECTURE.md`).

## Como rodar localmente

Como o projeto usa ES Modules, não abra `index.html` direto no navegador
(`file://` bloqueia imports por CORS). Use um servidor local:

```bash
npx serve
# ou
python3 -m http.server 8000
```

Ou use a extensão **Live Server** no VS Code.

## Módulos

Dashboard · Pessoas · Serviço · Calendário · Eventos · Relatórios ·
Biblioteca · Banco de Ideias · Tarefas · Indicadores · QG · Configurações

## Status

Versão 1.0 — uso interno, sem autenticação. Provider de dados configurável
em `scripts/data/db.config.js` (`localStorage`, `firebase` ou `supabase`).
