(function () {
  'use strict';

  const doc = document.documentElement;
  const header = document.querySelector('[data-site-header]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navPanel = document.querySelector('[data-nav-panel]');
  const navToggleLabel = document.querySelector('[data-nav-toggle-label]');
  const COOKIE_CONSENT_STORAGE_KEY = 'su-cookie-consent';
  const COOKIE_CONSENT_COOKIE_NAME = 'su_cookie_consent';
  const COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const readCookie = (name) => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapeRegExp(name)}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
  };

  const normalizeConsentStatus = (value) => (
    value === 'granted' || value === 'denied' ? value : 'unset'
  );

  const getStoredConsentStatus = () => {
    let storedValue = '';

    try {
      storedValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) || '';
    } catch (error) {
      storedValue = '';
    }

    if (!storedValue) {
      storedValue = readCookie(COOKIE_CONSENT_COOKIE_NAME);
    }

    return normalizeConsentStatus(storedValue);
  };

  const applyConsentStatus = (status) => {
    const normalized = normalizeConsentStatus(status);
    const analyticsEnabled = normalized === 'granted';

    doc.dataset.cookieConsent = normalized;
    doc.dataset.analyticsConsent = analyticsEnabled ? 'granted' : 'denied';

    window.siteConsent = window.siteConsent || {};
    window.siteConsent.status = normalized;
    window.siteConsent.analytics = analyticsEnabled;
    window.siteConsent.canUse = function canUse(category) {
      if (category === 'necessary') return true;
      return category === 'analytics' ? this.analytics : false;
    };

    window.dispatchEvent(new CustomEvent('site:cookie-consent-change', {
      detail: {
        status: normalized,
        analytics: analyticsEnabled,
      },
    }));
  };

  const persistConsentStatus = (status) => {
    const normalized = normalizeConsentStatus(status);

    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, normalized);
    } catch (error) {
      // Ignore storage failures and rely on the consent cookie fallback.
    }

    document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${encodeURIComponent(normalized)}; max-age=${COOKIE_CONSENT_MAX_AGE}; path=/; SameSite=Lax`;
    applyConsentStatus(normalized);
  };

  applyConsentStatus(getStoredConsentStatus());

  // -----------------------------------------------------------------
  // Header scroll state
  // -----------------------------------------------------------------
  let lastScrollY = Math.max(window.scrollY, 0);
  let headerTicking = false;

  const setHeaderState = () => {
    if (!header) return;
    const currentScrollY = Math.max(window.scrollY, 0);
    const scrollDelta = currentScrollY - lastScrollY;
    const isPastTop = currentScrollY > 12;
    const shouldHide = currentScrollY > 140 && scrollDelta > 6 && !header.classList.contains('is-nav-open');
    const shouldShow = scrollDelta < -4 || currentScrollY <= 24 || header.classList.contains('is-nav-open');

    if (isPastTop) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }

    if (shouldHide) {
      header.classList.add('is-hidden');
    } else if (shouldShow) {
      header.classList.remove('is-hidden');
    }

    lastScrollY = currentScrollY;
    headerTicking = false;
  };

  const queueHeaderState = () => {
    if (headerTicking) return;
    headerTicking = true;
    window.requestAnimationFrame(setHeaderState);
  };

  setHeaderState();
  window.addEventListener('scroll', queueHeaderState, { passive: true });

  // -----------------------------------------------------------------
  // Mobile navigation
  // -----------------------------------------------------------------
  let navScrollY = 0;

  const preserveWindowScroll = () => {
    const targetScrollY = navScrollY;
    window.requestAnimationFrame(() => {
      window.scrollTo(0, targetScrollY);
    });
  };

  const openNav = () => {
    if (!navPanel || !navToggle) return;
    navScrollY = Math.max(window.scrollY, 0);
    navPanel.classList.add('is-open');
    navPanel.scrollTop = 0;
    doc.classList.add('has-nav-open');
    if (header) {
      header.classList.add('is-nav-open');
      header.classList.remove('is-hidden');
    }
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Navigation schließen');
    if (navToggleLabel) navToggleLabel.textContent = 'Navigation schließen';
    preserveWindowScroll();
  };

  const closeNav = () => {
    if (!navPanel || !navToggle) return;
    navScrollY = Math.max(navScrollY, window.scrollY);
    navPanel.classList.remove('is-open');
    doc.classList.remove('has-nav-open');
    if (header) header.classList.remove('is-nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Navigation öffnen');
    if (navToggleLabel) navToggleLabel.textContent = 'Navigation öffnen';
    preserveWindowScroll();
    queueHeaderState();
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

    const mq = window.matchMedia('(min-width: 1041px)');
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
  const revealGroupSelector = [
    '[data-reveal-group]',
    '.hero__grid',
    '.page-hero__grid',
    '.post-hero__copy',
    '.section__head',
    '.section__headline-row',
    '.services-grid',
    '.process__steps',
    '.impressions__track',
    '.split__values',
    '.advantages',
    '.regions',
    '.testimonials',
    '.testimonial-carousel',
    '.faq__list',
    '.stats__grid',
    '.blog-grid',
    '.contact-alt',
    '.cta-banner',
  ].join(', ');

  const getRevealGroup = (el) => (
    el.closest(revealGroupSelector) || el.parentElement || document.body
  );

  const setRevealDelays = () => {
    const groups = new Map();

    revealTargets.forEach((el) => {
      const group = getRevealGroup(el);
      const groupItems = groups.get(group) || [];
      groupItems.push(el);
      groups.set(group, groupItems);
    });

    groups.forEach((items) => {
      items
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1))
        .forEach((el, index) => {
          const customDelay = el.dataset.revealDelay;
          const delay = customDelay !== undefined && customDelay !== ''
            ? Number.parseInt(customDelay, 10) || 0
            : Math.min(index, 6) * 60;

          el.style.setProperty('--reveal-delay', `${delay}ms`);
        });
    });
  };

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  } else {
    setRevealDelays();

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

    revealTargets.forEach((el) => observer.observe(el));
  }

  // -----------------------------------------------------------------
  // Footer badge orbit
  // -----------------------------------------------------------------
  const initBadgeOrbit = () => {
    const orbits = document.querySelectorAll('[data-badge-orbit]');
    if (!orbits.length) return;

    const normalizeLength = (value, fallback) => {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const normalizeDuration = (value, fallback) => {
      const parsed = Number.parseFloat(value);
      if (!Number.isFinite(parsed)) return fallback;
      return value.trim().endsWith('ms') ? parsed : parsed * 1000;
    };

    orbits.forEach((orbit) => {
      const rail = orbit.querySelector('.site-footer__badge-orbit-rail');
      const traces = Array.from(orbit.querySelectorAll('.site-footer__badge-orbit-trace'));
      if (!rail || traces.length < 2 || typeof rail.getTotalLength !== 'function') return;

      const badge = orbit.closest('.site-footer__badge') || orbit;
      const styles = window.getComputedStyle(badge);
      const total = rail.getTotalLength();
      const baseTraceLength = total * (normalizeLength(styles.getPropertyValue('--badge-trace-length'), 8) / 100);
      const baseOpacity = normalizeLength(styles.getPropertyValue('--badge-trace-opacity'), 0.67);
      const duration = normalizeDuration(styles.getPropertyValue('--badge-orbit-duration'), 6800);
      let animationFrame = 0;
      let lastTimestamp = 0;
      let distance = 0;

      const pointAt = (distance) => {
        const normalized = ((distance % total) + total) % total;
        return rail.getPointAtLength(normalized);
      };

      const sideBiasAt = (distance) => {
        const phase = (((distance / total) % 1) + 1) % 1;
        const sideBias = Math.sin(phase * Math.PI * 2);
        return sideBias * sideBias;
      };

      const getMotionState = (distance) => {
        const sideBias = sideBiasAt(distance);

        return {
          length: baseTraceLength * (0.5 + sideBias * 1.5),
          opacity: Math.min(1, baseOpacity * (1 + sideBias * 0.5)),
          speed: 0.5 + sideBias * 1.5,
        };
      };

      const buildTrace = (center, length) => {
        let path = '';
        const steps = Math.max(10, Math.ceil(length / 1.25));
        const start = center - length / 2;

        for (let index = 0; index <= steps; index += 1) {
          const point = pointAt(start + (length * index) / steps);
          const command = index === 0 ? 'M' : 'L';
          path += `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
        }

        return path.trim();
      };

      const draw = (distance) => {
        const state = getMotionState(distance);

        traces[0].setAttribute('d', buildTrace(distance, state.length));
        traces[1].setAttribute('d', buildTrace(distance + total / 2, state.length));
        traces.forEach((trace) => {
          trace.style.opacity = state.opacity.toFixed(3);
        });
      };

      draw(0);
      orbit.classList.add('is-ready');

      if (prefersReducedMotion) return;

      const tick = (timestamp) => {
        if (!lastTimestamp) lastTimestamp = timestamp;
        const elapsed = timestamp - lastTimestamp;
        const state = getMotionState(distance);
        distance = (distance + (total * elapsed * state.speed) / duration) % total;
        draw(distance);
        lastTimestamp = timestamp;
        animationFrame = window.requestAnimationFrame(tick);
      };

      animationFrame = window.requestAnimationFrame(tick);

      document.addEventListener('visibilitychange', () => {
        if (document.hidden && animationFrame) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        } else if (!document.hidden && !animationFrame) {
          lastTimestamp = 0;
          animationFrame = window.requestAnimationFrame(tick);
        }
      });
    });
  };

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

  // -----------------------------------------------------------------
  // Cookie banner / consent state
  // -----------------------------------------------------------------
  const initCookieBanner = () => {
    const banner = document.querySelector('[data-cookie-banner]');
    const statusLabel = document.querySelector('[data-cookie-status]');
    const acceptButtons = document.querySelectorAll('[data-cookie-accept]');
    const declineButtons = document.querySelectorAll('[data-cookie-decline]');
    const settingsButtons = document.querySelectorAll('[data-cookie-settings]');

    if (!banner) return;

    let hideTimer = null;

    const updateStatusLabel = () => {
      if (!statusLabel) return;

      if (window.siteConsent.status === 'granted') {
        statusLabel.textContent = 'Aktuelle Auswahl: Optionale Analyse-Cookies sind freigegeben.';
        return;
      }

      if (window.siteConsent.status === 'denied') {
        statusLabel.textContent = 'Aktuelle Auswahl: Es sind nur notwendige Speicherungen aktiviert.';
        return;
      }

      statusLabel.textContent = 'Sie können Ihre Auswahl jederzeit über die Cookie-Einstellungen im Footer ändern.';
    };

    const showBanner = () => {
      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }

      updateStatusLabel();
      banner.hidden = false;
      banner.offsetWidth;
      banner.classList.add('is-visible');
    };

    const hideBanner = () => {
      banner.classList.remove('is-visible');

      hideTimer = window.setTimeout(() => {
        banner.hidden = true;
      }, 260);
    };

    window.siteConsent.openSettings = showBanner;

    if (window.siteConsent.status === 'unset') {
      showBanner();
    }

    acceptButtons.forEach((button) => {
      button.addEventListener('click', () => {
        persistConsentStatus('granted');
        updateStatusLabel();
        hideBanner();
      });
    });

    declineButtons.forEach((button) => {
      button.addEventListener('click', () => {
        persistConsentStatus('denied');
        updateStatusLabel();
        hideBanner();
      });
    });

    settingsButtons.forEach((button) => {
      button.addEventListener('click', () => {
        showBanner();
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !banner.hidden) {
        hideBanner();
      }
    });
  };

  const initFaqMotion = () => {
    const faqItems = document.querySelectorAll('.faq__item');
    if (!faqItems.length) {
      return;
    }

    const animateFaqItem = (item, shouldOpen) => {
      const summary = item.querySelector('.faq__summary');
      if (!summary) return;

      if (item.faqAnimation) {
        item.faqAnimation.cancel();
      }

      const startHeight = `${item.offsetHeight}px`;

      if (shouldOpen) {
        item.open = true;
      }

      const endHeight = shouldOpen ? `${item.offsetHeight}px` : `${summary.offsetHeight}px`;

      item.classList.add('is-animating');
      item.style.height = startHeight;
      item.style.overflow = 'hidden';

      item.faqAnimation = item.animate({
        height: [startHeight, endHeight],
      }, {
        duration: shouldOpen ? 260 : 200,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });

      item.faqAnimation.onfinish = () => {
        item.open = shouldOpen;
        item.style.height = '';
        item.style.overflow = '';
        item.classList.remove('is-animating');
        item.faqAnimation = null;
      };

      item.faqAnimation.oncancel = () => {
        item.style.height = '';
        item.style.overflow = '';
        item.classList.remove('is-animating');
        item.faqAnimation = null;
      };
    };

    const closeSiblingFaqItems = (item, items) => {
      items.forEach((sibling) => {
        if (sibling !== item && sibling.open) {
          animateFaqItem(sibling, false);
        }
      });
    };

    document.querySelectorAll('.faq__list').forEach((faqList) => {
      const items = Array.from(faqList.querySelectorAll('.faq__item'));
      let firstOpenItem = null;

      items.forEach((item) => {
        if (item.open && !firstOpenItem) {
          firstOpenItem = item;
        } else if (item.open) {
          item.open = false;
        }

        item.querySelector('.faq__summary')?.addEventListener('click', (event) => {
          if (prefersReducedMotion || typeof HTMLElement.prototype.animate !== 'function') {
            window.requestAnimationFrame(() => {
              if (item.open) closeSiblingFaqItems(item, items);
            });
            return;
          }

          event.preventDefault();

          if (item.open) {
            animateFaqItem(item, false);
          } else {
            closeSiblingFaqItems(item, items);
            animateFaqItem(item, true);
          }
        });
      });
    });
  };

  const initTestimonialCarousels = () => {
    const carousels = document.querySelectorAll('[data-testimonial-carousel]');
    if (!carousels.length) return;

    carousels.forEach((carousel) => {
      const viewport = carousel.querySelector('.testimonial-carousel__viewport');
      const slides = Array.from(carousel.querySelectorAll('[data-testimonial-slide]'));
      const dots = Array.from(carousel.querySelectorAll('[data-testimonial-dot]'));
      const prevButton = carousel.querySelector('[data-testimonial-prev]');
      const nextButton = carousel.querySelector('[data-testimonial-next]');
      const autoplayDelay = Number.parseInt(carousel.getAttribute('data-testimonial-autoplay') || '', 10);
      let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
      let autoplayTimer = 0;
      let resizeQueued = false;

      if (!viewport || slides.length < 1) return;

      const syncHeight = () => {
        const activeSlide = slides[activeIndex] || slides[0];
        const activeHeight = activeSlide ? activeSlide.getBoundingClientRect().height : 0;

        if (activeHeight) {
          viewport.style.setProperty('--testimonial-carousel-height', `${Math.ceil(activeHeight)}px`);
        }
      };

      const queueHeightSync = () => {
        if (resizeQueued) return;

        resizeQueued = true;
        window.requestAnimationFrame(() => {
          resizeQueued = false;
          syncHeight();
        });
      };

      const render = (index) => {
        activeIndex = (index + slides.length) % slides.length;

        slides.forEach((slide, slideIndex) => {
          const isActive = slideIndex === activeIndex;
          slide.classList.toggle('is-active', isActive);
          slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });

        dots.forEach((dot, dotIndex) => {
          const isActive = dotIndex === activeIndex;
          dot.classList.toggle('is-active', isActive);
          dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        queueHeightSync();
      };

      const stopAutoplay = () => {
        if (!autoplayTimer) return;
        window.clearInterval(autoplayTimer);
        autoplayTimer = 0;
      };

      const startAutoplay = () => {
        if (prefersReducedMotion || slides.length < 2 || !autoplayDelay) return;

        stopAutoplay();
        autoplayTimer = window.setInterval(() => {
          render(activeIndex + 1);
        }, autoplayDelay);
      };

      prevButton?.addEventListener('click', () => {
        render(activeIndex - 1);
      });

      nextButton?.addEventListener('click', () => {
        render(activeIndex + 1);
      });

      dots.forEach((dot) => {
        dot.addEventListener('click', () => {
          render(Number.parseInt(dot.getAttribute('data-testimonial-dot') || '0', 10));
        });
      });

      carousel.addEventListener('mouseenter', stopAutoplay);
      carousel.addEventListener('mouseleave', startAutoplay);
      carousel.addEventListener('focusin', stopAutoplay);
      carousel.addEventListener('focusout', startAutoplay);
      window.addEventListener('resize', queueHeightSync);

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(queueHeightSync);
      }

      render(activeIndex);
      queueHeightSync();
      startAutoplay();
    });
  };

  const initGallery = () => {
    const gallery = document.querySelector('[data-gallery]');
    if (!gallery) return;

    const track = gallery.querySelector('[data-gallery-track]');
    const slides = Array.from(gallery.querySelectorAll('[data-gallery-open]'));
    const prevButton = gallery.querySelector('[data-gallery-prev]');
    const nextButton = gallery.querySelector('[data-gallery-next]');
    const lightbox = gallery.querySelector('[data-gallery-lightbox]');
    const lightboxImage = gallery.querySelector('[data-gallery-lightbox-image]');
    const lightboxCaption = gallery.querySelector('[data-gallery-lightbox-caption]');
    const lightboxClose = gallery.querySelector('[data-gallery-lightbox-close]');
    const lightboxPrev = gallery.querySelector('[data-gallery-lightbox-prev]');
    const lightboxNext = gallery.querySelector('[data-gallery-lightbox-next]');

    if (!track || slides.length < 1) return;

    let activeIndex = 0;
    let trackIndex = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let suppressSlideClick = false;
    let suppressClickTimer = 0;

    const getTrackGap = () => {
      const styles = window.getComputedStyle(track);
      const gap = parseFloat(styles.columnGap || styles.gap || '0');
      return Number.isNaN(gap) ? 0 : gap;
    };

    const getVisibleCount = () => (window.matchMedia('(min-width: 860px)').matches ? 2 : 1);

    const getMaxTrackIndex = () => Math.max(0, slides.length - getVisibleCount());

    const updateTrackControls = () => {
      if (!prevButton || !nextButton) return;

      const maxTrackIndex = getMaxTrackIndex();
      prevButton.disabled = trackIndex <= 0;
      nextButton.disabled = trackIndex >= maxTrackIndex;
    };

    const updateTrackPosition = () => {
      const slideWidth = slides[0]?.getBoundingClientRect().width || 0;
      const offset = (slideWidth + getTrackGap()) * trackIndex;

      track.style.setProperty('--gallery-translate', `${offset * -1}px`);
      updateTrackControls();
    };

    const setTrackIndex = (nextIndex) => {
      trackIndex = Math.min(Math.max(nextIndex, 0), getMaxTrackIndex());
      updateTrackPosition();
    };

    const scrollTrack = (direction) => {
      setTrackIndex(trackIndex + direction * getVisibleCount());
    };

    const setLightboxSlide = (index) => {
      if (!lightboxImage || !lightboxCaption || !slides.length) return;

      activeIndex = (index + slides.length) % slides.length;
      const trigger = slides[activeIndex];
      const imageSrc = trigger.getAttribute('href') || '';
      const imageAlt = trigger.getAttribute('data-gallery-alt') || trigger.querySelector('img')?.alt || '';

      lightboxImage.src = imageSrc;
      lightboxImage.alt = imageAlt;
      lightboxCaption.textContent = imageAlt;
    };

    const openLightbox = (index) => {
      if (!lightbox || typeof lightbox.showModal !== 'function') return;
      setLightboxSlide(index);
      lightbox.showModal();
    };

    const closeLightbox = () => {
      if (!lightbox || !lightbox.open) return;
      lightbox.close();
    };

    slides.forEach((slide, index) => {
      slide.addEventListener('click', (event) => {
        if (suppressSlideClick) {
          event.preventDefault();
          suppressSlideClick = false;
          return;
        }

        if (!lightbox || typeof lightbox.showModal !== 'function') return;
        event.preventDefault();
        openLightbox(index);
      });
    });

    if (prevButton) {
      prevButton.addEventListener('click', () => {
        scrollTrack(-1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => {
        scrollTrack(1);
      });
    }

    track.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollTrack(-1);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollTrack(1);
      }
    });

    track.addEventListener('touchstart', (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    track.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return;
      }

      if (suppressClickTimer) {
        window.clearTimeout(suppressClickTimer);
      }

      suppressSlideClick = true;
      suppressClickTimer = window.setTimeout(() => {
        suppressSlideClick = false;
        suppressClickTimer = 0;
      }, 240);
      scrollTrack(deltaX > 0 ? -1 : 1);
    }, { passive: true });

    track.addEventListener('touchcancel', () => {
      touchStartX = 0;
      touchStartY = 0;
      if (suppressClickTimer) {
        window.clearTimeout(suppressClickTimer);
        suppressClickTimer = 0;
      }
      suppressSlideClick = false;
    }, { passive: true });

    window.addEventListener('resize', () => {
      setTrackIndex(trackIndex);
    });
    updateTrackPosition();

    if (!lightbox) return;

    if (lightboxClose) {
      lightboxClose.addEventListener('click', () => {
        closeLightbox();
      });
    }

    if (lightboxPrev) {
      lightboxPrev.addEventListener('click', () => {
        setLightboxSlide(activeIndex - 1);
      });
    }

    if (lightboxNext) {
      lightboxNext.addEventListener('click', () => {
        setLightboxSlide(activeIndex + 1);
      });
    }

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    lightbox.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setLightboxSlide(activeIndex - 1);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setLightboxSlide(activeIndex + 1);
      }
    });
  };

  const parseEmail = (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
  };

  const parsePhone = (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    const normalized = trimmed.replace(/[^\d+]/g, '');
    return normalized.length >= 6 ? trimmed : null;
  };

  const submitFormsparkPayload = (endpoint, payload) => {
    const formData = new URLSearchParams();
    Object.keys(payload).forEach((key) => {
      if (payload[key] !== '') {
        formData.append(key, payload[key]);
      }
    });

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }).then((response) => {
      if (!response.ok) {
        throw new Error('Formspark request failed');
      }
      return response.text();
    });
  };

  const refreshFormGuard = (form) => {
    form.setAttribute('data-form-started-at', String(Date.now()));
  };

  const getHoneypotValue = (form) => {
    const field = form.querySelector("input[name='_honeypot']");
    return field ? (field.value || '').trim() : '';
  };

  const isFormSubmittedTooFast = (form) => {
    const startedAt = parseInt(form.getAttribute('data-form-started-at') || '', 10);
    const minSubmitMs = parseInt(form.getAttribute('data-form-min-submit-ms') || '', 10);

    if (Number.isNaN(startedAt) || Number.isNaN(minSubmitMs)) {
      return false;
    }

    return Date.now() - startedAt < minSubmitMs;
  };

  const initOfferForms = () => {
    const forms = document.querySelectorAll('[data-offer-form]');
    if (!forms.length) return;

    forms.forEach((form) => {
      refreshFormGuard(form);
      const endpoint = form.getAttribute('data-form-endpoint') || '';
      const status = form.querySelector('[data-form-status]');
      const success = form.querySelector('[data-form-success]');
      const submitButton = form.querySelector("button[type='submit']");
      const defaultLabel = submitButton ? submitButton.getAttribute('data-submit-label') || submitButton.textContent.trim() : '';
      const defaultButtonHtml = submitButton ? submitButton.innerHTML : '';

      form.addEventListener('submit', (event) => {
        event.preventDefault();

        const nameInput = form.querySelector("input[name='name']");
        const phoneInput = form.querySelector("input[name='phone']");
        const emailInput = form.querySelector("input[name='email']");
        const privacyInput = form.querySelector("input[name='privacy_accepted']");
        const nameError = form.querySelector("[data-error-for='name']");
        const phoneError = form.querySelector("[data-error-for='phone']");
        const emailError = form.querySelector("[data-error-for='email']");
        const privacyError = form.querySelector("[data-error-for='privacy_accepted']");
        const parsedName = (nameInput?.value || '').trim();
        const parsedPhone = parsePhone(phoneInput?.value || '');
        const parsedEmail = parseEmail(emailInput?.value || '');
        let hasError = false;

        [nameError, phoneError, emailError, privacyError].forEach((el) => {
          if (el) el.textContent = '';
        });
        [nameInput, phoneInput, emailInput].forEach((el) => {
          if (el) el.classList.remove('is-invalid');
        });
        if (success) success.hidden = true;
        if (status) status.textContent = '';

        if (getHoneypotValue(form)) {
          form.reset();
          refreshFormGuard(form);
          if (success) success.hidden = false;
          return;
        }

        if (isFormSubmittedTooFast(form)) {
          if (status) status.textContent = 'Bitte warten Sie einen Moment und senden Sie das Formular erneut.';
          return;
        }

        if (!parsedName) {
          if (nameInput) nameInput.classList.add('is-invalid');
          if (nameError) nameError.textContent = 'Bitte geben Sie Ihren Vor- und Nachnamen ein.';
          hasError = true;
        }

        if (parsedPhone === null) {
          if (phoneInput) phoneInput.classList.add('is-invalid');
          if (phoneError) phoneError.textContent = 'Bitte geben Sie eine gültige Telefonnummer ein, unter der wir Sie erreichen können.';
          hasError = true;
        }

        if (!parsedEmail) {
          if (emailInput) emailInput.classList.add('is-invalid');
          if (emailError) emailError.textContent = 'Bitte geben Sie eine gültige E-Mail-Adresse ein, z. B. name@example.ch.';
          hasError = true;
        }

        if (!privacyInput?.checked) {
          if (privacyError) privacyError.textContent = 'Bitte bestätigen Sie die Datenschutzerklärung.';
          hasError = true;
        }

        if (hasError || !submitButton || !endpoint) {
          return;
        }

        const payload = {};
        new FormData(form).forEach((value, key) => {
          if (key !== '_honeypot') {
            payload[key] = typeof value === 'string' ? value.trim() : value;
          }
        });
        payload.submittedAt = new Date().toISOString();

        submitButton.disabled = true;
        submitButton.classList.remove('is-success', 'is-error');
        submitButton.classList.add('is-loading');
        if (status) status.textContent = 'Ihre Anfrage wird gesendet...';

        submitFormsparkPayload(endpoint, payload)
          .then(() => {
            form.reset();
            refreshFormGuard(form);
            if (status) status.textContent = '';
            if (success) success.hidden = false;
            submitButton.classList.remove('is-loading');
            submitButton.classList.add('is-success');
            submitButton.textContent = 'Anfrage gesendet';
            window.setTimeout(() => {
              submitButton.classList.remove('is-success');
              submitButton.innerHTML = defaultButtonHtml;
            }, 1800);
          })
          .catch(() => {
            submitButton.classList.remove('is-loading');
            submitButton.classList.add('is-error');
            submitButton.innerHTML = defaultButtonHtml;
            if (status) status.textContent = 'Ihre Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es erneut oder rufen Sie uns an.';
          })
          .finally(() => {
            submitButton.disabled = false;
          });
      });
    });
  };

  initCookieBanner();
  initFaqMotion();
  initTestimonialCarousels();
  initGallery();
  initBadgeOrbit();
  initOfferForms();
})();
