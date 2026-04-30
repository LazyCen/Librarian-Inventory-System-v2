/**
 * nav.js — Hamburger Navigation Overlay
 * Neumorphic Parallax UI · Librarian Inventory System
 *
 * Controls:
 *   - Hamburger toggle (open / close)
 *   - Full-screen nav overlay with staggered link animations
 *   - Active link tracking
 *   - Keyboard ESC to close
 */

export const Nav = (() => {
  let _isOpen = false;

  const hamburgerBtn  = () => document.getElementById('hamburgerBtn');
  const navOverlay    = () => document.getElementById('navOverlay');
  const sidebarOverlay = () => document.getElementById('sidebarOverlay');

  function open() {
    _isOpen = true;
    hamburgerBtn()?.classList.add('open');
    navOverlay()?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    _isOpen = false;
    hamburgerBtn()?.classList.remove('open');
    navOverlay()?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function toggle() {
    _isOpen ? close() : open();
  }

  function setActiveView(viewName) {
    document.querySelectorAll('.nav-link-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewName);
    });
  }

  function init() {
    hamburgerBtn()?.addEventListener('click', toggle);

    // Click outside overlay links closes it
    navOverlay()?.addEventListener('click', (e) => {
      if (e.target === navOverlay()) close();
    });

    sidebarOverlay()?.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _isOpen) close();
    });
  }

  return { init, open, close, toggle, setActiveView };
})();
