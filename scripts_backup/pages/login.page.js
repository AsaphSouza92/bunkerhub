import { fazerLogin, criarConta, criarPrimeiraIgreja, obterSessaoAtual, resolverCaminhoInicio } from '../auth/auth.module.js';
import { getState } from '../core/store.js';
import { toast } from '../components/Toast.js';

// 'entrar' | 'criar-conta' | 'criar-igreja'
let modo = 'entrar';

function renderFormulario() {
  const container = document.getElementById('login-form-container');

  if (modo === 'entrar') {
    container.innerHTML = `
      <h2>Entrar</h2>
      <div class="field"><label>E-mail</label><input type="email" id="f-email" autocomplete="username"></div>
      <div class="field"><label>Senha</label><input type="password" id="f-senha" autocomplete="current-password"></div>
      <button class="btn btn--primary w-full" id="btn-entrar">Entrar</button>
      <button class="btn btn--ghost w-full mt-2" id="btn-ir-criar-conta">Criar conta</button>
    `;
    document.getElementById('btn-entrar').addEventListener('click', aoEntrar);
    document.getElementById('btn-ir-criar-conta').addEventListener('click', () => {
      modo = 'criar-conta';
      renderFormulario();
    });
    return;
  }

  if (modo === 'criar-conta') {
    container.innerHTML = `
      <h2>Criar conta</h2>
      <div class="field"><label>Nome completo</label><input type="text" id="f-nome"></div>
      <div class="field"><label>E-mail</label><input type="email" id="f-email" autocomplete="username"></div>
      <div class="field"><label>Senha</label><input type="password" id="f-senha" autocomplete="new-password"></div>
      <button class="btn btn--primary w-full" id="btn-criar-conta">Criar conta</button>
      <button class="btn btn--ghost w-full mt-2" id="btn-voltar-entrar">Já tenho conta</button>
    `;
    document.getElementById('btn-criar-conta').addEventListener('click', aoCriarConta);
    document.getElementById('btn-voltar-entrar').addEventListener('click', () => {
      modo = 'entrar';
      renderFormulario();
    });
    return;
  }

  if (modo === 'criar-igreja') {
    container.innerHTML = `
      <h2>Configuração inicial</h2>
      <p class="text-sm text-secondary">Sua conta ainda não está vinculada a nenhuma igreja. Crie a primeira igreja para começar a usar o BunkerHub.</p>
      <div class="field"><label>Nome da igreja</label><input type="text" id="f-igreja-nome" placeholder="Ex: Igreja Central"></div>
      <div class="field"><label>Identificador (slug)</label><input type="text" id="f-igreja-slug" placeholder="Ex: igreja-central"></div>
      <button class="btn btn--primary w-full" id="btn-criar-igreja">Criar igreja e continuar</button>
    `;
    document.getElementById('btn-criar-igreja').addEventListener('click', aoCriarIgreja);
  }
}

async function aoEntrar() {
  const email = document.getElementById('f-email').value.trim();
  const senha = document.getElementById('f-senha').value;
  if (!email || !senha) { toast.erro('Preencha e-mail e senha.'); return; }

  try {
    await fazerLogin(email, senha);
    aposLogin();
  } catch (e) {
    toast.erro(e.message);
  }
}

async function aoCriarConta() {
  const nome = document.getElementById('f-nome').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const senha = document.getElementById('f-senha').value;

  if (!nome || !email || senha.length < 6) {
    toast.erro('Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.');
    return;
  }

  try {
    await criarConta(email, senha, nome);
    toast.sucesso('Conta criada. Entrando...');
    await fazerLogin(email, senha);
    aposLogin();
  } catch (e) {
    toast.erro(e.message);
  }
}

function aposLogin() {
  const { igrejaAtual } = getState();
  if (!igrejaAtual) {
    modo = 'criar-igreja';
    renderFormulario();
    return;
  }
  window.location.href = resolverCaminhoInicio();
}

async function aoCriarIgreja() {
  const nome = document.getElementById('f-igreja-nome').value.trim();
  const slug = document.getElementById('f-igreja-slug').value.trim();

  if (!nome || !slug) {
    toast.erro('Preencha o nome e o identificador da igreja.');
    return;
  }

  try {
    await criarPrimeiraIgreja(nome, slug);
    toast.sucesso('Igreja criada com sucesso!');
    window.location.href = resolverCaminhoInicio();
  } catch (e) {
    toast.erro(e.message);
  }
}

async function init() {
  // Se já existe sessão válida, não faz sentido mostrar o formulário —
  // manda direto para o app.
  const sessao = await obterSessaoAtual();
  if (sessao) {
    window.location.href = resolverCaminhoInicio();
    return;
  }
  renderFormulario();
}

document.addEventListener('DOMContentLoaded', init);
