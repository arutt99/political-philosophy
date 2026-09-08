/*
  Shared presentation support.

  The deck pages render their slide data locally. This file keeps the existing
  responsive fitting behavior and adds a review stage before presentation mode
  so the same controls work across every course deck.
*/

(() => {
  const getSourceSlides = () =>
    [...document.querySelectorAll('.slide')].filter(slide => !slide.closest('#preflight'));

  let previewRefresh = () => {};

  const fitSlide = (slide) => {
    const inner = slide.querySelector('.slide-inner');
    if (!inner || !slide.clientHeight || !slide.clientWidth) return;

    slide.classList.add('measuring');
    let scale = 1;
    slide.style.setProperty('--fit', scale);

    const fits = () =>
      inner.scrollHeight <= slide.clientHeight * 0.82 &&
      inner.scrollWidth <= slide.clientWidth * 0.92;

    while (scale > 0.72 && !fits()) {
      scale = Math.max(0.72, scale - 0.01);
      slide.style.setProperty('--fit', scale.toFixed(3));
    }

    slide.classList.remove('measuring');
  };

  const fitEverySlide = () => {
    getSourceSlides().forEach(fitSlide);
    previewRefresh();
  };

  let resizeTimer;
  const scheduleFit = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitEverySlide, 210);
  };

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));

  const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  const slideLabel = (slide) => {
    const label = slide.querySelector('.title, .prompt, blockquote, .eyebrow');
    return cleanText(label?.textContent || 'Untitled slide') || 'Untitled slide';
  };

  const deckTitle = (sourceSlides) => {
    const coverTitle = sourceSlides[0]?.querySelector('.title');
    if (coverTitle) return cleanText(coverTitle.textContent);
    return cleanText(document.title.replace(/^\d+\/\d+\s*·\s*/, '')) || 'Presentation';
  };

  const deckSubtitle = (sourceSlides) =>
    cleanText(sourceSlides[0]?.querySelector('.cover .work, .work')?.textContent);

  const deckCourse = (sourceSlides) =>
    cleanText(sourceSlides[0]?.querySelector('.cover .course, .course')?.textContent);

  const navigator = () => {
    for (const name of ['show', 'go']) {
      if (typeof window[name] === 'function') return window[name].bind(window);
    }
    return null;
  };

  const createPreview = () => {
    const sourceSlides = getSourceSlides();
    if (!sourceSlides.length || document.getElementById('preflight')) return;

    const included = sourceSlides.map(() => true);
    const overlay = document.createElement('div');
    overlay.id = 'preflight';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'preflight-title');
    overlay.innerHTML = `
      <div class="preflight-shell">
        <div class="preflight-topbar">
          <a class="preflight-back" href="../index.html?view=political-philosophy">← Back to library</a>
          <span class="preflight-kicker">Before you present</span>
        </div>
        <div class="preflight-heading">
          <div class="preflight-heading-copy">
            <p class="preflight-kicker">Slide review</p>
            <h1 class="preflight-title" id="preflight-title">${escapeHTML(deckTitle(sourceSlides))}</h1>
            ${deckSubtitle(sourceSlides) ? `<p class="preflight-subtitle">${escapeHTML(deckSubtitle(sourceSlides))}</p>` : ''}
            ${deckCourse(sourceSlides) ? `<p class="preflight-course">${escapeHTML(deckCourse(sourceSlides))}</p>` : ''}
          </div>
          <div class="preflight-actions">
            <button class="preflight-reset" type="button">Include all</button>
            <button class="preflight-enter" type="button">Enter presentation mode</button>
          </div>
        </div>
        <div class="preflight-summary">
          <span class="preflight-count" id="preflight-count" aria-live="polite"></span>
          <span class="preflight-help">Scroll to review every slide. Choose Skip on anything you want to leave out.</span>
        </div>
        <p class="preflight-status" id="preflight-status" aria-live="polite"></p>
        <div class="preflight-grid" id="preflight-grid"></div>
      </div>`;

    document.body.appendChild(overlay);

    const grid = overlay.querySelector('#preflight-grid');
    const count = overlay.querySelector('#preflight-count');
    const status = overlay.querySelector('#preflight-status');
    const reset = overlay.querySelector('.preflight-reset');
    const enter = overlay.querySelector('.preflight-enter');
    const cards = [];
    const overviewCards = [...document.querySelectorAll('#overview-grid .overview-card')];

    const includedTotal = () => included.filter(Boolean).length;

    const syncPreviewCard = (index) => {
      const card = cards[index];
      if (!card) return;
      const skipped = !included[index];
      card.classList.toggle('is-skipped', skipped);
      const button = card.querySelector('.preflight-toggle');
      button.textContent = skipped ? 'Include' : 'Skip';
      button.setAttribute('aria-pressed', String(skipped));
      button.setAttribute('aria-label', `${skipped ? 'Include' : 'Skip'} slide ${index + 1}`);
    };

    const syncOverview = () => {
      overviewCards.forEach((card, index) => {
        card.classList.toggle('preflight-skipped', !included[index]);
      });
    };

    const updateSummary = () => {
      const total = includedTotal();
      count.textContent = `${total} of ${sourceSlides.length} ${sourceSlides.length === 1 ? 'slide' : 'slides'} included`;
      enter.disabled = total === 0;
      reset.disabled = total === sourceSlides.length;
      cards.forEach((_, index) => syncPreviewCard(index));
      syncOverview();
    };

    sourceSlides.forEach((sourceSlide, index) => {
      const card = document.createElement('article');
      card.className = 'preflight-card';
      card.dataset.index = String(index);

      const frame = document.createElement('div');
      frame.className = 'preflight-frame';
      const deck = document.getElementById('deck');
      if (deck) frame.style.background = getComputedStyle(deck).background;
      const clone = sourceSlide.cloneNode(true);
      clone.classList.remove('measuring');
      clone.classList.add('active', 'preflight-slide');
      clone.removeAttribute('aria-hidden');
      frame.appendChild(clone);

      const skippedMark = document.createElement('div');
      skippedMark.className = 'preflight-skipped-mark';
      skippedMark.textContent = 'Skipped';
      skippedMark.setAttribute('aria-hidden', 'true');
      frame.appendChild(skippedMark);

      const footer = document.createElement('div');
      footer.className = 'preflight-card-footer';
      footer.innerHTML = `
        <div class="preflight-card-meta">
          <span class="preflight-card-number">Slide ${String(index + 1).padStart(2, '0')}</span>
          <span class="preflight-card-label">${escapeHTML(slideLabel(sourceSlide))}</span>
        </div>
        <button class="preflight-toggle" type="button" aria-pressed="false">Skip</button>`;

      footer.querySelector('.preflight-toggle').addEventListener('click', () => {
        if (included[index] && includedTotal() === 1) {
          status.textContent = 'Keep at least one slide included to start the presentation.';
          status.dataset.kind = 'warning';
          return;
        }
        included[index] = !included[index];
        status.textContent = '';
        status.dataset.kind = '';
        updateSummary();
      });

      card.append(frame, footer);
      grid.appendChild(card);
      cards.push(card);
    });

    const state = {
      started: false,
      included,
      sourceSlides,
      overlay,
      getCurrent: () => {
        const current = sourceSlides.findIndex(slide => slide.classList.contains('active'));
        return current >= 0 ? current : 0;
      }
    };

    const updatePreviewSize = () => {
      const viewportWidth = Math.max(1, window.innerWidth);
      const viewportHeight = Math.max(1, window.innerHeight);
      const ratio = viewportWidth / viewportHeight;
      document.documentElement.style.setProperty('--preflight-ratio', String(ratio));

      cards.forEach((card, index) => {
        const frameWidth = card.querySelector('.preflight-frame')?.clientWidth || 0;
        const clone = card.querySelector('.preflight-slide');
        if (!frameWidth || !clone) return;
        clone.style.setProperty('--preflight-viewport-width', `${viewportWidth}px`);
        clone.style.setProperty('--preflight-viewport-height', `${viewportHeight}px`);
        clone.style.setProperty('--preflight-scale', String(frameWidth / viewportWidth));
        const fit = sourceSlides[index].style.getPropertyValue('--fit') || '1';
        clone.style.setProperty('--fit', fit);
      });
    };

    previewRefresh = updatePreviewSize;

    const firstIncluded = () => included.findIndex(Boolean);

    const moveTo = (index) => {
      const go = navigator();
      if (!go) return;
      go(Math.max(0, Math.min(sourceSlides.length - 1, index)));
    };

    const moveBy = (direction) => {
      const current = state.getCurrent();
      let target = current + direction;
      while (target >= 0 && target < sourceSlides.length && !included[target]) {
        target += direction;
      }
      if (target >= 0 && target < sourceSlides.length && included[target]) moveTo(target);
    };

    const closeReview = () => {
      state.started = true;
      overlay.hidden = true;
      document.body.classList.remove('preflight-open');
      const deck = document.getElementById('deck');
      deck?.removeAttribute('aria-hidden');
      deck?.removeAttribute('inert');
      const first = firstIncluded();
      if (first >= 0) moveTo(first);
      const fullscreenRequest = document.documentElement.requestFullscreen?.();
      fullscreenRequest?.catch(() => {});
    };

    reset.addEventListener('click', () => {
      included.fill(true);
      status.textContent = '';
      status.dataset.kind = '';
      updateSummary();
    });

    enter.addEventListener('click', closeReview);

    const syncAccessibility = () => {
      const deck = document.getElementById('deck');
      if (!deck) return;
      if (state.started) {
        deck.removeAttribute('aria-hidden');
        deck.removeAttribute('inert');
      } else {
        deck.setAttribute('aria-hidden', 'true');
        deck.setAttribute('inert', '');
      }
    };

    document.body.classList.add('preflight-open');
    syncAccessibility();
    updateSummary();
    requestAnimationFrame(updatePreviewSize);
    enter.focus({ preventScroll: true });

    window.__presentationPreflight = state;

    document.addEventListener('keydown', (event) => {
      const navigationKeys = ['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'ArrowLeft', 'ArrowUp', 'PageUp'];
      const key = event.key;

      if (!state.started) {
        if (key === ' ' && event.target.closest('#preflight button')) return;
        if (navigationKeys.includes(key) || ['o', 'O', 'n', 'N', 'f', 'F'].includes(key)) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }

      if (document.querySelector('.panel.open')) return;
      if (!navigationKeys.includes(key)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      moveBy(['ArrowLeft', 'ArrowUp', 'PageUp'].includes(key) ? -1 : 1);
    }, true);

    document.addEventListener('click', (event) => {
      if (!state.started) return;
      const card = event.target.closest('#overview-grid .overview-card');
      if (!card) return;
      const index = overviewCards.indexOf(card);
      if (index >= 0 && !included[index]) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    let touchStart = null;
    document.addEventListener('touchstart', (event) => {
      touchStart = event.changedTouches[0];
    }, { capture: true, passive: true });

    document.addEventListener('touchend', (event) => {
      if (!touchStart) return;
      const touch = event.changedTouches[0];
      const dx = touch.screenX - touchStart.screenX;
      const dy = touch.screenY - touchStart.screenY;
      touchStart = null;

      if (!state.started) {
        event.stopImmediatePropagation();
        return;
      }
      if (document.querySelector('.panel.open') || Math.abs(dx) <= 55 || Math.abs(dx) <= Math.abs(dy)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      moveBy(dx < 0 ? 1 : -1);
    }, { capture: true, passive: false });

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fitEverySlide();
        updatePreviewSize();
      }, 210);
    });
  };

  const initialize = () => {
    createPreview();
    fitEverySlide();
  };

  window.addEventListener('load', () => {
    fitEverySlide();
    previewRefresh();
  }, { once: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleFit);
  } else {
    scheduleFit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
