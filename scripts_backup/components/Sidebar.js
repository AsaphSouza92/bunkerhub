import { NAV_ITEMS } from './sidebar.config.js';
import { getState, setState } from '../core/store.js';

function resolverCaminho(item) {
  const estaEmPastaPages = window.location.pathname.includes('/pages/');
  if (item.arquivo === null) return estaEmPastaPages ? '../index.html' : 'index.html';
  return estaEmPastaPages ? item.arquivo : `pages/${item.arquivo}`;
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
        <span class="sidebar__brand-bunker">Bunker</span><span class="sidebar__brand-hub">Hub</span>
      </div>
      <nav class="sidebar__nav">${links}</nav>
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

export function montarSidebar(activeId, tituloMobile) {
  const item = NAV_ITEMS.find(i => i.id === activeId);
  const titulo = tituloMobile || item?.label || 'Bunker Hub';

  const sidebarMount = document.getElementById('sidebar-mount');
  const overlayMount = document.getElementById('sidebar-overlay-mount');
  const headerMount = document.getElementById('mobile-header-mount');

  if (sidebarMount) sidebarMount.innerHTML = renderSidebarHTML(activeId);
  if (overlayMount) overlayMount.innerHTML = `<div class="sidebar-overlay" id="sidebar-overlay"></div>`;
  if (headerMount) headerMount.innerHTML = renderHeaderMobileHTML(titulo);

  setupToggle();
}
