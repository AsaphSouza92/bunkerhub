import { supabase } from '../data/supabaseClient.js';
import { DB_PROVIDER } from '../data/db.config.js';
import { setState } from '../core/store.js';
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
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

async function sincronizarUsuarioAtual(sessao) {
  if (!sessao?.user?.id) {
    throw new Error('Sessao de usuario invalida.');
  }

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

export async function exigirLogin() {
  if (DB_PROVIDER !== 'supabase') {
    return true;
  }

  const sessao = await obterSessaoAtual();

  if (!sessao) {
    window.location.href = resolverCaminhoLogin();
    return false;
  }

  const ativoNoBunker = await verificarAtividadeBunker(sessao.user.id);

  if (!ativoNoBunker) {
    const estaEmAguardando =
      window.location.pathname.includes('/aguardando.html');

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

  if (error) {
    throw new Error(traduzirErroAuth(error));
  }

  await sincronizarUsuarioAtual(data.session);

  return data.session;
}

export async function criarConta(email, senha, nomeCompleto) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: {
        nome_completo: nomeCompleto,
      },
    },
  });

  if (error) {
    throw new Error(traduzirErroAuth(error));
  }

  return data;
}

export async function fazerLogout() {
  await supabase.auth.signOut();

  setState({
    usuarioAtual: null,
    igrejaAtual: null,
  });

  window.location.href = resolverCaminhoLogin();
}

export async function criarPrimeiraIgreja(nome, slug) {
  const { data, error } = await supabase.rpc('criar_igreja_com_admin', {
    p_nome: nome,
    p_slug: slug,
  });

  if (error) {
    throw new Error(error.message);
  }

  const sessao = await obterSessaoAtual();

  if (sessao) {
    await sincronizarUsuarioAtual(sessao);
  }

  return data;
}

export async function verificarAtividadeBunker(profileId) {
  return await usuariosIgrejaRepository.isUsuarioAtivoNoBunker(profileId);
}

function traduzirErroAuth(error) {
  const msg = error?.message || '';

  if (msg.includes('Invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }

  if (msg.includes('User already registered')) {
    return 'Ja existe uma conta com esse e-mail.';
  }

  if (msg.includes('Password should be at least')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }

  return msg || 'Nao foi possivel completar a operacao.';
}

if (DB_PROVIDER === 'supabase') {
  supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') {
      setState({
        usuarioAtual: null,
        igrejaAtual: null,
      });
    }
  });
}

export { resolverCaminhoInicio };
