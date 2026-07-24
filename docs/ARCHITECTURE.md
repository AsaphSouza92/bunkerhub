# Arquitetura do BunkerHub

## Camadas

Tela (page.js) → Regras de negócio (module.js) → Repositório → Provider ativo

- **page.js**: manipula o DOM, chama funções do module. Não conhece o formato bruto dos dados.
- **module.js**: validações e regras de negócio. Não sabe qual provider está ativo.
- **repository**: sabe o nome da coleção e o formato dos campos.
- **provider**: implementação concreta (`localStorageProvider`, `firebaseProvider`, `supabaseProvider`), selecionada em `scripts/data/db.config.js`.

## Trocar de provider

Edite `scripts/data/db.config.js`:

```js
export const DB_PROVIDER = 'localStorage'; // 'localStorage' | 'firebase' | 'supabase'
```

## Modelo de dados

Toda entidade principal tem: `id`, `createdAt`, `updatedAt`, `ativo`.
"Excluir" nunca é permanente — é soft-delete (`ativo: false`), reversível
em Configurações → Itens arquivados.

## Comunicação entre módulos

Barramento de eventos (`scripts/core/events.js`, pub/sub) — usado quando
um módulo precisa notificar outro sem depender dele diretamente
(ex: Ideias → Eventos, ao aprovar uma ideia de categoria "Evento").
