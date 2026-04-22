(function () {
  'use strict';

  const doc = document.documentElement;
  const header = document.querySelector('[data-site-header]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navPanel = document.querySelector('[data-nav-panel]');
  const navToggleLabel = document.querySelector('[data-nav-toggle-label]');

  // -----------------------------------------------------------------
  // Header scroll state
  // -----------------------------------------------------------------
  const setHeaderState = () => {
    if (!header) return;
    if (window.scrollY > 12) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  };
  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  // -----------------------------------------------------------------
  // Mobile navigation
  // -----------------------------------------------------------------
  const openNav = () => {
    if (!navPanel || !navToggle) return;
    navPanel.classList.add('is-open');
    doc.classList.add('has-nav-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Navigation schliessen');
    if (navToggleLabel) navToggleLabel.textContent = 'Navigation schliessen';
  };

  const closeNav = () => {
    if (!navPanel || !navToggle) return;
    navPanel.classList.remove('is-open');
    doc.classList.remove('has-nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Navigation öffnen');
    if (navToggleLabel) navToggleLabel.textContent = 'Navigation öffnen';
  };

  if (navToggle && navPanel) {
    navToggle.addEventListener('click', () => {
      const isOpen = navPanel.classList.contains('is-open');
      isOpen ? closeNav() : openNav();
    });

    navPanel.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeNav());
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navPanel.classList.contains('is-open')) {
        closeNav();
        navToggle.focus();
      }
    });

    const mq = window.matchMedia('(min-width: 880px)');
    const handleMq = () => {
      if (mq.matches) closeNav();
    };
    mq.addEventListener ? mq.addEventListener('change', handleMq) : mq.addListener(handleMq);
  }

  // -----------------------------------------------------------------
  // Reveal on scroll
  // -----------------------------------------------------------------
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets = document.querySelectorAll('[data-reveal]');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    revealTargets.forEach((el, i) => {
      const delay = el.dataset.revealDelay || (i % 8) * 60;
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      observer.observe(el);
    });
  }

  // -----------------------------------------------------------------
  // Current year (footer, fallback if Liquid missed any)
  // -----------------------------------------------------------------
  document.querySelectorAll('[data-current-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  // -----------------------------------------------------------------
  // Smooth in-page anchors with header offset
  // -----------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;

    link.addEventListener('click', (event) => {
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      const headerOffset = header ? header.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 12;
      window.scrollTo({
        top,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
})();
