const infoData = {
  bombe1: {
    title: 'Før nedslag',
    description:
      'Hvis der varsles atomangreb, skal du straks søge mod kælder, beskyttelsesrum eller en massiv bygning. Gå væk fra vinduer, glas og åbne pladser.',
    efficiency: [
      'Søg øjeblikkeligt dækning under jord eller bag tykke vægge',
      'Tag vand, radio, lommelygte og førstehjælp med',
      'Luk døre, vinduer og ventilation hvis du når det'
    ],
    requirement: [
      'Undgå panik og hurtige flokbevægelser',
      'Se ikke mod lysglimtet',
      'Hold børn og sårbare personer tæt på dig'
    ]
  },
  bombe2: {
    title: 'Under eksplosion',
    description:
      'Ved lysglimt og trykbølge skal du kaste dig ned, vende ansigtet væk og beskytte hoved og nakke. Bliv i dækning til trykbølgen er passeret.',
    efficiency: [
      'Læg dig fladt ned med ansigtet væk fra eksplosionen',
      'Dæk hoved og nakke med arme, jakke eller stof',
      'Vent nogle sekunder ekstra før du rejser dig'
    ],
    requirement: [
      'Stå ikke tæt ved vinduer eller løse genstande',
      'Undgå at løbe i panik midt i trykbølgen',
      'Søg hurtigst muligt indendørs efter første chokbølge'
    ]
  },
  bombe3: {
    title: 'Efter nedslag',
    description:
      'Efter et atomnedslag er radioaktivt nedfald en stor fare. Bliv indenfor, forsegl rummet og vent på beskeder fra myndigheder eller nødradio.',
    efficiency: [
      'Bliv indenfor i mindst 24 til 48 timer hvis muligt',
      'Fjern støvet tøj og vask udsat hud forsigtigt',
      'Spis kun beskyttet mad og drik rent vand'
    ],
    requirement: [
      'Undgå unødvendige ture udenfor',
      'Lyt til radio og officielle meldinger',
      'Gem rationer og hold energien nede'
    ]
  },
  soldat: {
    title: 'Møde med fjendtlige styrker',
    description:
      'Hvis du møder fjendens soldater, skal du undgå konfrontation. Hold hænderne synlige, bevæg dig roligt og gør intet som kan opfattes som truende.',
    efficiency: [
      'Hold afstand og undgå pludselige bevægelser',
      'Tal kort, roligt og kun hvis du bliver tiltalt',
      'Søg væk fra kontrolposter når det kan gøres sikkert'
    ],
    requirement: [
      'Løb ikke mod bevæbnede soldater',
      'Bær ikke noget der kan ligne et våben',
      'Forsøg at beskytte børn og andre bag dig'
    ]
  }
};

const infoTitle = document.querySelector('#info-title');
const infoDescription = document.querySelector('#info-description');
const efficiencyList = document.querySelector('#efficiency-list');
const requirementList = document.querySelector('#requirement-list');
const infographicObject = document.querySelector('#infographic-object');
const infoTextColumn = document.querySelector('#instruction .info-text');
const animatedPanels = document.querySelectorAll('#instruction .text-panel, #instruction .info-box');
let activeElement = null;
let hotspotsInitialised = false;
let countdownOverlay = null;
let countdownNumber = null;
let countdownTimers = [];

function fillList(target, items) {
  if (!target) return;
  target.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    target.appendChild(li);
  });
}

