import { activeProvider as db } from './providers/index.js';

export async function seedDatabase() {
  await db.seedIfEmpty('versiculos', [
    { id: '1', referencia: 'Salmos 27:1', texto: 'O Senhor é a minha luz e a minha salvação; a quem temerei?' },
    { id: '2', referencia: 'Provérbios 3:5-6', texto: 'Confia no Senhor de todo o teu coração e não te apoies no teu próprio entendimento.' },
    { id: '3', referencia: 'Josué 1:9', texto: 'Sê forte e corajoso; não temas, nem te espantes, porque o Senhor teu Deus é contigo.' },
    { id: '4', referencia: 'Filipenses 4:13', texto: 'Tudo posso naquele que me fortalece.' },
    { id: '5', referencia: 'Isaías 41:10', texto: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.' },
  ]);

  await db.seedIfEmpty('pessoas', [
    { id: 'p1', nome: 'Lucas Andrade', nascimento: '1998-07-23', funcao: 'Líder de Célula', ativo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'p2', nome: 'Marina Costa', nascimento: '2001-07-25', funcao: 'Jovem', ativo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);

  await db.seedIfEmpty('eventos', [{
    id: 'e1', nome: 'Culto de Jovens — Bunker Legacy',
    data: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    horario: '19:30', local: 'Templo Sede', ativo: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }]);

  await db.seedIfEmpty('tarefas', [
    { id: 't1', titulo: 'Confirmar equipe de recepção', concluida: false, responsavelId: 'mock-user', ativo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 't2', titulo: 'Revisar roteiro do culto de sábado', concluida: false, responsavelId: 'mock-user', ativo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);
}
