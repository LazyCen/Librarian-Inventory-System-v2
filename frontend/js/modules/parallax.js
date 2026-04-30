/**
 * parallax.js — Scroll-based Parallax & Reveal Effects
 * Neumorphic Parallax UI · Librarian Inventory System
 *
 * Features:
 *   - Background blob parallax (blobs move slower than foreground)
 *   - Dot-grid subtle parallax
 *   - IntersectionObserver scroll reveals (.reveal elements)
 *   - Stagger group activation
 */

export const Parallax = (() => {

  // ─── Parallax Blobs ───────────────────────────────────
  function initBlobs() {
    const blobs = document.querySelectorAll('.parallax-blob');
    const dots  = document.querySelector('.parallax-dots');
    if (!blobs.length && !dots) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (ticking) return;
      requestAnimationFrame(() => {
        const sy = window.scrollY;

        blobs.forEach((blob, i) => {
          const speed = 0.08 + i * 0.04; // each blob different rate
          const dir   = i % 2 === 0 ? 1 : -1;
          blob.style.transform = `translate3d(${dir * sy * speed * 0.3}px, ${-sy * speed}px, 0)`;
        });

        if (dots) {
          dots.style.transform = `translate3d(0, ${-sy * 0.12}px, 0)`;
        }

        ticking = false;
      });
      ticking = true;
    }, { passive: true });
  }

  // ─── Scroll Reveal (IntersectionObserver) ─────────────
  function initReveal() {
    const opts = {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.12
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Un-observe after first reveal to save resources
          observer.unobserve(entry.target);
        }
      });
    }, opts);

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return observer; // return so callers can re-observe dynamic content
  }

  // ─── Stagger Groups ───────────────────────────────────
  function initStagger() {
    const opts = { root: null, rootMargin: '0px 0px -40px 0px', threshold: 0.08 };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, opts);

    document.querySelectorAll('.stagger-group').forEach(el => observer.observe(el));
  }

  // ─── Re-observe dynamically added elements ────────────
  let _revealObserver = null;

  function observeNewElements() {
    document.querySelectorAll('.reveal:not(.observed)').forEach(el => {
      el.classList.add('observed');
      _revealObserver?.observe(el);
    });
  }

  // ─── Init ─────────────────────────────────────────────
  function init() {
    initBlobs();
    _revealObserver = initReveal();
    initStagger();
  }

  return { init, observeNewElements };
})();
