(function () {
  const storageKey = 'vault-matrix-theme';
  const audioSessionKey = 'vault-matrix-audio-playing';
  const audioUiModeKey = 'vault-audio-ui-mode';
  const spotifyTrackId = '1ZsUmKQt3RvaxuHVHbJlyI';
  const spotifyTrackUrl = `https://open.spotify.com/track/${spotifyTrackId}`;
  const audioPlayerUrl = 'matrix-audio-player.html';
  const audioWindowName = 'vaultMatrixAudio';
  const audioChannelName = 'vault-matrix-audio';
  const body = document.body;
  if (!body) return;

  const toggles = Array.from(document.querySelectorAll('[data-matrix-toggle]'));
  if (!toggles.length) return;

  const MATRIX_SYMBOLS = '01アカサタナハマヤラワヲンZXCVBNM<>+*;:[]{}';
  let rainLayer = null;
  let rainBuilt = false;

  let spotifyDock = null;
  let spotifyButton = null;
  let spotifyOpenButton = null;
  let spotifyStatus = null;
  let spotifyEyebrow = null;
  let spotifyHint = null;
  let spotifyPlaying = window.localStorage.getItem(audioSessionKey) === 'true';
  let audioChannel = null;

  const buildColumnText = (length) => {
    let out = '';
    for (let i = 0; i < length; i += 1) {
      out += MATRIX_SYMBOLS[Math.floor(Math.random() * MATRIX_SYMBOLS.length)];
      if (i !== length - 1) out += '\n';
    }
    return out;
  };

  const ensureRainLayer = () => {
    if (rainLayer) return rainLayer;
    rainLayer = document.querySelector('.matrix-code-rain');
    if (!rainLayer) {
      rainLayer = document.createElement('div');
      rainLayer.className = 'matrix-code-rain';
      rainLayer.setAttribute('aria-hidden', 'true');

      const veil = document.createElement('div');
      veil.className = 'matrix-code-rain__veil';
      rainLayer.appendChild(veil);

      const columns = document.createElement('div');
      columns.className = 'matrix-code-rain__columns';
      rainLayer.appendChild(columns);

      body.prepend(rainLayer);
    }

    if (!rainBuilt) {
      const columnsHost = rainLayer.querySelector('.matrix-code-rain__columns');
      const totalColumns = window.innerWidth <= 768 ? 18 : 30;

      for (let i = 0; i < totalColumns; i += 1) {
        const col = document.createElement('span');
        col.className = 'matrix-code-rain__column';
        col.textContent = buildColumnText(28 + Math.floor(Math.random() * 28));
        col.style.left = `${(i / totalColumns) * 100}%`;
        col.style.animationDuration = `${7 + Math.random() * 8}s`;
        col.style.animationDelay = `${-Math.random() * 8}s`;
        col.style.opacity = `${0.18 + Math.random() * 0.35}`;
        col.style.fontSize = `${0.76 + Math.random() * 0.4}rem`;
        col.style.setProperty('--matrix-column-drift', `${(Math.random() * 16 - 8).toFixed(2)}px`);
        columnsHost.appendChild(col);
      }

      rainBuilt = true;
    }

    return rainLayer;
  };

  const setSpotifyStatus = (message) => {
    if (spotifyStatus) spotifyStatus.textContent = message;
  };

  const setSpotifyButtonState = (playing) => {
    if (!spotifyButton) return;
    const mode = body.classList.contains('matrix-theme') ? 'matrix' : 'normal';
    const label = mode === 'matrix' ? 'matrix-musik' : 'baggrundsmusik';
    spotifyButton.textContent = playing ? 'Pause' : 'Play';
    spotifyButton.setAttribute('aria-pressed', playing ? 'true' : 'false');
    spotifyButton.setAttribute('aria-label', playing ? `Pause ${label}` : `Afspil ${label}`);
  };

  const getAudioChannel = () => {
    if (!('BroadcastChannel' in window)) return null;
    if (audioChannel) return audioChannel;
    audioChannel = new BroadcastChannel(audioChannelName);
    audioChannel.addEventListener('message', (event) => {
      const message = event.data || {};
      if (message.source !== 'player') return;

      if (message.type === 'status') {
        spotifyPlaying = Boolean(message.playing);
        window.localStorage.setItem(audioSessionKey, spotifyPlaying ? 'true' : 'false');
        setSpotifyButtonState(spotifyPlaying);
        setSpotifyStatus(spotifyPlaying ? 'Musikken fortsætter uden at starte forfra.' : (body.classList.contains('matrix-theme') ? 'Klik Play for baggrundsmusik i Matrix.' : 'Klik Play for baggrundsmusik.'));
      }

      if (message.type === 'closed') {
        spotifyPlaying = false;
        window.localStorage.setItem(audioSessionKey, 'false');
        setSpotifyButtonState(false);
        setSpotifyStatus('Spilleren blev lukket. Klik Play for at åbne den igen.');
      }
    });
    return audioChannel;
  };

  const postAudioCommand = (type) => {
    const channel = getAudioChannel();
    if (!channel) return;
    channel.postMessage({ source: 'page', type });
  };

  const ensureAudioWindow = (focusWindow = false) => {
    let popup = null;
    try {
      popup = window.open(audioPlayerUrl, audioWindowName, 'popup=yes,width=430,height=240,left=80,top=80');
    } catch (error) {
      popup = null;
    }

    if (popup && focusWindow && typeof popup.focus === 'function') {
      popup.focus();
    }

    return popup;
  };

  const applyAudioDockTheme = (enabled) => {
    const dock = ensureSpotifyDock();
    const mode = enabled ? 'matrix' : 'normal';
    dock.dataset.mode = mode;
    window.localStorage.setItem(audioUiModeKey, mode);
    if (spotifyEyebrow) spotifyEyebrow.textContent = enabled ? 'Matrix lydspor' : 'Baggrundsmusik';
    dock.setAttribute('aria-label', enabled ? 'Matrix lydspor' : 'Baggrundsmusik');
    if (spotifyHint) spotifyHint.textContent = enabled
      ? 'Afspilleren åbner i et lille separat vindue, så nummeret ikke starter forfra ved sideskift.'
      : 'Afspilleren åbner i et lille separat vindue, så nummeret fortsætter mellem sider i normal visning.';
  };

  const ensureSpotifyDock = () => {
    if (spotifyDock) return spotifyDock;

    spotifyDock = document.createElement('section');
    spotifyDock.className = 'matrix-audio-dock';
    spotifyDock.hidden = false;
    spotifyDock.setAttribute('aria-label', 'Baggrundsmusik');

    spotifyDock.innerHTML = `
      <div class="matrix-audio-dock__top">
        <div class="matrix-audio-dock__meta">
          <p class="matrix-audio-dock__eyebrow">Baggrundsmusik</p>
          <p class="matrix-audio-dock__title">Keep the Streets Empty for Me</p>
        </div>
        <div class="matrix-audio-dock__actions">
          <button class="matrix-audio-dock__button" type="button" aria-pressed="false" aria-label="Afspil baggrundsmusik">Play</button>
          <button class="matrix-audio-dock__open" type="button" aria-label="Åbn spiller">Spiller</button>
          <a class="matrix-audio-dock__link" href="${spotifyTrackUrl}" target="_blank" rel="noopener noreferrer">Spotify</a>
        </div>
      </div>
      <p class="matrix-audio-dock__status">Klik Play for baggrundsmusik.</p>
      <p class="matrix-audio-dock__hint">Afspilleren åbner i et lille separat vindue, så nummeret fortsætter mellem sider.</p>
    `;

    body.appendChild(spotifyDock);
    spotifyButton = spotifyDock.querySelector('.matrix-audio-dock__button');
    spotifyOpenButton = spotifyDock.querySelector('.matrix-audio-dock__open');
    spotifyStatus = spotifyDock.querySelector('.matrix-audio-dock__status');
    spotifyEyebrow = spotifyDock.querySelector('.matrix-audio-dock__eyebrow');
    spotifyHint = spotifyDock.querySelector('.matrix-audio-dock__hint');

    spotifyButton.addEventListener('click', () => {
      if (spotifyPlaying || window.localStorage.getItem(audioSessionKey) === 'true') {
        spotifyPlaying = false;
        window.localStorage.setItem(audioSessionKey, 'false');
        setSpotifyButtonState(false);
        setSpotifyStatus('Pauserer lydspor …');
        postAudioCommand('pause');
        return;
      }

      const popup = ensureAudioWindow(true);
      if (!popup) {
        setSpotifyStatus('Tillad popup-vinduer for at bruge den vedvarende spiller.');
        return;
      }

      spotifyPlaying = true;
      window.localStorage.setItem(audioSessionKey, 'true');
      setSpotifyButtonState(true);
      setSpotifyStatus('Starter uden at nulstille ved sideskift …');
      window.setTimeout(() => {
        postAudioCommand('play');
        postAudioCommand('status-request');
      }, 500);
    });

    spotifyOpenButton.addEventListener('click', () => {
      const popup = ensureAudioWindow(true);
      if (!popup) {
        setSpotifyStatus('Tillad popup-vinduer for at åbne spilleren.');
        return;
      }
      window.setTimeout(() => {
        postAudioCommand('status-request');
      }, 300);
    });

    setSpotifyButtonState(spotifyPlaying);
    spotifyDock.dataset.mode = body.classList.contains('matrix-theme') ? 'matrix' : 'normal';
    return spotifyDock;
  };

  const showSpotifyDock = (show) => {
    const dock = ensureSpotifyDock();
    dock.hidden = !show;
  };

  const syncSpotifyState = (enabled) => {
    showSpotifyDock(true);
    applyAudioDockTheme(enabled);

    spotifyPlaying = window.localStorage.getItem(audioSessionKey) === 'true';
    setSpotifyButtonState(spotifyPlaying);
    if (spotifyPlaying) {
      setSpotifyStatus('Musikken fortsætter uden at starte forfra.');
      postAudioCommand('status-request');
    } else {
      setSpotifyStatus(enabled ? 'Klik Play for baggrundsmusik i Matrix.' : 'Klik Play for baggrundsmusik.');
    }
  };

  const applyState = (enabled) => {
    body.classList.toggle('matrix-theme', enabled);
    const layer = ensureRainLayer();
    layer.classList.toggle('is-active', enabled);
    syncSpotifyState(enabled);

    toggles.forEach((btn) => {
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      btn.classList.toggle('is-active', enabled);
      btn.setAttribute('aria-label', enabled ? 'Deaktivér Matrix tema' : 'Aktivér Matrix tema');
      btn.title = enabled ? 'Deaktivér Matrix tema' : 'Aktivér Matrix tema';
    });
  };

  getAudioChannel();

  window.addEventListener('storage', (event) => {
    if (event.key !== audioSessionKey) return;
    spotifyPlaying = event.newValue === 'true';
    setSpotifyButtonState(spotifyPlaying);
    setSpotifyStatus(spotifyPlaying ? 'Musikken fortsætter uden at starte forfra.' : (body.classList.contains('matrix-theme') ? 'Klik Play for baggrundsmusik i Matrix.' : 'Klik Play for baggrundsmusik.'));
  });

  const initial = window.localStorage.getItem(storageKey) === 'true';
  applyState(initial);

  toggles.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = !body.classList.contains('matrix-theme');
      applyState(next);
      window.localStorage.setItem(storageKey, String(next));
    });
  });
})();
