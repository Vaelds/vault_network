const body = document.body;
const burger = document.querySelector('.burger');
const desktopMenu = document.querySelector('.menu');
const mobileMenu = document.querySelector('.mobile-nav-panel');
const alarmButtons = document.querySelectorAll('[data-alarm-trigger]');
const mobileMQ = window.matchMedia('(max-width: 768px)');
const reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

let audioContext;
let alarmInterval;
let pendingNavigation = null;
let spotlightFrame = null;
let spotlightOverlay;
const spotlightButtons = document.querySelectorAll('[data-spotlight-trigger]');
const spotlightStorageKey = 'vaultnet-spotlight-enabled';

function ensureSpotlightOverlay() {
  if (spotlightOverlay) return spotlightOverlay;
  spotlightOverlay = document.querySelector('.spotlight-overlay');
  if (!spotlightOverlay) {
    spotlightOverlay = document.createElement('div');
    spotlightOverlay.className = 'spotlight-overlay';
    spotlightOverlay.setAttribute('aria-hidden', 'true');
    body.appendChild(spotlightOverlay);
  }
  return spotlightOverlay;
}

function setupSpotlight() {
  const mediaQuery = window.matchMedia('(pointer: fine)');

  const updateSpotlightPosition = (x, y) => {
    body.style.setProperty('--spotlight-x', `${x}px`);
    body.style.setProperty('--spotlight-y', `${y}px`);
  };

  const resetSpotlightPosition = () => {
    updateSpotlightPosition(window.innerWidth / 2, 220);
  };

  const updateSpotlightButtons = () => {
    const isActive = body.classList.contains('spotlight-enabled');
    spotlightButtons.forEach((button) => {
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.classList.toggle('spotlight-is-active', isActive);
      button.classList.remove('is-active');
      button.hidden = false;
      button.style.display = '';
      const label = isActive ? 'Deaktivér spotlight' : 'Aktivér spotlight';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.innerHTML = isActive
        ? '<span class="spotlight-button-label spotlight-button-label--two-line"><span>Deaktivér</span><span>spotlight</span></span>'
        : '<span class="spotlight-button-label">Spotlight</span>';
    });
  };

  const storeSpotlightState = (isActive) => {
    try {
      window.localStorage.setItem(spotlightStorageKey, isActive ? 'true' : 'false');
    } catch (error) {}
  };

  const setSpotlight = (isActive) => {
    const overlay = ensureSpotlightOverlay();
    body.classList.toggle('spotlight-enabled', isActive);
    overlay.classList.toggle('is-active', isActive);
    if (!isActive && spotlightFrame) {
      window.cancelAnimationFrame(spotlightFrame);
      spotlightFrame = null;
    }
    updateSpotlightButtons();
    storeSpotlightState(isActive);
  };

  const toggleSpotlight = (event) => {
    const shouldKeepMenuOpen = Boolean(mobileMQ.matches && mobileMenu && mobileMenu.classList.contains('showMenu'));
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      animateAlarmTrigger(event.currentTarget);
    }
    setSpotlight(!body.classList.contains('spotlight-enabled'));
    if (shouldKeepMenuOpen) {
      mobileMenu.hidden = false;
      mobileMenu.classList.add('showMenu');
      burger?.setAttribute('aria-expanded', 'true');
      body.classList.add('menu-open');
    }
  };

  const moveSpotlight = (event) => {
    if (!mediaQuery.matches || !body.classList.contains('spotlight-enabled')) return;
    const { clientX, clientY } = event;
    if (spotlightFrame) window.cancelAnimationFrame(spotlightFrame);
    spotlightFrame = window.requestAnimationFrame(() => {
      updateSpotlightPosition(clientX, clientY);
    });
  };

  ensureSpotlightOverlay();
  resetSpotlightPosition();

  try {
    if (window.localStorage.getItem(spotlightStorageKey) === 'true') {
      setSpotlight(true);
    } else {
      setSpotlight(false);
    }
  } catch (error) {
    setSpotlight(false);
  }

  spotlightButtons.forEach((button) => {
    button.addEventListener('click', toggleSpotlight);
  });

  window.addEventListener('mousemove', moveSpotlight, { passive: true });
  window.addEventListener('resize', resetSpotlightPosition);
  updateSpotlightButtons();
}

function ensureAlarmOverlay() {
  let overlay = document.querySelector('.alarm-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'alarm-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    body.appendChild(overlay);
  }
  return overlay;
}

function animateAlarmTrigger(button) {
  if (!button || reducedMotionMQ.matches) return;
  button.classList.remove('is-clicking');
  // Force reflow so the animation can restart on repeated clicks.
  void button.offsetWidth;
  button.classList.add('is-clicking');
  window.setTimeout(() => {
    button.classList.remove('is-clicking');
  }, 280);
}

