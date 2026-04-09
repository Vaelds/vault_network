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
