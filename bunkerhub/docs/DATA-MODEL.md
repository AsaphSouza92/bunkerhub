# Modelo de Dados

Todas as entidades seguem o padrão base:
`{ id, createdAt, updatedAt, ativo, ...campos específicos }`

| Coleção | Campos específicos |
|---|---|
| pessoas | nome, telefone, nascimento, funcao, ministerio, dataEntrada, observacoes, historico[], proximoAcompanhamento |
| eventos | nome, descricao, responsavel, equipe, local, data, horario, checklist[], participantes[], observacoes, origemIdeiaId |
| ideias | titulo, categoria, descricao, criador, data, prioridade, status, transformadaEmEventoId |
| tarefas | titulo, descricao, responsavelId, prazo, prioridade, concluida, eventoId |
| relatorios | eventoId, data, participantes, visitantes, resumo, pontosPositivos, pontosMelhoria, proximasAcoes |
| funcoes | nome |
| escalas | eventoId, pessoaId, funcaoId *(sub-registro, sem createdAt/updatedAt)* |
| biblioteca | titulo, categoria, tipo, url, descricao, autor |
| qg | titulo, conteudo, autor, fixado |
| versiculos | referencia, texto *(estático, sem soft-delete)* |
