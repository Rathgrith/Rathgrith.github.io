/* Opt-in doujin radio. Local battle tracks stay independent of the station. */
(function () {
  "use strict";
  var base = document.currentScript.dataset.audioBase;
  var tracks = {
    alice: { title: "端国の唄", full: "不思議の国のアリス · 室内楽 MIDI", credit: "望月幻奏楽団", author: "巫月和音", url: "https://lunareverie.iza-yoi.net/midi.html" },
    marisa: { title: "恋色マスタースパーク", full: "恋色マスタースパーク · SD-80", credit: "Kanpyo’s MIDI", author: "干瓢碁", url: "https://kpmidi.net/" },
    patchouli: { title: "幽室魔術師", full: "ラクトガール ～ 少女密室 · 合奏 MIDI", credit: "望月幻奏楽団", author: "巫月和音", url: "https://lunareverie.iza-yoi.net/midi.html" },
  };
  var instance, apiPromise;
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
  function loadAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script"), previous = window.onYouTubeIframeAPIReady;
      var timer = setTimeout(fail, 15000);
      function fail() {
        clearTimeout(timer);
        script.remove();
        apiPromise = null;
        reject(new Error("Radio connection unavailable"));
      }
      window.onYouTubeIframeAPIReady = function () {
        clearTimeout(timer);
        if (typeof previous === "function") previous();
        resolve(window.YT);
      };
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = fail;
      document.head.appendChild(script);
    });
    return apiPromise;
  }
  function mount(root) {
    if (instance) return instance;
    var mode = "audio", playlist = window.CompanionRadioTracks;
    var strip = document.createElement("section");
    strip.className = "vn-bgm";
    strip.setAttribute("aria-label", "幻想郷ラジオ");
    strip.innerHTML =
      '<div class="vn-bgm-deck">' +
        '<button type="button" class="vn-bgm-track" data-radio-open aria-label="ラジオの選局窓を開く"><span class="vn-bgm-label">BGM：</span><span data-bgm-title></span><span class="vn-bgm-type" aria-hidden="true">FM</span></button>' +
        '<div class="vn-radio-dial" aria-hidden="true"><span>76</span><span>80</span><span>84</span><span>88</span><span>92</span><i></i></div>' +
      '</div>' +
      '<div class="vn-bgm-transport"><time data-bgm-time aria-hidden="true">0:00</time><input type="range" data-bgm-seek aria-label="再生位置" min="0" max="1000" value="0" disabled></div>' +
      '<div class="vn-bgm-main">' +
        '<button type="button" class="vn-bgm-button" data-bgm-prev aria-label="前の曲">' + icon("M2 3h2v10H2zM12 3h2v10h-2v-2h-2V9H8V7h2V5h2z") + '</button>' +
        '<button type="button" class="vn-bgm-button" data-bgm-play aria-label="ラジオを再生">' + icons.play + '</button>' +
        '<button type="button" class="vn-bgm-button" data-bgm-next aria-label="次の曲">' + icon("M12 3h2v10h-2zM2 3h2v2h2v2h2v2H6v2H4v2H2z") + '</button>' +
        '<button type="button" class="vn-bgm-button" data-bgm-mute aria-label="消音" aria-pressed="true">' + icons.muted + '</button>' +
        '<label class="vn-bgm-volume"><span aria-hidden="true">VOL</span><input type="range" data-bgm-volume aria-label="ラジオの音量" min="0" max="100" step="1"></label>' +
      '</div>' +
      '<div class="vn-bgm-meta"><span data-bgm-status>消音</span><a data-bgm-credit target="_blank" rel="noopener noreferrer"></a><button type="button" data-radio-pv aria-label="PVの曲目を開く">PV</button></div>' +
      '<p class="vn-bgm-onair" data-bgm-intro aria-live="polite" hidden></p>';
    root.querySelector(".vn-weather-strip").before(strip);
    // A nonmodal, visible receiver keeps the video at its native minimum size
    // without adding a second scrollbar to the narrow Playground window.
    var receiver = document.createElement("aside");
    receiver.className = "vn-radio-receiver";
    receiver.setAttribute("popover", "manual");
    receiver.setAttribute("role", "dialog");
    receiver.setAttribute("aria-label", "幻想郷ラジオ・選局窓");
    receiver.setAttribute("tabindex", "-1");
    receiver.hidden = true;
    receiver.innerHTML = '<header class="vn-radio-header"><span>幻想郷ラジオ <small>FM 98.0</small></span><button type="button" data-radio-close aria-label="ラジオの窓を閉じて停止">×</button></header>' +
      '<div class="vn-radio-body"><div class="vn-radio-modes" role="group" aria-label="再生モード"><button type="button" data-radio-mode="audio" aria-pressed="true">RADIO</button><button type="button" data-radio-mode="pv" aria-pressed="false">PV</button><button type="button" data-radio-start>再生 ▷</button></div><label class="vn-radio-station">選局<select data-radio-station aria-label="放送する曲"></select></label>' +
      '<div class="vn-radio-screen"><div data-radio-player></div></div>' +
      '<p class="vn-radio-host" role="status" aria-live="polite"><span>STUDIO</span><span data-radio-intro>幻想郷ラジオへようこそ。今夜も、お気に入りの一曲を。</span></p>' +
      '<div class="vn-radio-footer"><span data-radio-credit></span><a data-radio-listen target="_blank" rel="noopener noreferrer" hidden></a><a data-radio-source target="_blank" rel="noopener noreferrer">YouTube ↗</a></div></div>';
    document.body.appendChild(receiver);
    var lyrics = window.CompanionRadioLyrics.mount(receiver.querySelector(".vn-radio-body"));
    function syncTheme() {
      var computed = getComputedStyle(root);
      ["--vn-font", "--vn-ink", "--vn-panel", "--vn-rule", "--vn-light"].forEach(function (key) {
        receiver.style.setProperty(key, computed.getPropertyValue(key));
      });
    }
    syncTheme();
    var select = receiver.querySelector("select");
    function fillStations() {
      select.replaceChildren();
      playlist.forEach(function (track, i) {
        var option = document.createElement("option");
        option.value = i;
        option.textContent = String(i + 1).padStart(2, "0") + " · " + track.title + (track.kind === "XFD" ? " [XFD]" : track.kind === "PREVIEW" ? " [試聴]" : "") + (!track.src ? " · PVのみ" : !track.videoId ? " · RADIOのみ" : "");
        select.appendChild(option);
      });
    }
    fillStations();
    var play = strip.querySelector("[data-bgm-play]"), mute = strip.querySelector("[data-bgm-mute]");
    var seek = strip.querySelector("[data-bgm-seek]"), volumeInput = strip.querySelector("[data-bgm-volume]");
    var title = strip.querySelector("[data-bgm-title]"), status = strip.querySelector("[data-bgm-status]");
    var intro = receiver.querySelector("[data-radio-intro]");
    var player, ready = false, connecting = false, selected = 0, character = "";
    var requested = false, opened = false, visible = true, game = false, tuned = false;
    var volume = .28, muted = false, loading = false, failed = false, needsLoad = true;
    var pendingIntro = false, transitionTimer = 0, connectionTimer = 0, epoch = 0;
    var audioConfigured = false, desiredVolume = null, desiredMute = null, audioWriteUntil = 0;
    var programmaticPause = false, tuningContext, tuningNodes, tuningEpoch = 0;
    try {
      var stored = localStorage.getItem("site-companion-bgm-volume");
      if (stored !== null && Number.isFinite(Number(stored))) volume = Math.max(0, Math.min(1, Number(stored)));
    } catch (_) {}
    volumeInput.value = Math.round(volume * 100);
    function available(index) { return !!playlist[index == null ? selected : index][mode === "audio" ? "src" : "videoId"]; }
    function nextAvailable(direction) {
      for (var step = 1; step <= playlist.length; step++) {
        var index = (selected + direction * step + playlist.length) % playlist.length;
        if (available(index)) return index;
      }
      return selected;
    }
    function unavailableMessage() {
      if (mode === "pv") return "この曲のPVは未登録です。RADIOでお聴きください。";
      var listen = playlist[selected].listen;
      return listen ? "RADIO用の音源は未登録です。" + listen.name + "の配信ページ、またはPVでお聴きください。" : "RADIO用の音源は未登録です。PVでお聴きください。";
    }
    function allowed() { return requested && available() && (mode === "audio" || opened) && visible && !game && !document.hidden; }
    function saveVolume() {
      try { localStorage.setItem("site-companion-bgm-volume", String(volume)); } catch (_) {}
    }
    function applyAudioSettings() {
      if (!ready) return;
      desiredVolume = Math.round(volume * 100);
      desiredMute = muted;
      // IFrame API commands are asynchronous: ignore its old cached settings
      // until our write is acknowledged, or the bounded grace period expires.
      audioWriteUntil = performance.now() + 1500;
      player.setVolume(desiredVolume);
      if (muted) player.mute(); else player.unMute();
      audioConfigured = true;
    }
    function readNativeAudio() {
      if (!ready || !audioConfigured) return;
      var nativeVolume = player.getVolume(), nativeMute = player.isMuted(), now = performance.now();
      if (desiredVolume !== null && (nativeVolume === desiredVolume || now >= audioWriteUntil)) desiredVolume = null;
      if (desiredMute !== null && (nativeMute === desiredMute || now >= audioWriteUntil)) desiredMute = null;
      if (desiredVolume === null && Number.isFinite(nativeVolume) && nativeVolume >= 0 && nativeVolume <= 100 && nativeVolume !== Math.round(volume * 100)) {
        volume = nativeVolume / 100;
        volumeInput.value = nativeVolume;
        saveVolume();
        stopTuning();
      }
      if (desiredMute === null && typeof nativeMute === "boolean" && nativeMute !== muted) {
        muted = nativeMute;
        stopTuning();
      }
    }
    function stopTuning() {
      ++tuningEpoch;
      if (!tuningNodes) return;
      var nodes = tuningNodes;
      tuningNodes = null;
      try { nodes[0].stop(); } catch (_) {}
      nodes.forEach(function (node) { node.disconnect(); });
    }
    function playTuning() {
      stopTuning();
      if (!allowed() || muted || !volume) return;
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      var token = tuningEpoch;
      try {
        if (!tuningContext || tuningContext.state === "closed") tuningContext = new AudioContext();
        var context = tuningContext;
        Promise.resolve(context.resume()).then(function () {
          if (token !== tuningEpoch || context.state !== "running" || !allowed() || muted || !volume) return;
          var source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
          var buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .38), context.sampleRate);
          var samples = buffer.getChannelData(0);
          for (var i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
          source.buffer = buffer;
          filter.type = "bandpass";
          filter.frequency.value = 1400;
          filter.Q.value = .7;
          var now = context.currentTime;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(.055 * volume, now + .025);
          gain.gain.exponentialRampToValueAtTime(.0001, now + .36);
          source.connect(filter); filter.connect(gain); gain.connect(context.destination);
          tuningNodes = [source, filter, gain];
          source.onended = function () { if (tuningNodes && tuningNodes[0] === source) stopTuning(); };
          source.start(now);
          source.stop(now + .38);
        }).catch(function () { /* A blocked audio context must not block the radio. */ });
      } catch (_) { /* Audio is optional on browsers without a usable Web Audio context. */ }
    }
    function pausePlayer() {
      if (!ready) return;
      readNativeAudio();
      var state = player.getPlayerState();
      if (mode === "audio" || state === 1 || state === 3) {
        programmaticPause = true;
        player.pauseVideo();
      }
    }
    function clock(seconds) {
      seconds = Math.max(0, Math.floor(seconds || 0));
      return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
    }
    function position() {
      if (receiver.hidden) return;
      var r = root.getBoundingClientRect(), width = Math.min(430, innerWidth - 20);
      var x = r.right + 12;
      if (x + width > innerWidth - 10) x = r.left - width - 12;
      if (x < 10) x = Math.max(10, (innerWidth - width) / 2);
      receiver.style.left = x + "px";
      receiver.style.top = Math.max(10, Math.min(r.top, innerHeight - receiver.offsetHeight - 10)) + "px";
    }
    function showReceiver(show) {
      if (show === !receiver.hidden) { if (show) position(); return; }
      if (show) {
        receiver.hidden = false;
        if (receiver.showPopover) receiver.showPopover();
        position();
      } else {
        if (receiver.hidePopover && receiver.matches(":popover-open")) receiver.hidePopover();
        receiver.hidden = true;
      }
    }
    function metadata() {
      var track = playlist[selected];
      strip.dataset.radioMode = mode;
      receiver.dataset.radioMode = mode;
      receiver.dataset.sourceAvailable = String(available());
      receiver.querySelector("[data-radio-source]").textContent = "YouTube ↗";
      receiver.querySelector("[data-radio-close]").setAttribute("aria-label", mode === "audio" ? "選局窓を閉じる" : "ラジオの窓を閉じて停止");
      strip.querySelector(".vn-bgm-type").textContent = mode === "pv" || !track.src ? "PV" : track.kind === "SONG" ? "MP3" : track.kind === "XFD" ? "XFD" : "試聴";
      title.textContent = track.title;
      title.title = track.title + " · " + track.artist;
      select.value = selected;
      lyrics.setTrack(mode === "pv" ? track.videoId || track.id + "-pv" : track.id, mode === "audio" ? track.lyrics : "");
      strip.style.setProperty("--radio-frequency", (8 + selected / (playlist.length - 1) * 84) + "%");
      strip.dataset.radioTrack = track.id;
      var source = mode === "pv" && track.videoId ? "https://www.youtube.com/watch?v=" + track.videoId : track.url;
      [strip.querySelector("[data-bgm-credit]"), receiver.querySelector("[data-radio-source]")].forEach(function (link) { link.href = source; });
      strip.querySelector("[data-bgm-credit]").textContent = track.artist + " ↗";
      receiver.querySelector("[data-radio-credit]").textContent = track.artist;
      var listen = receiver.querySelector("[data-radio-listen]");
      listen.hidden = !track.listen;
      if (track.listen) { listen.href = track.listen.url; listen.textContent = track.listen.name + " ↗"; }
      else { listen.removeAttribute("href"); listen.textContent = ""; }
    }
    function update() {
      readNativeAudio();
      var playing = ready && player.getPlayerState() === 1 && allowed();
      var supported = available();
      var silent = muted || !volume || !requested;
      strip.dataset.bgmState = !supported ? "unavailable" : failed ? "error" : pendingIntro && allowed() ? "intermission" : loading && requested ? "loading" : playing ? "playing" : "paused";
      receiver.dataset.state = strip.dataset.bgmState;
      play.innerHTML = failed ? icons.retry : requested ? icons.pause : icons.play;
      play.setAttribute("aria-label", failed ? "ラジオを再試行" : requested ? "ラジオを一時停止" : "ラジオを再生");
      mute.innerHTML = silent ? icons.muted : icons.sound;
      mute.setAttribute("aria-pressed", String(silent));
      mute.setAttribute("aria-label", silent ? "音声をオンにする" : "消音");
      status.textContent = !supported ? mode === "audio" ? "PVのみ" : "RADIOのみ" : failed ? "接続不可" : pendingIntro && allowed() ? "曲紹介" : loading && requested ? "受信中…" : silent ? "消音" : playing ? "放送中" : "停止中";
      play.disabled = mute.disabled = !supported;
      receiver.querySelector("[data-radio-start]").disabled = !supported;
      var duration = ready && !needsLoad ? player.getDuration() || 0 : 0;
      var current = ready && !needsLoad ? player.getCurrentTime() || 0 : 0;
      lyrics.setTime(current);
      var onair = strip.querySelector("[data-bgm-intro]");
      onair.hidden = !(pendingIntro && allowed());
      onair.textContent = playlist[selected].intro;
      seek.disabled = !duration || failed || pendingIntro;
      seek.value = duration ? Math.round(current / duration * 1000) : 0;
      seek.setAttribute("aria-valuetext", clock(current) + " / " + clock(duration));
      strip.querySelector("[data-bgm-time]").textContent = clock(current);
      volumeInput.setAttribute("aria-valuetext", Math.round(volume * 100) + "%");
      receiver.querySelector("[data-radio-start]").textContent = requested ? "一時停止 Ⅱ" : "再生 ▷";
    }
    function stopTransition() { clearTimeout(transitionTimer); transitionTimer = 0; }
    function fail() {
      clearTimeout(connectionTimer);
      stopTransition();
      stopTuning();
      loading = connecting = pendingIntro = requested = false;
      failed = true;
      pausePlayer();
      intro.textContent = mode === "audio" ? "受信できませんでした。公式サイトで聴くか、別の番組を選んでください。" : "受信できませんでした。YouTubeで聴くか、別の曲を選んでください。";
      update();
    }
    function startTrack() {
      if (!ready || !allowed()) return;
      if (needsLoad) {
        loading = true;
        needsLoad = false;
        player.loadVideoById(mode === "audio" ? playlist[selected].id : playlist[selected].videoId);
      } else player.playVideo();
      update();
    }
    function connect() {
      if (connecting || player) return;
      connecting = loading = true;
      var token = ++epoch;
      update();
      (mode === "audio" ? Promise.resolve(window.CompanionRadioAudio) : loadAPI()).then(function (provider) {
        if (token !== epoch) return;
        if (!allowed()) { connecting = false; return; }
        player = new provider.Player(receiver.querySelector("[data-radio-player]"), {
          host: "https://www.youtube-nocookie.com", width: "100%", height: "100%",
          playerVars: { playsinline: 1, controls: 1, rel: 0, cc_load_policy: 1, cc_lang_pref: "ja", origin: location.origin },
          events: {
            onReady: function (event) {
              if (token !== epoch) return;
              player = event.target;
              clearTimeout(connectionTimer);
              connecting = loading = false;
              ready = true;
              applyAudioSettings();
              if (mode === "pv") {
                player.getIframe().title = "幻想郷ラジオ — YouTube公式音源";
                player.getIframe().referrerPolicy = "strict-origin-when-cross-origin";
              }
              sync();
            },
            onStateChange: function (event) {
              if (!ready || token !== epoch) return;
              if (event.data === 0 && allowed()) { choose(nextAvailable(1), true); return; }
              if (event.data === 1) {
                loading = false;
                if (visible && !game && !document.hidden && (mode === "audio" || opened) && !pendingIntro && (requested || !programmaticPause)) requested = true;
                else pausePlayer();
              }
              if (event.data === 2) {
                loading = false;
                if (!programmaticPause && allowed() && !pendingIntro) { requested = false; stopTuning(); }
                programmaticPause = false;
              }
              if (event.data === 3 && allowed()) loading = true;
              update();
            },
            onError: function () { if (token === epoch) fail(); },
            onAutoplayBlocked: function () {
              if (token !== epoch) return;
              requested = loading = false;
              stopTuning();
              intro.textContent = "再生ボタンを押すと、放送が始まります。";
              update();
            },
          },
        });
        connectionTimer = setTimeout(function () { if (!ready && token === epoch) fail(); }, 15000);
        update();
      }).catch(function () { if (token === epoch) fail(); });
    }
    function sync() {
      stopTransition();
      showReceiver(opened && visible && !game && !document.hidden);
      if (!allowed()) {
        stopTuning();
        pausePlayer();
        update();
        return;
      }
      if (!ready) { connect(); update(); return; }
      if (pendingIntro) {
        pausePlayer();
        transitionTimer = setTimeout(function () {
          transitionTimer = 0;
          if (!allowed()) return;
          pendingIntro = false;
          startTrack();
        }, 4800);
        update();
      } else startTrack();
    }
    function destroyPlayer() {
      readNativeAudio();
      ++epoch;
      clearTimeout(connectionTimer);
      stopTransition();
      stopTuning();
      if (player) player.destroy();
      player = null;
      ready = connecting = loading = false;
      audioConfigured = programmaticPause = false;
      desiredVolume = desiredMute = null;
      needsLoad = true;
      var screen = receiver.querySelector(".vn-radio-screen");
      if (!screen.querySelector("[data-radio-player]")) {
        var slot = document.createElement("div");
        slot.setAttribute("data-radio-player", "");
        screen.prepend(slot);
      }
    }
    function choose(index, introduce, explicit) {
      readNativeAudio();
      if (failed && !ready) destroyPlayer();
      tuned = true;
      stopTransition();
      selected = (index + playlist.length) % playlist.length;
      needsLoad = true;
      failed = false;
      pendingIntro = !!introduce;
      loading = false;
      // Keep intent while pausing the preceding track for the station break.
      if (ready) { pendingIntro = requested; pausePlayer(); }
      if (!available()) requested = pendingIntro = false;
      intro.textContent = available() ? playlist[selected].intro : unavailableMessage();
      metadata();
      sync();
      if (explicit) playTuning();
    }
    function start() {
      if (!available()) return;
      readNativeAudio();
      tuned = requested = true;
      if (mode === "pv") opened = true;
      if (failed) { destroyPlayer(); failed = false; }
      intro.textContent = playlist[selected].intro;
      sync();
      playTuning();
    }
    function close() {
      opened = false;
      if (mode === "pv") { requested = pendingIntro = false; destroyPlayer(); }
      showReceiver(false);
      update();
      play.focus({ preventScroll: true });
    }
    play.addEventListener("click", function () {
      if (requested) { requested = false; sync(); } else start();
    });
    strip.querySelector("[data-radio-open]").addEventListener("click", function () {
      opened = true;
      showReceiver(true);
      select.focus({ preventScroll: true });
    });
    function recommendation() {
      return Math.min(character === "patchouli" ? 1 : character === "marisa" ? 2 : 0, playlist.length - 1);
    }
    function switchMode(nextMode) {
      if (nextMode !== mode) {
        requested = pendingIntro = false;
        destroyPlayer();
        mode = nextMode;
        failed = false;
        metadata();
        intro.textContent = available() ? playlist[selected].intro : unavailableMessage();
      }
      receiver.querySelectorAll("[data-radio-mode]").forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.radioMode === mode));
      });
      opened = true;
      sync();
    }
    receiver.querySelectorAll("[data-radio-mode]").forEach(function (button) {
      button.addEventListener("click", function () { switchMode(button.dataset.radioMode); });
    });
    strip.querySelector("[data-radio-pv]").addEventListener("click", function () { switchMode("pv"); });
    strip.querySelector("[data-bgm-prev]").addEventListener("click", function () { choose(nextAvailable(-1), requested, true); });
    strip.querySelector("[data-bgm-next]").addEventListener("click", function () { choose(nextAvailable(1), requested, true); });
    select.addEventListener("change", function () { choose(Number(select.value), requested, true); });
    receiver.querySelector("[data-radio-start]").addEventListener("click", function () { play.click(); });
    receiver.querySelector("[data-radio-close]").addEventListener("click", close);
    receiver.addEventListener("keydown", function (event) { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } });
    mute.addEventListener("click", function () {
      readNativeAudio();
      if (!requested || !volume) {
        muted = false;
        if (!volume) { volume = .28; volumeInput.value = 28; saveVolume(); }
        applyAudioSettings();
        if (!requested) { start(); return; }
      } else { muted = !muted; applyAudioSettings(); }
      if (muted) stopTuning();
      update();
    });
    volumeInput.addEventListener("input", function () {
      var chosenVolume = Number(volumeInput.value) / 100;
      readNativeAudio();
      volume = chosenVolume;
      volumeInput.value = Math.round(volume * 100);
      applyAudioSettings();
      stopTuning();
      saveVolume();
      update();
    });
    seek.addEventListener("input", function () {
      if (ready && !seek.disabled) player.seekTo(Number(seek.value) / 1000 * player.getDuration(), true);
      update();
    });
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", function () { requested = false; sync(); });
    document.addEventListener("site:content-updated", function () { requestAnimationFrame(position); });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, { passive: true });
    new ResizeObserver(position).observe(receiver);
    setInterval(function () { if (ready && !document.hidden) update(); }, 200);
    instance = {
      setCharacter: function (id) {
        if (!tracks[id] || character === id) return;
        character = id;
        strip.dataset.bgmCharacter = id;
        requestAnimationFrame(syncTheme);
        if (!tuned) {
          selected = recommendation();
          metadata();
          intro.textContent = available() ? playlist[selected].intro : unavailableMessage();
          update();
        }
      },
      setVisible: function (value) { if (visible !== value) { visible = value; sync(); } },
      setGameActive: function (value) { if (game !== value) { game = value; sync(); } },
    };
    metadata();
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
