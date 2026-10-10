/* Controlled provider/audio doubles; no remote media or audible output. */
function installYouTubeDouble() {
  const state = window.__radioMock = { players: [], calls: [], active: null, holdReady: false };
  function Player(element, options) {
    const iframe = document.createElement("iframe");
    // An inert visible frame, never a connection to YouTube or a media download.
    iframe.src = "about:blank";
    iframe.dataset.youtubeTestDouble = "";
    element.replaceWith(iframe);
    let status = -1, current = 0, started = 0, volume = 100, muted = false;
    const p = {
      options, videoId: null, destroyed: false,
      getIframe: () => iframe,
      getPlayerState: () => status,
      getDuration: () => { const track = window.CompanionRadioTracks.find(t => t.videoId === p.videoId); return track?.videoDuration || track?.duration || 240; },
      getCurrentTime: () => current + (status === 1 ? (performance.now() - started) / 1000 : 0),
      setVolume: n => { volume = n; state.calls.push(["volume", n]); },
      getVolume: () => volume,
      mute: () => { muted = true; },
      unMute: () => { muted = false; },
      isMuted: () => muted,
      loadVideoById: id => {
        p.videoId = typeof id === "string" ? id : id.videoId;
        current = 0; started = performance.now();
        state.calls.push(["load", p.videoId]);
        emit(1);
      },
      playVideo: () => { if (status !== 1) { started = performance.now(); emit(1); } },
      pauseVideo: () => { if (status === 1 || status === 3) { current = p.getCurrentTime(); emit(2); } },
      seekTo: seconds => { current = seconds; started = performance.now(); state.calls.push(["seek", seconds]); },
      destroy: () => { p.destroyed = true; status = -1; iframe.remove(); state.calls.push(["destroy"]); },
      end: () => { current = p.getDuration(); emit(0); },
      buffer: () => emit(3),
      nativePause: () => emit(2),
      fail: () => options.events.onError({ target: p, data: 100 }),
      releaseReady: () => { if (!p.destroyed) options.events.onReady({ target: p }); },
    };
    function emit(value) {
      if (p.destroyed || status === value) return;
      status = value;
      queueMicrotask(() => { if (!p.destroyed) options.events.onStateChange({ target: p, data: value }); });
    }
    state.players.push(p); state.active = p;
    setTimeout(() => { if (!state.holdReady) p.releaseReady(); }, 0);
    return p;
  }
  window.YT = { Player, PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } };
}

// Keep missing-source regressions independent of the production playlist. The
// shipped library can contain only fully paired songs; these records exist only
// inside the test page, before the player reads the shared catalog.
function installSourceGapCatalog() {
  let catalog;
  Object.defineProperty(window, "CompanionRadioTracks", {
    configurable: true,
    get: () => catalog,
    set: tracks => {
      window.__radioProductionTracks = tracks;
      const common = { artist: "Radio test fixture", kind: "SONG", duration: 240, intro: "受信テストの曲紹介です。" };
      catalog = tracks.concat([
        { ...common, id: "test-radio-pair", title: "Paired fixture", src: "/assets/music/radio/test-pair.mp3", videoId: "TestPair000", url: "https://www.youtube.com/watch?v=TestPair000" },
        { ...common, id: "test-radio-audio-only", title: "Audio-only fixture", src: "/assets/music/radio/test-audio-only.mp3", url: "https://example.invalid/radio-fixture" },
        { ...common, id: "test-radio-video-only", title: "PV-only fixture", videoId: "TestPVOnly0", url: "https://www.youtube.com/watch?v=TestPVOnly0" },
      ]);
    },
  });
}

function installTuningAudioDouble() {
  const mock = window.__tuningMock = { contexts: [], sources: [], gains: [], filters: [], mode: "running", releases: [] };
  function node() { return { connect() {}, disconnect() {} }; }
  function param() {
    const events = [], values = [];
    return { value: 0, events, values,
      setValueAtTime(value, time) { values.push(value); events.push(["set", value, time]); },
      linearRampToValueAtTime(value, time) { values.push(value); events.push(["linear", value, time]); },
      exponentialRampToValueAtTime(value, time) { values.push(value); events.push(["exponential", value, time]); },
    };
  }
  window.AudioContext = class {
    constructor() { this.state = "suspended"; this.sampleRate = 48000; this.destination = node(); mock.contexts.push(this); }
    get currentTime() { return performance.now() / 1000; }
    resume() {
      if (mock.mode === "reject") return Promise.reject(new Error("Audio blocked"));
      if (mock.mode === "pending") return new Promise(resolve => mock.releases.push(() => { this.state = "running"; resolve(); }));
      this.state = "running"; return Promise.resolve();
    }
    createBuffer(channels, length, rate) { return { duration: length / rate, getChannelData: () => new Float32Array(length) }; }
    createBufferSource() {
      const context = this;
      let timer;
      const source = Object.assign(node(), {
        active: false, started: false,
        start(when) { source.active = source.started = true; source.startTime = when; },
        stop(when) {
          clearTimeout(timer);
          function finish() { source.active = false; if (source.onended) source.onended(); }
          if (when > context.currentTime) timer = setTimeout(finish, (when - context.currentTime) * 1000);
          else finish();
        },
      });
      mock.sources.push(source); return source;
    }
    createBiquadFilter() { const filter = Object.assign(node(), { frequency: param(), Q: param() }); mock.filters.push(filter); return filter; }
    createGain() {
      const automation = param(), gain = Object.assign(node(), { values: automation.values, gain: automation });
      mock.gains.push(gain); return gain;
    }
  };
}

// Render the production Web Audio graph with Chrome's real DSP, without ever
// connecting to a physical audio device. A fresh offline graph serves each tune.
function installOfflineTuningAudio() {
  window.__tuningRenders = [];
  window.AudioContext = class {
    constructor() { this.state = "suspended"; this.sampleRate = 48000; }
    get currentTime() { return this.context.currentTime; }
    get destination() { return this.context.destination; }
    resume() {
      this.context = new OfflineAudioContext(1, Math.ceil(this.sampleRate * 1.3), this.sampleRate);
      this.state = "running";
      return Promise.resolve();
    }
    createBuffer(...args) { return this.context.createBuffer(...args); }
    createBiquadFilter() { return this.context.createBiquadFilter(); }
    createGain() { return this.context.createGain(); }
    createBufferSource() {
      const context = this.context, source = context.createBufferSource(), stop = source.stop.bind(source);
      let rendering = false;
      source.stop = when => {
        stop(when);
        if (rendering) return;
        rendering = true;
        context.startRendering().then(buffer => {
          const samples = buffer.getChannelData(0), rate = buffer.sampleRate;
          const rms = (start, end) => {
            const section = samples.subarray(Math.round(start * rate), Math.round(end * rate));
            return Math.sqrt(section.reduce((sum, v) => sum + v * v, 0) / section.length);
          };
          let peak = 0, last = 0;
          for (let i = 0; i < samples.length; i++) { peak = Math.max(peak, Math.abs(samples[i])); if (Math.abs(samples[i]) > .00001) last = i / rate; }
          window.__tuningRenders.push({ rms: rms(0, 1.06), peak, duration: last,
            bursts: [[.05, .18], [.35, .47], [.7, .85]].map(([a, b]) => rms(a, b)),
            gaps: [[.26, .28], [.59, .61], [1.1, 1.25]].map(([a, b]) => rms(a, b)),
          });
        });
      };
      return source;
    }
  };
}

module.exports = { installYouTubeDouble, installTuningAudioDouble, installSourceGapCatalog, installOfflineTuningAudio };
