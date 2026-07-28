import { supabase } from '../data/supabaseClient.js';
import { DB_PROVIDER } from '../data/db.config.js';
import { getState, setState } from '../core/store.js';

function resolverCaminhoLogin() {
  const estaEmPastaPages = window.location.pathname.includes('/pages/');
  return estaEmPastaPages ? 'login.html' : 'pages/login.html';
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nome_completo, avatar_url')
    .eq('id', sessao.user.id)
    .single();

  const { data: vinculos } = await supabase
    .from('usuarios_igreja')
    .select('igreja_id, papel, igrejas ( nome )')
    .eq('profile_id', sessao.user.id)
    .eq('ativo', true);

  const vinculoAtivo = vinculos?.[0] || null;

  setState({
    usuarioAtual: {
      id: sessao.user.id,
      email: sessao.user.email,
      nome: profile?.nome_completo || sessao.user.email,
    },
    igrejaAtual: vinculoAtivo
      ? { id: vinculoAtivo.igreja_id, nome: vinculoAtivo.igrejas?.nome, papel: vinculoAtivo.papel }
      : null,
  });
}

// Chamada no início de toda página "interna" do app (via Sidebar.js).
// Em modo localStorage é um no-op — o app continua funcionando exatamente
// como antes, sem exigir login. Só passa a exigir sessão quando
// DB_PROVIDER === 'supabase'. Retorna false quando está redirecionando
// (para quem chamou poder abortar o resto da renderização).
export async function exigirLogin() {
  if (DB_PROVIDER !== 'supabase') return true;

  const sessao = await obterSessaoAtual();
  if (!sessao) {
    window.location.href = resolverCaminhoLogin();
    return false;
  }

  await sincronizarUsuarioAtual(sessao);
  return true;
}

export async function fazerLogin(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
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
  if (error) throw new Error(traduzirErroAuth(error));
  return data;
}

export async function fazerLogout() {
  await supabase.auth.signOut();
  setState({ usuarioAtual: null, igrejaAtual: null });
  window.location.href = resolverCaminhoLogin();
}

// Cria a primeira igreja e já torna o usuário logado administrador dela
// (RPC criar_igreja_com_admin, definida no schema.sql — Bloco 18).
export async function criarPrimeiraIgreja(nome, slug) {
  const { data, error } = await supabase.rpc('criar_igreja_com_admin', {
    p_nome: nome,
    p_slug: slug,
  });
  if (error) throw new Error(error.message);

  const sessao = await obterSessaoAtual();
  if (sessao) await sincronizarUsuarioAtual(sessao);

  return data; // uuid da igreja criada
}

function traduzirErroAuth(error) {
  const msg = error?.message || '';
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('User already registered')) return 'Já existe uma conta com esse e-mail.';
  if (msg.includes('Password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  return msg || 'Não foi possível completar a operação.';
}

// Mantém o estado global coerente se a sessão expirar ou se o usuário
// deslogar em outra aba.
if (DB_PROVIDER === 'supabase') {
  supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') {
      setState({ usuarioAtual: null, igrejaAtual: null });
    }
  });
}

export { resolverCaminhoInicio };
