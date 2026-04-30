/**
 * views.js — View Switching & Page Title Management
 * Neumorphic Parallax UI · Librarian Inventory System
 *
 * Manages transitions between dashboard views with smooth
 * fade + slide animations and parallax re-observe hooks.
 */

import { Nav } from './nav.js';
import { Parallax } from './parallax.js';

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  list:      'Books',
  bins:      'Containers',
  requests:  'Access Requests',
  history:   'Reading History',
};

export const Views = (() => {
  let _current = null;

  function switchTo(viewName, opts = {}) {
    if (!viewName) return;

    // Hide all views
    document.querySelectorAll('.view-content').forEach(el => {
      el.classList.add('hidden');
      el.style.animation = '';
    });

    const target = document.getElementById(`view-${viewName}`);
    if (!target) return;

    // Show target with animation
    target.classList.remove('hidden');
    target.style.animation = 'revealUp 0.4s var(--ease-out) both';

    // Update title
    const titleEl = document.getElementById('currentViewTitle');
    if (titleEl) titleEl.textContent = VIEW_TITLES[viewName] ?? viewName;

    // Update active nav link
    Nav.setActiveView(viewName);

    // Close nav overlay if open
    Nav.close();

    // Re-trigger parallax reveals on newly visible elements
    setTimeout(() => Parallax.observeNewElements(), 50);

    _current = viewName;

    // Call any post-switch hook
    if (opts.onSwitch) opts.onSwitch(viewName);
  }

  function getCurrent() { return _current; }

  function init(defaultView = 'dashboard') {
    switchTo(defaultView);
  }

  return { switchTo, getCurrent, init };
})();

// Expose globally for legacy onclick handlers in HTML
window.switchView = (name) => Views.switchTo(name);
