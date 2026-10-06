(() => {
  const root = document.documentElement;
  const links = [...document.querySelectorAll('[data-section-link]')];
  const sections = [...document.querySelectorAll('[data-observe-section]')];
  const signalFlows = [...document.querySelectorAll('[data-signal-flow]')];
  const timeline = document.querySelector('.hero-timeline');
  const timelineItems = [...document.querySelectorAll('.hero-bus li')];
  const timelineTicks = [...document.querySelectorAll('.timeline-ruler > i')];
  const projectNavLinks = [...document.querySelectorAll('.hero-bus a, .rail a[data-section-link]')]
    .filter((link) => document.querySelector(link.hash)?.classList.contains('project-section'));
  const mediaFigures = [...document.querySelectorAll('.project-section figure')]
    .filter((figure) => figure.querySelector(':scope > img, :scope > iframe'));
  const lightbox = document.querySelector('[data-media-lightbox]');
  const lightboxViewport = lightbox?.querySelector('[data-media-lightbox-viewport]');
  const lightboxCaption = lightbox?.querySelector('[data-media-lightbox-caption]');
  const lightboxClose = lightbox?.querySelector('[data-media-lightbox-close]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let frame = null;
  let lightboxTrigger = null;
  let lightboxCloseTimer = null;
  let timelineObserver = null;
  const arrivalObservers = new Map();
  const arrivalTimers = new Map();

  function updateProgress() {
    frame = null;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
    root.style.setProperty('--progress', progress.toFixed(4));
  }

  window.addEventListener('scroll', () => {
    if (frame === null) frame = requestAnimationFrame(updateProgress);
  }, { passive: true });

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    const id = visible.target.id;
    links.forEach((link) => link.setAttribute('aria-current', link.dataset.sectionLink === id ? 'true' : 'false'));
  }, { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.15, 0.4] });

  sections.forEach((section) => observer.observe(section));

  function commissionTimeline() {
    if (!timeline) return;
    timeline.classList.add('is-commissioned');
    timelineObserver?.disconnect();
    timelineObserver = null;
  }

  function setupTimeline() {
    if (!timeline) return;

    timelineTicks.forEach((tick, index) => {
      tick.style.setProperty('--timeline-delay', `${40 + (index * 24)}ms`);
    });

    const endpointFractions = [2 / 15, 9 / 15, 1, 1];
    timelineItems.forEach((item, index) => {
      const node = item.querySelector('.timeline-node');
      const delay = 90 + Math.round((endpointFractions[index] || 0) * 320);
      node?.style.setProperty('--timeline-delay', `${delay}ms`);

      const link = item.querySelector('a');
      if (!link) return;
      link.addEventListener('pointerenter', () => {
        if (finePointer.matches) item.classList.add('is-duration-active');
      });
      link.addEventListener('pointerleave', () => item.classList.remove('is-duration-active'));
      link.addEventListener('focus', () => item.classList.add('is-duration-active'));
      link.addEventListener('blur', () => item.classList.remove('is-duration-active'));
    });

    if (reducedMotion.matches) {
      commissionTimeline();
      return;
    }

    timeline.classList.add('is-pending');
    timelineObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) commissionTimeline();
    }, { rootMargin: '-8% 0px -8% 0px', threshold: 0.2 });
    timelineObserver.observe(timeline);
  }

  function revealProjectArrival(target) {
    arrivalObservers.get(target)?.disconnect();
    arrivalObservers.delete(target);
    clearTimeout(arrivalTimers.get(target));
    target.classList.remove('is-nav-arrival');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.add('is-nav-arrival');
        const timer = window.setTimeout(() => {
          target.classList.remove('is-nav-arrival');
          arrivalTimers.delete(target);
        }, reducedMotion.matches ? 180 : 920);
        arrivalTimers.set(target, timer);
      });
    });
  }

  function queueProjectArrival(target) {
    arrivalObservers.get(target)?.disconnect();
    const arrivalObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      revealProjectArrival(target);
    }, { rootMargin: '-18% 0px -42% 0px', threshold: 0.12 });
    arrivalObservers.set(target, arrivalObserver);
    arrivalObserver.observe(target);
  }

  projectNavLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const target = document.querySelector(link.hash);
      if (target) queueProjectArrival(target);
    });
  });

  setupTimeline();

  signalFlows.forEach((flow) => {
    const connectors = [...flow.querySelectorAll('b')].filter((connector) => connector.textContent.trim() === '→');
    let pulseFrame = null;
    let pointerActive = false;
    let focusActive = false;
    let engaged = false;

    connectors.forEach((connector, index) => {
      connector.classList.add('signal-arrow');
      connector.style.setProperty('--signal-order', index);
    });

    const stopPulse = () => {
      if (pulseFrame !== null) cancelAnimationFrame(pulseFrame);
      pulseFrame = null;
      flow.classList.remove('is-pulsing');
      engaged = false;
    };

    const startPulse = () => {
      if (reducedMotion.matches || engaged) return;
      engaged = true;
      pulseFrame = requestAnimationFrame(() => {
        pulseFrame = requestAnimationFrame(() => {
          flow.classList.add('is-pulsing');
          pulseFrame = null;
        });
      });
    };

    const syncPulse = () => {
      if (pointerActive || focusActive) startPulse();
      else stopPulse();
    };

    flow.addEventListener('pointerenter', () => {
      pointerActive = true;
      syncPulse();
    });
    flow.addEventListener('pointerleave', () => {
      pointerActive = false;
      syncPulse();
    });
    flow.addEventListener('focus', () => {
      focusActive = true;
      syncPulse();
    });
    flow.addEventListener('blur', () => {
      focusActive = false;
      syncPulse();
    });
  });

  function closeLightbox() {
    if (!lightbox?.open || lightbox.classList.contains('is-closing')) return;
    lightbox.classList.add('is-closing');
    clearTimeout(lightboxCloseTimer);
    lightboxCloseTimer = window.setTimeout(() => {
      lightbox.close();
    }, reducedMotion.matches ? 150 : 200);
  }

  function openLightbox(figure, trigger) {
    if (!lightbox || !lightboxViewport || !lightboxCaption) return;
    const source = figure.querySelector(':scope > img, :scope > iframe');
    if (!source) return;

    let expanded;
    if (figure.dataset.sceneUrl) {
      expanded = document.createElement('iframe');
      expanded.src = figure.dataset.sceneUrl;
      expanded.title = 'Interactive labelled MedTech instrument tray';
      expanded.allowFullscreen = true;
    } else if (source instanceof HTMLImageElement) {
      expanded = document.createElement('img');
      expanded.src = source.currentSrc || source.src;
      expanded.alt = source.alt;
      expanded.decoding = 'async';
    } else {
      expanded = document.createElement('iframe');
      expanded.src = source.src;
      expanded.title = source.title;
      expanded.referrerPolicy = source.referrerPolicy;
      expanded.allow = source.allow;
      expanded.allowFullscreen = source.allowFullscreen;
      if (figure.classList.contains('media-video')) expanded.classList.add('is-portrait');
    }

    lightboxViewport.replaceChildren(expanded);
    lightboxCaption.textContent = figure.querySelector('figcaption')?.textContent.trim() || source.getAttribute('alt') || source.getAttribute('title') || 'Project media';
    lightboxTrigger = trigger;
    clearTimeout(lightboxCloseTimer);
    lightbox.classList.remove('is-closing');
    lightbox.showModal();
    lightboxClose?.focus();
  }

  mediaFigures.forEach((figure) => {
    const media = figure.querySelector(':scope > img, :scope > iframe');
    const caption = figure.querySelector('figcaption')?.textContent.trim() || media.getAttribute('alt') || media.getAttribute('title') || 'project media';
    const isImage = media instanceof HTMLImageElement;

    figure.classList.add('media-interactive');
    figure.dataset.mediaKind = isImage ? 'image' : 'video';
    if (isImage) {
      media.tabIndex = 0;
      media.setAttribute('role', 'button');
      media.setAttribute('aria-haspopup', 'dialog');
      media.setAttribute('aria-label', `Expand ${caption}`);
      media.addEventListener('click', () => {
        openLightbox(figure, media);
      });
      media.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openLightbox(figure, media);
      });
      return;
    }

    const videoTrigger = document.createElement('button');
    videoTrigger.type = 'button';
    videoTrigger.className = 'media-video-trigger';
    videoTrigger.setAttribute('aria-label', `Expand ${caption}`);
    videoTrigger.setAttribute('aria-haspopup', 'dialog');
    videoTrigger.addEventListener('click', () => {
      openLightbox(figure, videoTrigger);
    });
    figure.append(videoTrigger);
  });

  lightboxClose?.addEventListener('click', closeLightbox);
  window.addEventListener('message', (event) => {
    const viewer = lightboxViewport?.querySelector('iframe');
    if (event.origin === location.origin && event.source === viewer?.contentWindow && event.data === 'medtech-close') closeLightbox();
  });
  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  lightbox?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeLightbox();
  });
  lightbox?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeLightbox();
  });
  lightbox?.addEventListener('close', () => {
    clearTimeout(lightboxCloseTimer);
    lightboxCloseTimer = null;
    lightbox.classList.remove('is-closing');
    lightboxViewport?.replaceChildren();
    lightboxTrigger?.focus();
    lightboxTrigger = null;
  });

  document.querySelectorAll('[data-comparison-slider]').forEach((slider) => {
    const images = slider.closest('.marigold-comparison').querySelector('.comparison-images');
    const update = () => {
      images.style.setProperty('--split', `${slider.value}%`);
      slider.setAttribute('aria-valuetext', `${100 - Number(slider.value)} percent surface normals`);
    };
    slider.addEventListener('input', update);
    const moveDivider = (event) => {
      const bounds = images.getBoundingClientRect();
      slider.value = String(Math.round(Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100))));
      update();
    };
    images.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      images.setPointerCapture(event.pointerId);
      slider.focus({ preventScroll: true });
      moveDivider(event);
    });
    images.addEventListener('pointermove', (event) => {
      if (images.hasPointerCapture(event.pointerId)) moveDivider(event);
    });
    images.addEventListener('pointerup', (event) => {
      if (images.hasPointerCapture(event.pointerId)) images.releasePointerCapture(event.pointerId);
    });
    images.addEventListener('dragstart', (event) => event.preventDefault());
  });

  updateProgress();

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      commissionTimeline();
      signalFlows.forEach((flow) => flow.classList.remove('is-pulsing'));
    }
  });

  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target?.classList.contains('project-section')) queueProjectArrival(target);
    requestAnimationFrame(() => target?.scrollIntoView({ block: 'start' }));
  }
})();
