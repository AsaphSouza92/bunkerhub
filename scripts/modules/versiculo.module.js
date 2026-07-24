import { activeProvider as db } from '../data/providers/index.js';

export async function getVersiculoDoDia() {
  const versiculos = await db.list('versiculos');
  if (versiculos.length === 0) return null;
  const diaDoAno = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return versiculos[diaDoAno % versiculos.length];
}
