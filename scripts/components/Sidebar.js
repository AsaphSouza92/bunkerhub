import { NAV_ITEMS } from './sidebar.config.js';
import { getState, setState } from '../core/store.js';
import { exigirLogin, fazerLogout } from '../auth/auth.module.js';

function resolverCaminho(item) {
  const estaEmPastaPages = window.location.pathname.includes('/pages/');
  if (item.arquivo === null) return estaEmPastaPages ? '../index.html' : 'index.html';
  return estaEmPastaPages ? item.arquivo : `pages/${item.arquivo}`;
}

function renderRodapeUsuarioHTML() {
  const { usuarioAtual, igrejaAtual } = getState();
  if (!usuarioAtual) return '';

  return `
    <div class="sidebar__usuario">
      <div class="sidebar__usuario-nome">${usuarioAtual.nome}</div>
      ${igrejaAtual ? `<div class="sidebar__usuario-igreja">${igrejaAtual.nome}</div>` : ''}
      <button class="sidebar__usuario-sair" id="sidebar-logout-btn">Sair</button>
    </div>
  `;
}

function renderSidebarHTML(activeId) {
  const links = NAV_ITEMS.map(item => `
    <a href="${resolverCaminho(item)}" class="sidebar__link ${item.id === activeId ? 'is-active' : ''}">
      <span class="sidebar__icon">${item.icon}</span> ${item.label}
    </a>
  `).join('');

  return `
    <aside class="sidebar" id="sidebar">
     <div class="sidebar__brand">
  <img
    class="sidebar__brand-logo"
    src="${window.location.pathname.includes('/pages/')
      ? '../assets/fonts/images/logo-bunker.png'
      : 'assets/fonts/images/logo-bunker.png'}"
    alt="Bunker Hub"
  >

  <span class="sidebar__brand-tag">
    HUB
  </span>
</div>
      <nav class="sidebar__nav">${links}</nav>
      ${renderRodapeUsuarioHTML()}
    </aside>
  `;
}

function renderHeaderMobileHTML(tituloAtual) {
  return `
    <header class="header-mobile">
      <button class="header-mobile__burger" id="burger-btn" aria-label="Abrir menu">☰</button>
      <span class="header-mobile__title">${tituloAtual}</span>
      <span class="header-mobile__spacer"></span>
    </header>
  `;
}

function setupToggle() {
  const burger = document.getElementById('burger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!burger || !sidebar || !overlay) return;

  function toggle(open) {
    setState({ sidebarOpen: open });
    sidebar.classList.toggle('is-open', open);
    overlay.classList.toggle('is-visible', open);
  }

  burger.addEventListener('click', () => toggle(!getState().sidebarOpen));
  overlay.addEventListener('click', () => toggle(false));

  sidebar.querySelectorAll('.sidebar__link').forEach(link => {
    link.addEventListener('click', () => toggle(false));
  });
}

function setupLogout() {
  document.getElementById('sidebar-logout-btn')?.addEventListener('click', () => fazerLogout());
}

export async function montarSidebar(activeId, tituloMobile) {


  
  // Em modo localStorage isso é um no-op (retorna true na hora). Em modo
  // supabase, confirma a sessão e preenche usuarioAtual/igrejaAtual no
  // store antes de desenhar o rodapé da sidebar. Se não houver sessão,
  // redireciona para o login e interrompe a montagem.
  const podeContinuar = await exigirLogin();
  if (podeContinuar === false) return;

  const item = NAV_ITEMS.find(i => i.id === activeId);
  const titulo = tituloMobile || item?.label || 'Bunker Hub';

  const sidebarMount = document.getElementById('sidebar-mount');
  const overlayMount = document.getElementById('sidebar-overlay-mount');
  const headerMount = document.getElementById('mobile-header-mount');

  if (sidebarMount) sidebarMount.innerHTML = renderSidebarHTML(activeId);
  if (overlayMount) overlayMount.innerHTML = `<div class="sidebar-overlay" id="sidebar-overlay"></div>`;
  if (headerMount) headerMount.innerHTML = renderHeaderMobileHTML(titulo);

  setupToggle();
  setupLogout();
}
