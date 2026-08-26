import { supabase } from '../supabaseClient.js';

export const permissoesRepository = {
  async obterPorPapel(papel) {
    if (!papel) return [];

    const { data, error } = await supabase
      .from('cargos_permissoes')
      .select(`
        permissoes (
          chave
        )
      `)
      .eq('cargo', papel.toLowerCase());

    if (error) {
      console.error('Erro ao carregar permissões:', error);
      throw new Error(error.message);
    }

    return (data || [])
      .map(item => item.permissoes?.chave)
      .filter(Boolean);
  },
};