function updateAlarmButtons() {
  const isActive = body.classList.contains('alarm-active');
  alarmButtons.forEach((button) => {
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.classList.toggle('is-active', isActive);
    const onText = button.dataset.alarmOnText;
    const offText = button.dataset.alarmOffText;
    if (onText && offText) {
      const currentLabel = isActive ? onText : offText;
      if (button.childElementCount === 0) {
        button.textContent = currentLabel;
      }
      button.setAttribute('aria-label', currentLabel);
      button.setAttribute('title', currentLabel);
    }
  });
}

function stopAlarm() {
  body.classList.remove('alarm-active');
  if (alarmInterval) {
    window.clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (audioContext && audioContext.state === 'running') {
    audioContext.suspend().catch(() => {});
  }
  updateAlarmButtons();
}

function playAlarmSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!audioContext) {
    audioContext = new AudioCtx();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  const now = audioContext.currentTime;
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.11, now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.35);
  master.connect(audioContext.destination);

  [0, 0.72, 1.44].forEach((offset, index) => {
    const osc = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    const toneGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(index % 2 === 0 ? 740 : 620, now + offset);
    osc.frequency.linearRampToValueAtTime(index % 2 === 0 ? 540 : 760, now + offset + 0.55);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(6, now + offset);
    lfoGain.gain.setValueAtTime(48, now + offset);

    toneGain.gain.setValueAtTime(0.0001, now + offset);
    toneGain.gain.exponentialRampToValueAtTime(0.7, now + offset + 0.03);
    toneGain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.28);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.62);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1300, now + offset);
    filter.Q.value = 0.7;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(toneGain);
    toneGain.connect(master);

    osc.start(now + offset);
    lfo.start(now + offset);
    osc.stop(now + offset + 0.65);
    lfo.stop(now + offset + 0.65);
  });
}

function startAlarm() {
  ensureAlarmOverlay();
  body.classList.add('alarm-active');
  playAlarmSound();
  if (!alarmInterval) {
    alarmInterval = window.setInterval(playAlarmSound, 2400);
  }
  updateAlarmButtons();
}

function toggleAlarm(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
    animateAlarmTrigger(event.currentTarget);
  }
  if (body.classList.contains('alarm-active')) {
    stopAlarm();
  } else {
    startAlarm();
  }
}

function closeMenu() {
  if (!burger || !mobileMenu) return;
  mobileMenu.classList.remove('showMenu');
  mobileMenu.hidden = true;
  burger.setAttribute('aria-expanded', 'false');
  body.classList.remove('menu-open');
}

function openMenu() {
  if (!burger || !mobileMenu) return;
  mobileMenu.hidden = false;
  requestAnimationFrame(() => {
    mobileMenu.classList.add('showMenu');
  });
  burger.setAttribute('aria-expanded', 'true');
  body.classList.add('menu-open');
}

function toggleMenu(event) {
  if (!burger || !mobileMenu || !mobileMQ.matches) return;
  event.preventDefault();
  event.stopPropagation();
  if (mobileMenu.classList.contains('showMenu')) {
    closeMenu();
  } else {
    openMenu();
  }
}

function isInternalPageLink(link, event) {
  if (!link || event.defaultPrevented) return false;
  if (reducedMotionMQ.matches) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target && link.target !== '_self') return false;
  if (link.hasAttribute('download')) return false;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return false;
  }

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  const currentWithoutHash = `${window.location.pathname}${window.location.search}`;
  const targetWithoutHash = `${url.pathname}${url.search}`;
  if (currentWithoutHash === targetWithoutHash && url.hash === window.location.hash) {
    return false;
  }

  return true;
}


function hideCurrentPageLinks() {
  document.querySelectorAll('.site-header .menu > li > .menuItem.active').forEach((link) => {
    const parent = link.parentElement;
    link.setAttribute('aria-hidden', 'true');
    link.setAttribute('tabindex', '-1');
    link.style.display = 'none';
    link.style.pointerEvents = 'none';
    if (parent) {
      parent.hidden = true;
      parent.setAttribute('aria-hidden', 'true');
      parent.style.display = 'none';
      parent.style.pointerEvents = 'none';
    }
  });

  document.querySelectorAll('.mobile-nav-panel__link.is-active').forEach((link) => {
    link.hidden = true;
    link.setAttribute('aria-hidden', 'true');
    link.setAttribute('tabindex', '-1');
    link.style.display = 'none';
    link.style.pointerEvents = 'none';
  });
}

function setupPageTransitions() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!isInternalPageLink(link, event)) return;

    event.preventDefault();
    if (body.classList.contains('is-page-transitioning')) return;

    closeMenu();
    body.classList.add('is-page-transitioning');
    pendingNavigation = window.setTimeout(() => {
      window.location.assign(link.href);
    }, 260);
  });

  window.addEventListener('pageshow', () => {
    body.classList.remove('is-page-transitioning');
    if (pendingNavigation) {
      window.clearTimeout(pendingNavigation);
      pendingNavigation = null;
    }
  });
}

