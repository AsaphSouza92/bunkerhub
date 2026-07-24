import { registrarListenersEventos } from '../modules/eventos.module.js';
import { rodarMigracoes } from './migrations.js';

export function registrarListenersGlobais() {
  rodarMigracoes();
  registrarListenersEventos();
}
