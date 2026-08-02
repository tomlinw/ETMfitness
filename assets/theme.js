/* Ironforge theme scripts — vanilla, no dependencies. */
(function () {
  'use strict';

  const routes = window.routes || {};
  const strings = window.strings || {};

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const money = (cents) => {
    const format = window.Shopify && window.Shopify.currency ? window.Shopify.currency.active : 'USD';
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en', {
        style: 'currency',
        currency: format
      }).format(cents / 100);
    } catch (e) {
      return '$' + (cents / 100).toFixed(2);
    }
  };

  /* ------------------------------------------------------------ Overlay -- */
  const overlay = $('#Overlay');
  let openPanels = 0;

  function showOverlay() {
    openPanels += 1;
    if (!overlay) return;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
    document.body.classList.add('is-locked');
  }

  function hideOverlay() {
    openPanels = Math.max(0, openPanels - 1);
    if (openPanels > 0 || !overlay) return;
    overlay.classList.remove('is-visible');
    document.body.classList.remove('is-locked');
    setTimeout(() => {
      if (openPanels === 0) overlay.hidden = true;
    }, 200);
  }

  /* -------------------------------------------------------------- Panels -- */
  /* A panel is any element toggled by [data-panel-open="<id>"] buttons. */
  const panels = new Map();

  function registerPanel(el) {
    if (!el || panels.has(el.id)) return;
    panels.set(el.id, { el, lastFocused: null });
  }

  function openPanel(id) {
    const panel = panels.get(id);
    /* Guard re-opening: it would push the overlay counter out of balance. */
    if (!panel || panel.el.classList.contains('is-open')) return;
    panel.lastFocused = document.activeElement;
    panel.el.classList.add('is-open');
    panel.el.removeAttribute('aria-hidden');
    showOverlay();
    const focusTarget = panel.el.querySelector('[data-panel-focus], input, button, a[href]');
    if (focusTarget) setTimeout(() => focusTarget.focus(), 120);
  }

  function closePanel(id) {
    const panel = panels.get(id);
    if (!panel || !panel.el.classList.contains('is-open')) return;
    panel.el.classList.remove('is-open');
    panel.el.setAttribute('aria-hidden', 'true');
    hideOverlay();
    if (panel.lastFocused) panel.lastFocused.focus();
  }

  function closeAllPanels() {
    panels.forEach((panel, id) => closePanel(id));
  }

  function initPanels(root = document) {
    $$('[data-panel]', root).forEach(registerPanel);
    $$('[data-panel-open]', root).forEach((btn) => {
      if (btn.dataset.panelBound) return;
      btn.dataset.panelBound = 'true';
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        openPanel(btn.dataset.panelOpen);
      });
    });
    $$('[data-panel-close]', root).forEach((btn) => {
      if (btn.dataset.panelBound) return;
      btn.dataset.panelBound = 'true';
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const id = btn.dataset.panelClose || btn.closest('[data-panel]')?.id;
        closePanel(id);
      });
    });
  }

  if (overlay) overlay.addEventListener('click', closeAllPanels);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllPanels();
  });

  /* --------------------------------------------------------------- Cart -- */
  const CartAPI = {
    async add(formData) {
      const res = await fetch(routes.cart_add_url + '.js', {
        method: 'POST',
        headers: { Accept: 'application/javascript' },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    },
    async change(payload) {
      const res = await fetch(routes.cart_change_url + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/javascript' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Cart update failed');
      return res.json();
    },
    async get() {
      const res = await fetch(routes.cart_url + '.js');
      return res.json();
    }
  };

  async function refreshCartSections() {
    const ids = ['cart-drawer', 'cart-icon'];
    const url = `${routes.cart_url}?sections=${ids.join(',')}`;
    try {
      const res = await fetch(url);
      const sections = await res.json();

      if (sections['cart-drawer']) {
        const drawer = $('#CartDrawer');
        const html = new DOMParser().parseFromString(sections['cart-drawer'], 'text/html');
        const fresh = html.querySelector('#CartDrawer');
        if (drawer && fresh) {
          const wasOpen = drawer.classList.contains('is-open');
          drawer.innerHTML = fresh.innerHTML;
          if (wasOpen) drawer.classList.add('is-open');
          initPanels(drawer);
          bindCartEvents(drawer);
        }
      }

      if (sections['cart-icon']) {
        const html = new DOMParser().parseFromString(sections['cart-icon'], 'text/html');
        const fresh = html.querySelector('[data-cart-count]');
        const current = $('[data-cart-count]');
        if (fresh && current) current.replaceWith(fresh);
      }
    } catch (e) {
      /* Non-fatal: the cart page reload will reconcile state. */
    }
  }

  function bindCartEvents(root = document) {
    $$('[data-cart-quantity]', root).forEach((input) => {
      if (input.dataset.bound) return;
      input.dataset.bound = 'true';
      input.addEventListener('change', async () => {
        const container = input.closest('[data-cart-item]');
        container?.classList.add('cart-loading');
        try {
          await CartAPI.change({ line: Number(input.dataset.line), quantity: Number(input.value) });
          if (document.body.classList.contains('template-cart')) {
            window.location.reload();
          } else {
            await refreshCartSections();
          }
        } catch (e) {
          container?.classList.remove('cart-loading');
        }
      });
    });

    $$('[data-cart-remove]', root).forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', async (event) => {
        event.preventDefault();
        const container = btn.closest('[data-cart-item]');
        container?.classList.add('cart-loading');
        try {
          await CartAPI.change({ line: Number(btn.dataset.line), quantity: 0 });
          if (document.body.classList.contains('template-cart')) {
            window.location.reload();
          } else {
            await refreshCartSections();
          }
        } catch (e) {
          container?.classList.remove('cart-loading');
        }
      });
    });

    const note = $('[data-cart-note]', root);
    if (note && !note.dataset.bound) {
      note.dataset.bound = 'true';
      let timer;
      note.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          fetch(routes.cart_update_url + '.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: note.value })
          });
        }, 500);
      });
    }
  }

  /* --------------------------------------------------- Add to cart forms -- */
  function bindProductForms(root = document) {
    $$('[data-product-form]', root).forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = 'true';

      form.addEventListener('submit', async (event) => {
        const drawerEnabled = form.dataset.cartDrawer === 'true';
        if (!drawerEnabled) return; /* Let it POST to /cart/add normally. */

        event.preventDefault();
        const submit = form.querySelector('[type="submit"]');
        const label = submit ? submit.innerHTML : '';
        const errorEl = form.querySelector('[data-form-error]');

        if (submit) {
          submit.setAttribute('aria-disabled', 'true');
          submit.innerHTML = '<span class="loading-spinner"></span>';
        }
        if (errorEl) errorEl.hidden = true;

        try {
          const formData = new FormData(form);
          await CartAPI.add(formData);
          await refreshCartSections();
          openPanel('CartDrawer');
        } catch (err) {
          if (errorEl) {
            errorEl.textContent = (err && (err.description || err.message)) || 'Could not add to cart.';
            errorEl.hidden = false;
          }
        } finally {
          if (submit) {
            submit.removeAttribute('aria-disabled');
            submit.innerHTML = label;
          }
        }
      });
    });
  }

  /* ------------------------------------------------------ Variant picker -- */
  function initVariantPickers(root = document) {
    $$('[data-variant-picker]', root).forEach((picker) => {
      if (picker.dataset.bound) return;
      picker.dataset.bound = 'true';

      const sectionId = picker.dataset.sectionId;
      const scope = picker.closest('[data-product-root]') || document;
      const dataEl = scope.querySelector('[data-variant-json]');
      if (!dataEl) return;

      let variants = [];
      try {
        variants = JSON.parse(dataEl.textContent);
      } catch (e) {
        return;
      }

      const idInput = scope.querySelector('[data-variant-id]');
      const priceEl = scope.querySelector('[data-price-container]');
      const submit = scope.querySelector('[data-add-button]');
      const submitText = scope.querySelector('[data-add-button-text]');
      const skuEl = scope.querySelector('[data-sku]');
      const inventoryEl = scope.querySelector('[data-inventory]');

      function selectedOptions() {
        return $$('input:checked', picker).map((input) => input.value);
      }

      function findVariant(options) {
        return variants.find((variant) =>
          variant.options.every((value, index) => value === options[index])
        );
      }

      function updateAvailability(current) {
        /* Grey out option values that produce no purchasable variant. */
        const groups = $$('[data-option-group]', picker);
        groups.forEach((group, groupIndex) => {
          $$('.variant-swatch', group).forEach((swatch) => {
            const input = swatch.querySelector('input');
            const trial = current.slice();
            trial[groupIndex] = input.value;
            const match = findVariant(trial);
            swatch.classList.toggle('variant-swatch--unavailable', !match || !match.available);
          });
        });
      }

      function update() {
        const options = selectedOptions();
        const variant = findVariant(options);

        $$('[data-option-selected]', picker).forEach((el, index) => {
          el.textContent = options[index] || '';
        });

        updateAvailability(options);

        if (!variant) {
          if (submit) submit.setAttribute('disabled', 'disabled');
          if (submitText) submitText.textContent = strings.unavailable || 'Unavailable';
          return;
        }

        if (idInput) idInput.value = variant.id;

        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());

        if (priceEl && sectionId) {
          fetch(`${window.location.pathname}?variant=${variant.id}&section_id=${sectionId}`)
            .then((res) => res.text())
            .then((text) => {
              const html = new DOMParser().parseFromString(text, 'text/html');
              const fresh = html.querySelector('[data-price-container]');
              if (fresh) priceEl.innerHTML = fresh.innerHTML;
              const freshInv = html.querySelector('[data-inventory]');
              if (freshInv && inventoryEl) inventoryEl.replaceWith(freshInv);
            })
            .catch(() => {});
        }

        if (skuEl) skuEl.textContent = variant.sku || '';

        if (submit && submitText) {
          if (variant.available) {
            submit.removeAttribute('disabled');
            submitText.textContent = strings.addToCart || 'Add to cart';
          } else {
            submit.setAttribute('disabled', 'disabled');
            submitText.textContent = strings.soldOut || 'Sold out';
          }
        }
      }

      picker.addEventListener('change', update);
      updateAvailability(selectedOptions());
    });
  }

  /* ------------------------------------------------------------ Quantity -- */
  function initQuantity(root = document) {
    $$('[data-quantity]', root).forEach((wrapper) => {
      if (wrapper.dataset.bound) return;
      wrapper.dataset.bound = 'true';
      const input = wrapper.querySelector('input');
      wrapper.addEventListener('click', (event) => {
        const button = event.target.closest('[data-quantity-change]');
        if (!button || !input) return;
        const delta = Number(button.dataset.quantityChange);
        const min = Number(input.min || 1);
        input.value = Math.max(min, Number(input.value) + delta);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  /* --------------------------------------------------- Predictive search -- */
  function initSearch() {
    const form = $('[data-predictive-search]');
    if (!form) return;
    const input = form.querySelector('input[type="search"]');
    const results = $('[data-predictive-results]');
    if (!input || !results) return;

    let controller;
    let timer;

    input.addEventListener('input', () => {
      clearTimeout(timer);
      const term = input.value.trim();
      if (term.length < 2) {
        results.innerHTML = '';
        return;
      }
      timer = setTimeout(async () => {
        if (controller) controller.abort();
        controller = new AbortController();
        const url = `${routes.predictive_search_url}?q=${encodeURIComponent(
          term
        )}&resources[type]=product,collection&resources[limit]=6&section_id=predictive-search`;
        try {
          const res = await fetch(url, { signal: controller.signal });
          const text = await res.text();
          const html = new DOMParser().parseFromString(text, 'text/html');
          const fresh = html.querySelector('[data-predictive-results]');
          results.innerHTML = fresh ? fresh.innerHTML : '';
        } catch (e) {
          /* aborted or offline */
        }
      }, 220);
    });
  }

  /* ---------------------------------------------------------- Mobile nav -- */
  function initMobileNavToggles(root = document) {
    $$('[data-submenu-toggle]', root).forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.getAttribute('aria-controls'));
        if (!target) return;
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        target.hidden = expanded;
      });
    });
  }

  /* ------------------------------------------------------ Scroll reveals -- */
  function initReveals() {
    const items = $$('.reveal');
    if (!items.length || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    items.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------- Sort / facets -- */
  function initCollectionControls() {
    const sort = $('[data-sort-by]');
    if (sort) {
      sort.addEventListener('change', () => {
        const url = new URL(window.location.href);
        url.searchParams.set('sort_by', sort.value);
        url.searchParams.delete('page');
        window.location.href = url.toString();
      });
    }

    $$('[data-facet-form]').forEach((form) => {
      form.addEventListener('change', () => form.submit());
    });
  }

  /* ---------------------------------------------------------- Share link -- */
  function initShare(root = document) {
    $$('[data-share]', root).forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', async () => {
        const url = btn.dataset.share || window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ url, title: document.title });
            return;
          } catch (e) {
            /* user cancelled — fall through to copy */
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          const original = btn.textContent;
          btn.textContent = btn.dataset.copiedLabel || 'Link copied';
          setTimeout(() => (btn.textContent = original), 2000);
        } catch (e) {
          /* clipboard unavailable */
        }
      });
    });
  }

  /* --------------------------------------------------------------- Init -- */
  function init(root = document) {
    initPanels(root);
    bindCartEvents(root);
    bindProductForms(root);
    initVariantPickers(root);
    initQuantity(root);
    initMobileNavToggles(root);
    initShare(root);
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    initSearch();
    initReveals();
    initCollectionControls();
  });

  /* Re-initialise when a section is re-rendered in the theme editor. */
  document.addEventListener('shopify:section:load', (event) => init(event.target));
  document.addEventListener('shopify:section:select', (event) => {
    if (event.target.id.includes('cart-drawer')) openPanel('CartDrawer');
  });

  window.IronforgeTheme = { openPanel, closePanel, refreshCartSections, CartAPI, money };
})();