if (burger && mobileMenu) {
  burger.addEventListener('click', toggleMenu);

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (mobileMQ.matches) closeMenu();
    });
  });

  document.addEventListener('click', (event) => {
    if (!mobileMQ.matches || !mobileMenu.classList.contains('showMenu')) return;
    if (burger.contains(event.target) || mobileMenu.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      stopAlarm();
    }
  });

  const handleChange = (event) => {
    if (!event.matches) closeMenu();
  };

  if (mobileMQ.addEventListener) {
    mobileMQ.addEventListener('change', handleChange);
  } else if (mobileMQ.addListener) {
    mobileMQ.addListener(handleChange);
  }
}

if (desktopMenu && desktopMenu.querySelectorAll) {
  desktopMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (mobileMQ.matches) closeMenu();
    });
  });
}

alarmButtons.forEach((button) => {
  button.addEventListener('click', toggleAlarm);
});

ensureAlarmOverlay();
updateAlarmButtons();
hideCurrentPageLinks();
setupPageTransitions();
setupSpotlight();


function setupArticlePopups() {
  const articleTriggers = document.querySelectorAll('[data-article-id]');
  const articleModal = document.getElementById('article-modal');
  const articleTitle = document.getElementById('article-modal-title');
  const articleKicker = document.getElementById('article-modal-kicker');
  const articleContent = document.getElementById('article-modal-content');
  const articleIndex = document.getElementById('article-modal-index');
  const articleStamp = document.getElementById('article-modal-stamp');
  const articleCloseButtons = document.querySelectorAll('[data-article-close]');

  if (!articleTriggers.length || !articleModal || !articleTitle || !articleContent) return;

  const articleMedia = document.getElementById('article-modal-media');
  const articleImage = document.getElementById('article-modal-image');
  const articleScroll = articleModal.querySelector('.article-modal__scroll');

  if (articleModal.parentElement !== body) {
    body.appendChild(articleModal);
  }

  const articleLibrary = {
    'bunker-tour': {
      index: '01',
      stamp: 'Klassificeret',
      kicker: 'REGAN Vest // bunkeranlægget',
      title: 'Strategisk kommandorum',
      image: {
        src: 'img/articles/bunkeranlaegget.png',
        alt: 'Interiør fra REGAN Vest bunkeren',
        className: ''
      },
      html: `
        <p>Et besøg i REGAN Vest begynder i den ribbede indgangstunnel, hvor anlæggets særlige atomsikring allerede kan aflæses i arkitekturen. Herfra føres man videre 60 meter ned under jorden til krydspunktet med sluse, tonstunge trykdøre og dieselgeneratorer, som skulle holde anlægget i drift under en krise.</p>
        <h3>Regering, beredskab og hverdagsliv</h3>
        <p>Rundvisningen går videre gennem de rum, hvor staten skulle fungere videre i en krigssituation. Der stoppes ved indre vagt, udenrigsministeriets møderum, kommunikationsafdeling og lægevagt, så både sikkerhed, teknik og daglig organisering træder frem som en samlet del af beredskabet.</p>
        <p>I forsvarsministeriets gang og regeringens situationsrum skifter fokus til de politiske beslutninger, trusselsbillederne og planerne for at holde landet samlet under ekstreme forhold. Rundvisningen berører også regentens rum og forklarer, hvorfor netop REGAN Vest blev tænkt som demokratiets sidste bastion.</p>
        <p>Til sidst vises anlæggets ventilation, luftindtag og atomsikrede hulrumskonstruktion, før fortællingen bevæger sig ind i hverdagen: soverum, køkken, lagre, dagligstue og cafeteria viser, hvordan beboerne både skulle arbejde og leve i bunkeren over længere tid.</p>
      `
    },
    'engineer-house': {
      index: '02',
      stamp: 'Top secret',
      kicker: 'REGAN Vest // bolig og skalkeskjul',
      title: 'Hemmelig base',
      image: {
        src: 'img/articles/maskinmesterboligen.png',
        alt: 'Maskinmesterboligen ved REGAN Vest',
        className: ''
      },
      html: `
        <p>Maskinmesterboligen fungerede som tjenestebolig for den maskinmester, der havde ansvar for den tekniske drift af REGAN Vest. Huset blev opført samtidig med bunkeren og stod færdigt i 1966, to år før selve anlægget. Placeringen var nøje valgt, fordi boligen også skulle skærme for indkig til bunkerens indgangsparti.</p>
        <p>Boligen fik derfor en dobbelt funktion: et almindeligt familiehjem på overfladen og et diskret skalkeskjul for det hemmelige anlæg nedenunder. Den rolle beholdt huset helt frem til 2010, da den sidste maskinmester flyttede ud.</p>
        <h3>Et 1980-hjem med personlige spor</h3>
        <p>I dag er huset indrettet som et hjem anno 1980, hvor besøgende kan gå gennem rummene, sætte sig i møblerne, bladre i ugeblade, høre radio, se fjernsyn og møde periodens hverdagsting helt tæt på. Museet bruger netop den genkendelige boligramme til at vise, hvordan den kolde krig også fandtes i det helt almindelige familieliv.</p>
        <p>Rundt omkring i huset møder man familiens egne fortællinger på skærme. De beskriver, hvordan det var at bo med en hemmelig bunker i baghaven, og hvordan tidens sikkerhedstænkning og hemmeligholdelse blev en del af hverdagen.</p>
      `
    },
    'cold-war-exhibit': {
      index: '03',
      stamp: 'Analyse',
      kicker: 'REGAN Vest // udstilling og samfund',
      title: 'Operation overblik',
      image: {
        src: 'img/articles/kolde-krig-kort.png',
        alt: 'Kort og planlægningsmateriale fra udstillingen om den kolde krig',
        className: 'article-modal__image--cold-war',
        objectPosition: '82% center'
      },
      html: `
        <p>Udstillingen om den kolde krig tager afsæt i den alvor, som også kom til udtryk i folderen <em>Hvis krigen kommer</em>, der i 1962 blev sendt ud til alle danske husstande. Herfra foldes fortællingen ud om danskernes hverdag i en tid præget af atomtrussel, beredskabstænkning og internationale spændinger.</p>
        <p>Udstillingen er bygget op som selvstændige temaøer, som kan opleves hver for sig. Emnerne spænder fra atomkraft og frygten for atomkrig til civilt beredskab, skjult planlægning og bunkerens særlige konstruktion. Den indledes med et overblik over de internationale begivenheder, der formede perioden.</p>
        <h3>Danmark mellem håb, frygt og planlægning</h3>
        <p>Formidlingen viser, hvordan den nye atomteknologi både blev opfattet som et løfte om billig energi og som grundlag for altødelæggende våben. Samtidig sættes der fokus på de politiske spændinger i Danmark, blandt andet debatten om NATO og de kulturelle spor, som konflikten satte i litteratur, kunst og musik.</p>
        <p>Udstillingen peger også på de skjulte forberedelser bag samfundets overflade: lister over biler og boliger, der kunne inddrages under krig, lagre med udstyr til befolkningen og REGAN Vests konstruktion, som på centrale punkter fulgte NATO's anbefalinger til atomsikrede regeringsbunkere.</p>
      `
    }
  };
  let previousFocus = null;

  const openArticle = (articleId, trigger) => {
    const article = articleLibrary[articleId];
    if (!article) return;
    previousFocus = trigger || document.activeElement;
    articleKicker.textContent = article.kicker;
    articleTitle.textContent = article.title;
    articleContent.innerHTML = article.html;
    articleModal.dataset.articleId = articleId;
    if (articleIndex) articleIndex.textContent = article.index || '';
    if (articleStamp) articleStamp.textContent = article.stamp || '';
    if (articleMedia && articleImage && article.image) {
      articleImage.src = article.image.src;
      articleImage.alt = article.image.alt || '';
      articleImage.className = 'article-modal__image';
      if (article.image.className) {
        articleImage.classList.add(article.image.className);
      }
      articleImage.style.objectPosition = article.image.objectPosition || '';
      articleMedia.hidden = false;
    } else if (articleMedia && articleImage) {
      articleImage.src = '';
      articleImage.alt = '';
      articleImage.className = 'article-modal__image';
      articleImage.style.objectPosition = '';
      articleMedia.hidden = true;
    }
    articleModal.hidden = false;
    articleModal.setAttribute('aria-hidden', 'false');
    body.classList.add('article-modal-open');
    if (articleScroll) articleScroll.scrollTop = 0;
    setTimeout(() => {
      const closeButton = articleModal.querySelector('.article-modal__close');
      closeButton && closeButton.focus();
    }, 0);
  };

  const closeArticle = () => {
    articleModal.hidden = true;
    articleModal.setAttribute('aria-hidden', 'true');
    body.classList.remove('article-modal-open');
    if (articleScroll) articleScroll.scrollTop = 0;
    articleContent.innerHTML = '';
    delete articleModal.dataset.articleId;
    if (articleMedia && articleImage) {
      articleImage.src = '';
      articleImage.alt = '';
      articleMedia.hidden = true;
    }
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
  };

  articleTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openArticle(trigger.dataset.articleId, trigger));
  });

  articleCloseButtons.forEach((button) => {
    button.addEventListener('click', closeArticle);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !articleModal.hidden) {
      closeArticle();
    }
  });
}

setupArticlePopups();
