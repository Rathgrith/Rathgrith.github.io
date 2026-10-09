/* Opt-in battle mixer. No soundbank, media request or AudioContext before a gesture. */
(function () {
  "use strict";
  var base = document.currentScript.dataset.sfxBase;
  var samples = {
    shot_alice: ["shot1", .13, .10],
    shot_marisa: ["shot2", .11, .10],
    shot_patchouli: ["shot3", .13, .10],
    hit: ["hit", .10, .09],
    graze: ["graze", .42, .07],
    power: ["powerup", .42, .18],
    life: ["extra_life", .50, .25],
    clear: ["extra_bomb", .42, .25],
    death: ["death", .55, .30],
    bomb_alice: ["bomb_youmu_a", .36, .50],
    bomb_marisa: ["bomb_marisa_a", .36, .50],
    bomb_patchouli: ["bomb_reimu_a", .36, .50],
    ready: ["timeout2", .28, .20],
  };
  function create(view) {
    var musicOn = false, effectsOn = false, volume = .35;
    var phase = "closed", enemy = "alice", visible = true;
    var music, context, master, compressor, buffers = {}, pending = {};
    var voices = [], lastSound = {}, musicEpoch = 0, effectsEpoch = 0;
    var musicError = false, effectsError = false, loading = false, fadeFrame = 0;
    var bar = document.createElement("div");
    bar.className = "danmaku-audio";
    bar.innerHTML = '<button type="button" data-danmaku-music aria-pressed="false">BGM：切</button>' +
      '<button type="button" data-danmaku-sfx aria-pressed="false">SE：切</button>' +
      '<a data-danmaku-track target="_blank" rel="noopener noreferrer" aria-label="楽曲・編曲者">♫</a>' +
      '<label><span aria-hidden="true">VOL</span><input type="range" data-danmaku-volume min="0" max="100" value="35" aria-label="ゲームの音量"></label>' +
      '<span class="visually-hidden" data-danmaku-audio-status role="status" aria-live="polite"></span>';
    view.querySelector(".danmaku-header").after(bar);
    var musicButton = bar.querySelector("[data-danmaku-music]");
    var effectsButton = bar.querySelector("[data-danmaku-sfx]");
    var volumeInput = bar.querySelector("input");
    var credit = bar.querySelector("a"), status = bar.querySelector("[role=status]");
    function canPlay() { return visible && !document.hidden && phase === "playing"; }
    function update() {
      musicButton.textContent = "BGM：" + (musicError ? "再試行" : musicOn ? "入" : "切");
      effectsButton.textContent = "SE：" + (effectsError ? "再試行" : loading ? "…" : effectsOn ? "入" : "切");
      musicButton.setAttribute("aria-pressed", String(musicOn));
      effectsButton.setAttribute("aria-pressed", String(effectsOn));
      musicButton.setAttribute("aria-label", musicError ? "BGM を再試行" : musicOn ? "BGM を切る" : "BGM を入れる");
      effectsButton.setAttribute("aria-label", effectsError ? "効果音を再試行" : effectsOn ? "効果音を切る" : "効果音を入れる");
      effectsButton.setAttribute("aria-busy", String(loading));
      bar.dataset.music = musicOn ? "on" : "off";
      bar.dataset.sfx = effectsOn ? "on" : "off";
      var track = CompanionBGM.getTrack(enemy);
      credit.href = track.url;
      credit.title = track.full + " · " + track.author;
      credit.setAttribute("aria-label", "BGM：" + track.title + " · " + track.author);
      volumeInput.setAttribute("aria-valuetext", Math.round(volume * 100) + "%");
    }
    function stopMusic() {
      musicEpoch++;
      cancelAnimationFrame(fadeFrame);
      if (music) { music.muted = true; music.pause(); }
    }
    function syncMusic() {
      stopMusic();
      if (!musicOn || !canPlay()) { update(); return; }
      if (!music) {
        music = document.createElement("audio");
        music.dataset.danmakuAudio = "";
        music.preload = "none";
        music.loop = true;
        view.appendChild(music);
        music.addEventListener("error", function () {
          if (!musicOn) return;
          musicOn = false; musicError = true; stopMusic(); update();
          status.textContent = "BGM を読み込めませんでした。再試行してください。";
        });
      }
      var track = CompanionBGM.getTrack(enemy);
      if (music.src !== track.src || musicError) { music.src = track.src; music.load(); }
      musicError = false;
      music.muted = false;
      music.volume = 0;
      var token = musicEpoch;
      music.play().then(function () {
        if (token !== musicEpoch) return;
        var start = performance.now();
        function fade(now) {
          if (token !== musicEpoch) return;
          var t = Math.min(1, (now - start) / 240);
          music.volume = volume * .75 * t;
          if (t < 1) fadeFrame = requestAnimationFrame(fade);
        }
        fadeFrame = requestAnimationFrame(fade);
      }).catch(function (error) {
        if (token !== musicEpoch) return;
        musicOn = false; musicError = true; stopMusic(); update();
        status.textContent = error.name === "NotAllowedError" ? "BGM ボタンを押してください。" : "BGM を読み込めませんでした。再試行してください。";
      });
      update();
    }
    function stopVoices(keepDeath) {
      voices.slice().forEach(function (voice) {
        if (!keepDeath || voice.name !== "death") voice.stop();
      });
      if (!keepDeath) lastSound = {};
    }
    function ensureContext() {
      if (context) return;
      var Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error("Web Audio unavailable");
      context = new Audio();
      master = context.createGain();
      master.gain.value = volume;
      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 10;
      compressor.ratio.value = 5;
      compressor.attack.value = .004;
      compressor.release.value = .12;
      master.connect(compressor);
      compressor.connect(context.destination);
    }
    function load(name) {
      var file = samples[name][0];
      if (buffers[file]) return Promise.resolve();
      if (!pending[file]) {
        pending[file] = fetch(new URL(file + ".wav", new URL(base, location.href))).then(function (response) {
          if (!response.ok) throw new Error("Sound unavailable");
          return response.arrayBuffer();
        }).then(function (bytes) { return context.decodeAudioData(bytes); }).then(function (buffer) {
          buffers[file] = buffer;
        }).finally(function () { delete pending[file]; });
      }
      return pending[file];
    }
    function syncEffects() {
      if (!context) return;
      if (effectsOn && canPlay()) context.resume().catch(function () {});
      else {
        stopVoices(phase === "over" && effectsOn && visible && !document.hidden);
        // Let a final hit finish naturally; all other stop paths are immediate.
        if (!voices.length) context.suspend().catch(function () {});
      }
    }
    function play(name, player) {
      if (name === "shot" || name === "bomb") name += "_" + player;
      var sample = samples[name];
      if (!effectsOn || !canPlay() || !sample || !context || context.state !== "running" || !buffers[sample[0]] || !volume) return;
      var now = context.currentTime;
      if (lastSound[name] !== undefined && now - lastSound[name] < sample[2]) return;
      lastSound[name] = now;
      // Bound polyphony; collision bursts cannot drown out spell or pickup cues.
      if (voices.length >= 12) {
        var disposable = voices.find(function (v) { return v.name.indexOf("shot_") === 0 || v.name === "hit"; });
        if (!disposable) return;
        disposable.stop();
      }
      var source = context.createBufferSource(), gain = context.createGain();
      source.buffer = buffers[sample[0]];
      gain.gain.value = sample[1];
      source.connect(gain); gain.connect(master);
      var ended = false;
      function cleanup() {
        if (ended) return;
        ended = true;
        source.disconnect(); gain.disconnect();
        voices = voices.filter(function (v) { return v !== voice; });
        if (!voices.length && (!effectsOn || !canPlay())) context.suspend().catch(function () {});
      }
      var voice = { name: name, stop: function () { source.stop(); cleanup(); } };
      voices.push(voice);
      source.onended = cleanup;
      source.start();
    }
    musicButton.addEventListener("click", function () {
      musicOn = !musicOn;
      status.textContent = "";
      syncMusic();
    });
    effectsButton.addEventListener("click", function () {
      effectsOn = !effectsOn;
      effectsError = false;
      var token = ++effectsEpoch;
      status.textContent = "";
      if (!effectsOn) { loading = false; syncEffects(); update(); return; }
      try {
        ensureContext();
        loading = true;
        // Resume in the trusted click stack, including on mobile Safari.
        var unlocked = context.resume();
        Promise.all([unlocked].concat(Object.keys(samples).map(load))).then(function () {
          if (token !== effectsEpoch) return;
          loading = false; syncEffects(); update();
        }).catch(function () {
          if (token !== effectsEpoch) return;
          loading = false; effectsOn = false; effectsError = true;
          syncEffects(); update();
          status.textContent = "効果音を読み込めませんでした。再試行してください。";
        });
      } catch (_) {
        effectsOn = false; loading = false; effectsError = true;
        status.textContent = "このブラウザーでは効果音を再生できません。";
      }
      update();
    });
    volumeInput.addEventListener("input", function () {
      volume = Number(volumeInput.value) / 100;
      if (master) master.gain.setTargetAtTime(volume, context.currentTime, .015);
      cancelAnimationFrame(fadeFrame);
      if (music) music.volume = volume * .75;
      update();
    });
    update();
    return {
      play: play,
      setScene: function (value, id, restart) {
        phase = value;
        if (id) enemy = id;
        if (restart) {
          stopVoices(false);
          if (music && music.readyState >= 1) music.currentTime = 0;
        }
        syncMusic(); syncEffects(); update();
      },
      setVisible: function (value) {
        if (visible === value) return;
        visible = value;
        syncMusic(); syncEffects();
      },
    };
  }
  window.DanmakuAudio = { create: create };
})();