function buildCountdownOverlay() {
  if (!infoTextColumn || countdownOverlay) return;

  countdownOverlay = document.createElement('div');
  countdownOverlay.className = 'countdown-overlay';
  countdownOverlay.setAttribute('aria-hidden', 'true');
  countdownOverlay.innerHTML = `
    <div class="countdown-overlay__film-grain"></div>
    <div class="countdown-overlay__frame">
      <div class="countdown-overlay__ring countdown-overlay__ring--outer"></div>
      <div class="countdown-overlay__ring countdown-overlay__ring--inner"></div>
      <div class="countdown-overlay__cross countdown-overlay__cross--horizontal"></div>
      <div class="countdown-overlay__cross countdown-overlay__cross--vertical"></div>
      <div class="countdown-overlay__sweep"></div>
      <div class="countdown-overlay__number">3</div>
    </div>
  `;

  countdownNumber = countdownOverlay.querySelector('.countdown-overlay__number');
  countdownOverlay.addEventListener('animationend', () => {
    countdownOverlay.classList.remove('is-playing');
  });

  infoTextColumn.appendChild(countdownOverlay);
}

function clearCountdownTimers() {
  countdownTimers.forEach((timer) => window.clearTimeout(timer));
  countdownTimers = [];
}

function triggerCountdownOverlay() {
  if (!countdownOverlay || !countdownNumber) return;

  clearCountdownTimers();
  countdownOverlay.classList.remove('is-playing');
  void countdownOverlay.offsetWidth;
  countdownNumber.textContent = '3';
  countdownOverlay.classList.add('is-playing');

  countdownTimers.push(window.setTimeout(() => {
    if (countdownNumber) countdownNumber.textContent = '2';
  }, 900));

  countdownTimers.push(window.setTimeout(() => {
    if (countdownNumber) countdownNumber.textContent = '1';
  }, 1800));

  countdownTimers.push(window.setTimeout(() => {
    if (countdownOverlay) countdownOverlay.classList.remove('is-playing');
    if (countdownNumber) countdownNumber.textContent = '3';
  }, 3200));
}

function triggerInfoFade() {
  animatedPanels.forEach((panel) => {
    panel.classList.remove('fadeIn');
    void panel.offsetWidth;
    panel.classList.add('fadeIn');
  });
  triggerCountdownOverlay();
}

function updatePanel(data) {
  if (infoTitle) infoTitle.textContent = data.title;
  if (infoDescription) infoDescription.textContent = data.description;
  fillList(efficiencyList, data.efficiency);
  fillList(requirementList, data.requirement);
  triggerInfoFade();
}

function setActiveElement(element) {
  if (activeElement && activeElement !== element) {
    activeElement.classList.remove('is-active');
  }
  activeElement = element;
  if (activeElement) {
    activeElement.classList.add('is-active');
  }
}

function resetActiveElement(element) {
  if (!element) return;
  element.classList.remove('is-active');
  if (typeof element.blur === 'function') {
    element.blur();
  }
  element.removeAttribute('data-locked');
  if (activeElement === element) {
    activeElement = null;
  }
}

function makeInteractive(element, dataKey) {
  if (!element || !infoData[dataKey] || element.dataset.hotspotBound === 'true') return;

  element.dataset.hotspotBound = 'true';
  element.classList.add('svg-hotspot');
  element.classList.add(dataKey.startsWith('bombe') ? 'svg-hotspot--bomb' : 'svg-hotspot--soldier');
  element.style.cursor = 'pointer';
  element.setAttribute('tabindex', '0');
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', infoData[dataKey].title);

  const activate = () => {
    updatePanel(infoData[dataKey]);
    setActiveElement(element);
    element.dataset.locked = 'true';

    if (dataKey === 'soldat') {
      window.setTimeout(() => {
        if (element.dataset.locked === 'true') {
          resetActiveElement(element);
        }
      }, 700);
    }
  };

  element.addEventListener('click', activate);
  if (dataKey === 'soldat' || dataKey.startsWith('bombe')) {
    const resetOnRollOff = () => {
      resetActiveElement(element);
    };
    element.addEventListener('mouseleave', resetOnRollOff);
    element.addEventListener('pointerleave', resetOnRollOff);
  }
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });
}

