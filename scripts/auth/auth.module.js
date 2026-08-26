import { supabase } from '../data/supabaseClient.js';

import { DB_PROVIDER } from '../data/db.config.js';

import { getState, setState } from '../core/store.js';

import { usuariosIgrejaRepository } from '../data/repositories/usuariosIgrejaRepository.js';
import { permissoesRepository } from '../data/repositories/permissoesRepository.js';

function resolverCaminhoLogin() {
  const estaEmPastaPages = window.location.pathname.includes('/pages/');
  return estaEmPastaPages ? 'login.html' : 'pages/login.html';
}

function resolverCaminhoAguardando() {
  const estaEmPastaPages = window.location.pathname.includes('/pages/');
  return estaEmPastaPages ? 'aguardando.html' : 'pages/aguardando.html';
}

function resolverCaminhoInicio() {
  const estaEmPastaPages = window.location.pathname.includes('/pages/');
  return estaEmPastaPages ? '../index.html' : 'index.html';
}

export async function obterSessaoAtual() {
  const { data } = await supabase.auth.getSession();

  return data.session;
}

// Busca o profile e o vínculo com a(s) igreja(s) do usuário logado e
// guarda no estado global (store.js), para o resto do app consultar via
// getState() sem precisar rechamar o Supabase toda hora.
//
// Nota de escopo: se o usuário pertencer a mais de uma igreja, por
// enquanto usamos sempre a primeira (vinculos[0]) como "igreja ativa".
// Um seletor de igreja pode ser adicionado depois sem remodelar nada —
// a estrutura (usuarios_igreja) já suporta múltiplos vínculos.

async function sincronizarUsuarioAtual(sessao) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, nome_completo, avatar_url')
    .eq('id', sessao.user.id)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: vinculos, error: vinculosError } = await supabase
    .from('usuarios_igreja')
    .select('igreja_id, papel, igrejas ( nome )')
    .eq('profile_id', sessao.user.id)
    .eq('ativo', true);

  if (vinculosError) {
    throw new Error(vinculosError.message);
  }

  const vinculoAtivo = vinculos?.[0] || null;

  // Carrega as permissões vinculadas ao papel do usuário.
  const permissoes = vinculoAtivo?.papel
    ? await permissoesRepository.obterPorPapel(vinculoAtivo.papel)
    : [];

  setState({
    usuarioAtual: {
      id: sessao.user.id,
      email: sessao.user.email,
      nome: profile?.nome_completo || sessao.user.email,
      permissoes,
    },

    igrejaAtual: vinculoAtivo
      ? {
          id: vinculoAtivo.igreja_id,
          nome: vinculoAtivo.igrejas?.nome,
          papel: vinculoAtivo.papel,
        }
      : null,
  });
}

// Chamada no início de toda página "interna" do app (via Sidebar.js).
// Em modo localStorage isso é um no-op — o app continua funcionando exatamente
// como antes, sem exigir login. Só passa a exigir sessão quando
// DB_PROVIDER === 'supabase'. Retorna false quando está redirecionando
// (para quem chamou poder abortar o resto da renderização).
//
// Além de verificar a sessão, esta função verifica se o usuário possui
// vínculo ativo com o BUNKER. Usuários autenticados, mas ainda não aprovados,
// são direcionados para aguardando.html.

export async function exigirLogin() {
  if (DB_PROVIDER !== 'supabase') return true;

  const sessao = await obterSessaoAtual();

  if (!sessao) {
    window.location.href = resolverCaminhoLogin();
    return false;
  }

  // Verifica se o usuário possui vínculo ativo com o BUNKER.
  const ativoNoBunker = await verificarAtividadeBunker(sessao.user.id);

  if (!ativoNoBunker) {
    const estaEmAguardando = window.location.pathname.includes('/aguardando.html');

    if (!estaEmAguardando) {
      window.location.href = resolverCaminhoAguardando();
    }

    return false;
  }

  await sincronizarUsuarioAtual(sessao);

  return true;
}

export async function fazerLogin(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) throw new Error(traduzirErroAuth(error));

  await sincronizarUsuarioAtual(data.session);

  return data.session;
}

export async function criarConta(email, senha, nomeCompleto) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome_completo: nomeCompleto } },
  });

  if (error) throw new