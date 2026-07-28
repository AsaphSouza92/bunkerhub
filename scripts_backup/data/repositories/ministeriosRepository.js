import { activeProvider as db } from '../providers/index.js';
import { supabase } from '../supabaseClient.js';
import { DB_PROVIDER } from '../db.config.js';
import { obterIgrejaAtualId } from '../../core/contextoIgreja.js';

const COLLECTION = 'ministerios';

function paraMinisterioApp(row) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao || '',
    tema: row.tema || '',
    ativo: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ministeriosRepository = {
  async listar(filtro = () => true) {
    if (DB_PROVIDER === 'supabase') {
      const igrejaId = obterIgrejaAtualId();
      const { data, error } = await supabase
        .from('ministerios')
        .select('*')
        .eq('igreja_id', igrejaId)
        .eq('ativo', true)
        .is('deleted_at', null);
      if (error) throw new Error(error.message);
      return data.map(paraMinisterioApp).filter(filtro);
    }
    return db.listAtivos(COLLECTION, filtro);
  },

  async criar(dados) {
    if (DB_PROVIDER === 'supabase') {
      const igrejaId = obterIgrejaAtualId();
      const { data, error } = await supabase
        .from('ministerios')
        .insert({
          igreja_id: igrejaId,
          nome: dados.nome,
          descricao: dados.descricao || null,
          tema: dados.tema || null,
        })
        .select('*')
        .single();
      if (error) {
        if (error.code === '23505') throw new Error('Já existe um ministério com esse nome.');
        throw new Error(error.message);
      }
      return paraMinisterioApp(data);
    }
    return db.create(COLLECTION, {
      nome: dados.nome, descricao: dados.descricao || '', tema: dados.tema || '',
    });
  },

  async arquivar(id) {
    if (DB_PROVIDER === 'supabase') {
      const { error } = await supabase.from('ministerios').update({ ativo: false }).eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }
    return db.desativar(COLLECTION, id);
  },
};
