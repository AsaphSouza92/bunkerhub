import { supabase } from '../supabaseClient.js';

// ID fixo do BUNKER. Fixado aqui de propósito: esta verificação de
// aprovação/vínculo é específica do BUNKER nesta etapa — não recebe
// igreja_id por parâmetro para evitar que qualquer chamador confunda
// "está logado" com "está aprovado em outra igreja".
const ID_BUNKER = 'c8692945-83f2-43f0-8546-629155dd59d3';

export const usuariosIgrejaRepository = {
  // Verifica se o profile possui vínculo ATIVO com o BUNKER em
  // usuarios_igreja. Retorna true/false — nunca lança para "não
  // encontrado" (esse é um resultado válido: false). Em caso de erro
  // real de consulta, propaga o erro em vez de tratá-lo como
  // autorização, seguindo o mesmo padrão de erro dos demais
  // repositories (ex.: ministeriosRepository.js).
  async isUsuarioAtivoNoBunker(profileId) {
    const { data, error } = await supabase
      .from('usuarios_igreja')
      .select('id')
      .eq('profile_id', profileId)
      .eq('igreja_id', ID_BUNKER)
      .eq('ativo', true)
      .limit(1);

    if (error) throw new Error(error.message);

    return (data || []).length > 0;
  },
};