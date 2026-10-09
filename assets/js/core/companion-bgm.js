/* One opt-in audio instance, retained with the companion during soft navigation. */
(function () {
  "use strict";
  var base = document.currentScript.dataset.audioBase;
  var tracks = {
    alice: { title: "端国の唄", full: "不思議の国のアリス · 室内楽 MIDI", credit: "望月幻奏楽団", author: "巫月和音", url: "https://lunareverie.iza-yoi.net/midi.html" },
    marisa: { title: "恋色マスタースパーク", full: "恋色マスタースパーク · SD-80", credit: "Kanpyo’s MIDI", author: "干瓢碁", url: "https://kpmidi.net/" },
    patchouli: { title: "幽室魔術師", full: "ラクトガール ～ 少女密室 · 合奏 MIDI", credit: "望月幻奏楽団", author: "巫月和音", url: "https://lunareverie.iza-yoi.net/midi.html" },
  };
  var instance;
  function icon(path) {
    return '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><path fill="currentColor" d="' + path + '"/></svg>';
  }
  var icons = {
    play: icon("M4 2h2v2h2v2h2v1h2v2h-2v1H8v2H6v2H4z"),
    pause: icon("M3 3h3v10H3zM10 3h3v10h-3z"),
    muted: icon("M1 6h3V4h2V2h2v12H6v-2H4v-2H1zM10 5h2v2h2V5h2v2h-2v2h2v2h-2V9h-2v2h-2V9h2V7h-2z"),
    sound: icon("M1 6h3V4h2V2h2v12H6v-2H4v-2H1zM10 5h2v6h-2zM12 2h2v3h2v6h-2v3h-2v-3h2V5h-2z"),
    retry: icon("M4 2h8v2h2v3h2v2h-6V3H4v2H2v6h2v2h8v2H4v-2H2v-2H0V5h2V3h2z"),
  };
  function mount(root) {
    if (instance) return instance;
    var strip = document.createElement("section");
    strip.className = "vn-bgm";
    strip.setAttribute("aria-label", "背景音楽");
    strip.innerHTML =
      '<div class="vn-bgm-deck">' +
        '<div class="vn-bgm-track"><span class="vn-bgm-label">BGM：</span><span data-bgm-title></span><span class="vn-bgm-type" aria-hidden="true">STEREO</span></div>' +
        '<div class="vn-bgm-tape" aria-hidden="true"><span class="vn-bgm-reel"></span><span class="vn-bgm-tape-line"></span><span class="vn-bgm-reel"></span></div>' +
      '</div>' +
      '<div class="vn-bgm-transport">' +
        '<time data-bgm-time aria-hidden="true">0:00</time>' +
        '<input type="range" data-bgm-seek aria-label="再生位置" min="0" max="1000" value="0" disabled>' +
      '</div>' +
      '<div class="vn-bgm-main">' +
        '<button type="button" class="vn-bgm-button" data-bgm-play aria-label="BGM を再生">' + icons.play + '</button>' +
        '<button type="button" class="vn-bgm-button" data-bgm-mute aria-label="ミュートを解除" aria-pressed="true">' + icons.muted + '</button>' +
        '<span data-bgm-status>消音</span>' +
        '<label class="vn-bgm-volume"><span aria-hidden="true">VOL</span><input type="range" data-bgm-volume aria-label="BGM の音量" min="0" max="100" step="1"></label>' +
      '</div>' +
      '<div class="vn-bgm-meta"><span aria-hidden="true">TYPE I · NORMAL</span><a data-bgm-credit target="_blank" rel="noopener noreferrer"></a></div>' +
      '<span class="visually-hidden" data-bgm-announcement role="status" aria-live="polite"></span>';
    root.querySelector(".vn-weather-strip").before(strip);
    var audio = document.createElement("audio");
    audio.preload = "none";
    audio.loop = true;
    audio.muted = true;
    audio.setAttribute("data-companion-audio", "");
    strip.appendChild(audio);
    var play = strip.querySelector("[data-bgm-play]");
    var mute = strip.querySelector("[data-bgm-mute]");
    var seek = strip.querySelector("[data-bgm-seek]");
    var volumeInput = strip.querySelector("[data-bgm-volume]");
    var title = strip.querySelector("[data-bgm-title]");
    var status = strip.querySelector("[data-bgm-status]");
    var announcement = strip.querySelector("[data-bgm-announcement]");
    var character = "", requested = false, visible = true, game = false;
    var volume = .28, loading = false, failed = false, epoch = 0, frame = 0, ducked = false;
    function targetVolume() { return volume * (ducked ? .3 : 1); }
    try {
      var stored = localStorage.getItem("site-companion-bgm-volume");
      if (stored !== null && Number.isFinite(Number(stored))) volume = Math.max(0, Math.min(1, Number(stored)));
    } catch (_) {}
    audio.volume = volume;
    volumeInput.value = Math.round(volume * 100);
    function allowed() { return requested && visible && !game && !document.hidden; }
    function clock(seconds) {
      seconds = Math.max(0, Math.floor(seconds || 0));
      return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
    }
    function update() {
      var playing = !audio.paused && !audio.ended;
      var silent = audio.muted || volume === 0;
      var state = failed ? "error" : loading ? "loading" : playing && !silent ? "playing" : "paused";
      strip.dataset.bgmState = state;
      play.innerHTML = failed ? icons.retry : requested ? icons.pause : icons.play;
      var label = failed ? "BGM を再試行" : requested ? "BGM を一時停止" : "BGM を再生";
      play.setAttribute("aria-label", label);
      play.title = label;
      mute.innerHTML = silent ? icons.muted : icons.sound;
      mute.setAttribute("aria-pressed", String(silent));
      label = silent ? "ミュートを解除" : "ミュート";
      mute.setAttribute("aria-label", label);
      mute.title = label;
      status.textContent = failed ? "再試行" : loading ? "読込中…" : silent ? "消音" : playing ? "再生中" : "停止中";
      var duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      seek.disabled = !duration || failed;
      seek.value = duration ? Math.round(audio.currentTime / duration * 1000) : 0;
      seek.setAttribute("aria-valuetext", clock(audio.currentTime) + " / " + clock(duration));
      strip.querySelector("[data-bgm-time]").textContent = clock(audio.currentTime);
      seek.style.setProperty("--bgm-fill", seek.value / 10 + "%");
      volumeInput.style.setProperty("--bgm-fill", volume * 100 + "%");
      volumeInput.setAttribute("aria-valuetext", Math.round(volume * 100) + "%");
    }
    function cancelFade() { cancelAnimationFrame(frame); frame = 0; }
    function fade(to, milliseconds, token, done) {
      cancelFade();
      var from = audio.volume, start = performance.now();
      function tick(now) {
        if (token !== epoch) return;
        var progress = Math.min(1, (now - start) / milliseconds);
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * progress));
        if (progress < 1) frame = requestAnimationFrame(tick);
        else { frame = 0; if (done) done(); }
      }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      var token = ++epoch;
      cancelFade();
      if (!allowed() || !character) {
        audio.pause();
        audio.volume = targetVolume();
        loading = false;
        update();
        return;
      }
      var src = new URL(character + "-ensemble.mp3", new URL(base, location.href)).href;
      if (audio.src !== src || failed) {
        audio.pause();
        audio.src = src;
        audio.load();
      }
      failed = false;
      loading = true;
      audio.volume = 0;
      update();
      audio.play().then(function () {
        if (token !== epoch) return;
        loading = false;
        fade(targetVolume(), 320, token);
        update();
      }).catch(function (error) {
        if (token !== epoch) return;
        requested = false;
        loading = false;
        failed = error.name !== "NotAllowedError";
        announcement.textContent = failed ? "音楽を読み込めませんでした。再試行してください。" : "再生ボタンを押してください。";
        update();
      });
    }
    play.addEventListener("click", function () {
      requested = !requested;
      if (requested) {
        audio.muted = false;
        if (!volume) { volume = .28; volumeInput.value = 28; }
      }
      announcement.textContent = "";
      sync();
    });
    mute.addEventListener("click", function () {
      if (audio.muted || !volume) {
        audio.muted = false;
        if (!volume) { volume = .28; volumeInput.value = 28; }
        requested = true;
        sync();
      } else { audio.muted = true; update(); }
    });
    volumeInput.addEventListener("input", function () {
      cancelFade();
      volume = Number(volumeInput.value) / 100;
      audio.volume = targetVolume();
      // Adjusting a slider on a fresh visit never starts playback.
      if (requested && volume) audio.muted = false;
      try { localStorage.setItem("site-companion-bgm-volume", String(volume)); } catch (_) {}
      if (allowed() && !audio.src.endsWith("/" + character + "-ensemble.mp3")) sync();
      update();
    });
    seek.addEventListener("input", function () {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Number(seek.value) / 1000 * Math.max(0, audio.duration - .05);
        update();
      }
    });
    ["timeupdate", "durationchange", "play", "pause", "loadedmetadata"].forEach(function (name) {
      audio.addEventListener(name, update);
    });
    audio.addEventListener("error", function () {
      if (!audio.getAttribute("src")) return;
      ++epoch;
      cancelFade();
      loading = false;
      failed = true;
      requested = false;
      audio.pause();
      announcement.textContent = "音楽を読み込めませんでした。再試行してください。";
      update();
    });
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", function () { ++epoch; cancelFade(); audio.pause(); });
    window.addEventListener("pageshow", function (event) { if (event.persisted) sync(); });
    instance = {
      setDucked: function (value) {
        if (ducked === value) return;
        ducked = value;
        if (!audio.paused) fade(targetVolume(), value ? 100 : 240, epoch);
      },
      setCharacter: function (id) {
        if (!tracks[id] || character === id) return;
        character = id;
        strip.dataset.bgmCharacter = id;
        title.textContent = tracks[id].title;
        title.title = tracks[id].full;
        title.setAttribute("aria-label", tracks[id].full);
        var credit = strip.querySelector("[data-bgm-credit]");
        credit.textContent = tracks[id].credit;
        credit.href = tracks[id].url;
        credit.title = "原曲：ZUN · 編曲：" + tracks[id].author + (id === "alice" ? " · 音色変更" : "");
        failed = false;
        // No source is assigned until the first explicit play/unmute gesture.
        if (allowed() && !audio.paused) {
          var token = ++epoch;
          fade(0, 140, token, sync);
        } else {
          if (!allowed() && audio.getAttribute("src")) {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
          }
          sync();
        }
      },
      setVisible: function (value) {
        if (visible === value) return;
        visible = value;
        sync();
      },
      setGameActive: function (value) {
        if (game === value) return;
        game = value;
        sync();
      },
    };
    update();
    return instance;
  }
  window.CompanionBGM = {
    mount: mount,
    getTrack: function (id) {
      id = tracks[id] ? id : "alice";
      return Object.assign({}, tracks[id], {
        src: new URL(id + "-ensemble.mp3", new URL(base, location.href)).href,
      });
    },
  };
})();