function injectSvgStyles(svgDoc) {
  if (!svgDoc || svgDoc.getElementById('vault-hotspot-style')) return;

  const style = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.setAttribute('id', 'vault-hotspot-style');
  style.textContent = `
    .svg-hotspot {
      transform-box: fill-box;
      transform-origin: center center;
      transition: filter 220ms ease, opacity 220ms ease, transform 220ms ease;
      outline: none;
      opacity: 1;
    }

    .svg-hotspot:hover,
    .svg-hotspot:focus {
      opacity: 1;
      filter:
        drop-shadow(0 0 22px rgba(255, 46, 46, 1))
        drop-shadow(0 0 48px rgba(255, 46, 46, 0.88))
        drop-shadow(0 0 82px rgba(255, 46, 46, 0.56));
    }

    .svg-hotspot.is-active {
      filter:
        drop-shadow(0 0 24px rgba(255, 52, 52, 1))
        drop-shadow(0 0 54px rgba(255, 52, 52, 0.92))
        drop-shadow(0 0 96px rgba(255, 52, 52, 0.62));
    }

    .svg-hotspot--bomb:hover,
    .svg-hotspot--bomb:focus {
      animation: none;
      filter:
        drop-shadow(0 0 10px rgba(255, 20, 20, 1))
        drop-shadow(0 0 20px rgba(255, 20, 20, 0.92))
        drop-shadow(0 0 32px rgba(255, 20, 20, 0.72));
    }

    .svg-hotspot--bomb.is-active {
      animation: vaultBombImpact 980ms cubic-bezier(0.18, 0.78, 0.2, 1) 1;
      filter:
        drop-shadow(0 0 42px rgba(255, 16, 16, 1))
        drop-shadow(0 0 88px rgba(255, 16, 16, 1))
        drop-shadow(0 0 144px rgba(255, 16, 16, 0.94))
        drop-shadow(0 0 206px rgba(255, 16, 16, 0.68));
    }

    @keyframes vaultBombSway {
      0% {
        transform: translateX(0) scale(1);
      }
      26% {
        transform: translateX(-18px) scale(1.02);
      }
      62% {
        transform: translateX(16px) scale(1.045);
      }
      100% {
        transform: translateX(0) scale(1);
      }
    }

    @keyframes vaultBombImpact {
      0% {
        transform: translateX(0) scale(1);
      }
      20% {
        transform: translateX(-24px) scale(1.03);
      }
      58% {
        transform: translateX(20px) scale(1.07);
      }
      100% {
        transform: translateX(0) scale(1.02);
      }
    }
  `;
  svgDoc.documentElement.appendChild(style);
}

function initInfographic() {
  if (!infographicObject || hotspotsInitialised) return;

  const svgDoc = infographicObject.contentDocument;
  if (!svgDoc) return;

  const bombe1 = svgDoc.getElementById('bombe_1') || svgDoc.getElementById('bombe_x5F_1');
  const bombe2 = svgDoc.getElementById('bombe_2') || svgDoc.getElementById('bombe_x5F_2');
  const bombe3 = svgDoc.getElementById('bombe_3') || svgDoc.getElementById('bombe_x5F_3');
  const soldat = svgDoc.getElementById('soldat');

  if (!bombe1 && !bombe2 && !bombe3 && !soldat) return;

  injectSvgStyles(svgDoc);
  makeInteractive(bombe1, 'bombe1');
  makeInteractive(bombe2, 'bombe2');
  makeInteractive(bombe3, 'bombe3');
  makeInteractive(soldat, 'soldat');

  hotspotsInitialised = true;

  if (bombe1) {
    bombe1.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
}

buildCountdownOverlay();

if (infographicObject) {
  infographicObject.addEventListener('load', initInfographic);

  if (infographicObject.contentDocument?.documentElement) {
    initInfographic();
  } else {
    window.addEventListener('load', initInfographic, { once: true });
  }
}

animatedPanels.forEach((panel) => {
  panel.addEventListener('animationend', () => {
    panel.classList.remove('fadeIn');
  });
});
