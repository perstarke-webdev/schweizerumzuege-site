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
    if (header) header.classList.add('is-nav-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Navigation schließen');
    if (navToggleLabel) navToggleLabel.textContent = 'Navigation schließen';
  };

  const closeNav = () => {
    if (!navPanel || !navToggle) return;
    navPanel.classList.remove('is-open');
    doc.classList.remove('has-nav-open');
    if (header) header.classList.remove('is-nav-open');
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
  initOfferForms();
})();
