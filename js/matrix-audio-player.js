(function () {
  const audioSessionKey = 'vault-matrix-audio-playing';
  const spotifyTrackId = '1ZsUmKQt3RvaxuHVHbJlyI';
  const spotifyTrackUri = `spotify:track:${spotifyTrackId}`;
  const audioChannelName = 'vault-matrix-audio';
  const audioUiModeKey = 'vault-audio-ui-mode';

  const host = document.getElementById('spotify-host');
  const statusEl = document.getElementById('player-status');
  const toggleButton = document.getElementById('player-toggle');

  const syncUiMode = () => {
    const mode = window.localStorage.getItem(audioUiModeKey) === 'matrix' ? 'matrix' : 'normal';
    document.body.dataset.uiMode = mode;
    const eyebrow = document.getElementById('player-eyebrow');
    const shell = document.querySelector('.player-shell');
    if (eyebrow) eyebrow.textContent = mode === 'matrix' ? 'Matrix spiller' : 'Baggrundsmusik';
    if (shell) shell.setAttribute('aria-label', mode === 'matrix' ? 'Matrix lydspor spiller' : 'Baggrundsmusik spiller');
  };

  if (!host || !statusEl || !toggleButton) return;
  syncUiMode();

  let spotifyController = null;
  let spotifyReady = false;
  let spotifyPlaying = false;
  let spotifyIFrameAPI = null;
  let spotifyApiPromise = null;
  let channel = null;

  const setStatus = (message) => {
    statusEl.textContent = message;
  };

  const setButtonState = (playing) => {
    toggleButton.textContent = playing ? 'Pause' : 'Play';
    toggleButton.setAttribute('aria-pressed', playing ? 'true' : 'false');
  };

  const broadcastStatus = () => {
    window.localStorage.setItem(audioSessionKey, spotifyPlaying ? 'true' : 'false');
    if (!channel) return;
    channel.postMessage({
      source: 'player',
      type: 'status',
      ready: spotifyReady,
      playing: spotifyPlaying
    });
  };

  const loadSpotifyApi = () => {
    if (spotifyIFrameAPI) return Promise.resolve(spotifyIFrameAPI);
    if (spotifyApiPromise) return spotifyApiPromise;

    spotifyApiPromise = new Promise((resolve) => {
      const previousReady = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        spotifyIFrameAPI = IFrameAPI;
        resolve(IFrameAPI);
        if (typeof previousReady === 'function') previousReady(IFrameAPI);
      };

      if (window.SpotifyIframeApi) {
        spotifyIFrameAPI = window.SpotifyIframeApi;
        resolve(window.SpotifyIframeApi);
        return;
      }

      if (!document.querySelector('script[data-spotify-iframe-api]')) {
        const script = document.createElement('script');
        script.src = 'https://open.spotify.com/embed/iframe-api/v1';
        script.async = true;
        script.dataset.spotifyIframeApi = 'true';
        document.body.appendChild(script);
      }
    });

    return spotifyApiPromise;
  };

  const ensureController = async () => {
    if (spotifyController) return spotifyController;
    const IFrameAPI = await loadSpotifyApi();

    return new Promise((resolve) => {
      IFrameAPI.createController(host, {
        width: '100%',
        height: 152,
        uri: spotifyTrackUri
      }, (EmbedController) => {
        spotifyController = EmbedController;
        spotifyReady = true;
        setStatus('Spotify klar.');
        broadcastStatus();

        if (typeof EmbedController.addListener === 'function') {
          EmbedController.addListener('ready', () => {
            spotifyReady = true;
            setStatus('Spotify klar.');
            broadcastStatus();
            if (window.localStorage.getItem(audioSessionKey) === 'true') {
              window.setTimeout(() => {
                try {
                  EmbedController.play();
                } catch (error) {
                  setStatus('Tryk Play hvis Spotify ikke starter automatisk.');
                }
              }, 250);
            }
          });

          EmbedController.addListener('playback_started', () => {
            spotifyPlaying = true;
            setButtonState(true);
            setStatus('Nu afspilles: Fever Ray');
            broadcastStatus();
          });

          EmbedController.addListener('playback_update', (event) => {
            const paused = Boolean(event && event.data && event.data.isPaused);
            spotifyPlaying = !paused;
            setButtonState(!paused);
            setStatus(paused ? 'Pauset.' : 'Nu afspilles: Fever Ray');
            broadcastStatus();
          });
        }

        resolve(EmbedController);
      });
    });
  };

  const play = async () => {
    window.localStorage.setItem(audioSessionKey, 'true');
    try {
      const controller = await ensureController();
      if (controller && typeof controller.play === 'function') {
        controller.play();
        setStatus('Starter lydspor …');
      }
    } catch (error) {
      setStatus('Spotify kunne ikke startes her.');
    }
  };

  const pause = async () => {
    window.localStorage.setItem(audioSessionKey, 'false');
    spotifyPlaying = false;
    setButtonState(false);
    setStatus('Pauset.');
    broadcastStatus();
    if (spotifyController && typeof spotifyController.pause === 'function') {
      try {
        spotifyController.pause();
      } catch (error) {
        // no-op
      }
    }
  };

  toggleButton.addEventListener('click', () => {
    if (spotifyPlaying || window.localStorage.getItem(audioSessionKey) === 'true') {
      pause();
      return;
    }
    play();
  });

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(audioChannelName);
    channel.addEventListener('message', (event) => {
      const message = event.data || {};
      if (message.source !== 'page') return;

      if (message.type === 'play') {
        play();
      }

      if (message.type === 'pause') {
        pause();
      }

      if (message.type === 'status-request') {
        broadcastStatus();
      }
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key === audioUiModeKey) syncUiMode();
  });

  window.addEventListener('beforeunload', () => {
    window.localStorage.setItem(audioSessionKey, spotifyPlaying ? 'true' : 'false');
    if (channel) {
      channel.postMessage({ source: 'player', type: 'closed' });
      channel.close();
    }
  });

  setButtonState(false);
  ensureController();
})();
