/* Battle mixer. Standalone defaults on; audio devices still unlock on a gesture. */
(function () {
  "use strict";
  var base = document.currentScript.dataset.sfxBase;
  var samples = {
    shot_alice: ["blade_swing", 0.23, 0.13],
    shot_alice_lance: ["lance_thrust", 0.22, 0.12],
    shot_alice_shield: ["blade_swing", 0.18, 0.16, 1.22],
    parry: ["shield_parry", 0.51, 0.15],
    shot_marisa: ["rail_shot", 0.23, 0.14],
    shot_marisa_charged: ["rail_charged", 0.40, 0.25],
    shot_marisa_pod: ["pod_shot", 0.13, 0.19],
    shot_patchouli: ["page_turn", 0.24, 0.14],
    shot_patchouli_seal: ["seal_release", 0.22, 0.17],
    enemy_volley_alice: ["needle_cast", 0.14, 0.85],
    enemy_volley_marisa: ["prism_cast", 0.14, 0.85],
    enemy_volley_patchouli: ["folio_cast", 0.16, 0.85],
    hit: ["hit", 0.1, 0.09],
    hit_alice: ["hit_alice", 0.27, 0.11],
    hit_alice_lance: ["haft_impact", 0.35, 0.12],
    hit_marisa: ["hit_marisa", 0.34, 0.13],
    hit_patchouli: ["hit_patchouli", 0.26, 0.14],
    hit_heavy_alice: ["hit_alice", 0.45, 0.2, 0.74],
    hit_heavy_alice_lance: ["haft_impact", 0.5, 0.2, 0.78],
    hit_heavy_marisa: ["hit_marisa", 0.52, 0.2, 0.72],
    hit_heavy_patchouli: ["hit_patchouli", 0.44, 0.2, 0.78],
    foe_break: ["foe_break", 0.39, 0.12],
    armor_break: ["armor_break", 0.46, 0.26],
    boss_break: ["boss_break", 0.55, 0.4],
    upgrade: ["upgrade", 0.48, 0.30],
    bomb_impact: ["bomb_impact", 0.38, 0.15],
    graze: ["graze", 0.42, 0.07],
    power: ["powerup", 0.42, 0.18],
    life: ["extra_life", 0.5, 0.25],
    clear: ["extra_bomb", 0.42, 0.25],
    death: ["death", 0.55, 0.3],
    bomb_alice: ["bomb_youmu_a", 0.36, 0.5],
    bomb_marisa: ["bomb_marisa_a", 0.36, 0.5],
    bomb_patchouli: ["bomb_reimu_a", 0.36, 0.5],
    ready: ["timeout2", 0.28, 0.2],
    spell_alice: ["spell_alice", 0.55, 0.8],
    spell_marisa: ["spell_marisa", 0.55, 0.8],
    spell_patchouli: ["spell_patchouli", 0.55, 0.8],
    laser_charge: ["laser_charge", 0.24, 0.35],
    laser_fire: ["laser_fire", 0.26, 0.35],
    spell_break: ["spell_break", 0.48, 0.5],
    capture: ["spell_capture", 0.55, 0.5],
    score: ["score_collect", 0.2, 0.065],
  };
  function create(view, options) {
    var musicOn = !!(options && options.enabled),
      effectsOn = musicOn,
      volume = 0.35;
    var timelineTime = 0,
      timelineRunning = false,
      lastTimelineSeek = -Infinity,
      lastRateCheck = -Infinity,
      nextResumeAt = 0;
    var phase = "closed",
      enemy = "alice",
      visible = true;
    var music,
      context,
      master,
      compressor,
      buffers = {},
      pending = {};
    var voices = [],
      lastSound = {},
      musicEpoch = 0,
      effectsEpoch = 0;
    var musicError = false,
      effectsError = false,
      loading = false,
      fadeFrame = 0,
      musicPriming = false,
      playPending = false,
      download = null,
      localTrack = "";
    var bar = document.createElement("div");
    bar.className = "danmaku-audio";
    bar.innerHTML =
      '<button type="button" data-danmaku-music aria-pressed="false">BGM：切</button>' +
      '<button type="button" data-danmaku-sfx aria-pressed="false">SE：切</button>' +
      '<a data-danmaku-track target="_blank" rel="noopener noreferrer" aria-label="楽曲・編曲者">♫</a>' +
      '<label><span aria-hidden="true">VOL</span><input type="range" data-danmaku-volume min="0" max="100" value="35" aria-label="ゲームの音量"></label>' +
      '<span class="visually-hidden" data-danmaku-audio-status role="status" aria-live="polite"></span>';
    view.querySelector(".danmaku-header").after(bar);
    var musicButton = bar.querySelector("[data-danmaku-music]");
    var effectsButton = bar.querySelector("[data-danmaku-sfx]");
    var volumeInput = bar.querySelector("input");
    var credit = bar.querySelector("a"),
      status = bar.querySelector("[role=status]");
    function canPlay() {
      return visible && !document.hidden && phase === "playing";
    }
    function update() {
      musicButton.textContent =
        "BGM：" + (musicError ? "再試行" : musicOn ? "入" : "切");
      effectsButton.textContent =
        "SE：" +
        (effectsError ? "再試行" : loading ? "…" : effectsOn ? "入" : "切");
      musicButton.setAttribute("aria-pressed", String(musicOn));
      effectsButton.setAttribute("aria-pressed", String(effectsOn));
      musicButton.title = musicError ? "BGM を再試行" : musicOn ? "BGM を切る" : "BGM を入れる";
      effectsButton.title = effectsError ? "効果音を再試行" : effectsOn ? "効果音を切る" : "効果音を入れる";
      effectsButton.setAttribute("aria-busy", String(loading));
      bar.dataset.music = musicOn ? "on" : "off";
      bar.dataset.sfx = effectsOn ? "on" : "off";
      var track = DanmakuScore.getTrack(enemy);
      credit.href = track.url;
      credit.title = track.title + " · " + track.author;
      credit.setAttribute(
        "aria-label",
        "BGM：" + track.title + " · " + track.author
      );
      volumeInput.setAttribute(
        "aria-valuetext",
        Math.round(volume * 100) + "%"
      );
    }
    function stopMusic() {
      musicEpoch++;
      playPending = false;
      musicPriming = false;
      cancelAnimationFrame(fadeFrame);
      if (music) {
        music.muted = true;
        music.pause();
      }
    }
    function cancelDownload() {
      if (!download) return;
      download.abort();
      download = null;
      status.textContent = "";
    }
    function releaseTrack() {
      cancelDownload();
      if (localTrack) URL.revokeObjectURL(localTrack);
      localTrack = "";
    }
    function trackPosition() {
      return timelineTime % DanmakuScore.getTrack(enemy).duration;
    }
    function seekMusic(tolerance) {
      var target = trackPosition();
      if (music.readyState < 1 || Math.abs(music.currentTime - target) <= tolerance)
        return;
      music.currentTime = target;
      lastTimelineSeek = performance.now();
    }
    function musicFailed(message) {
      musicError = true;
      stopMusic();
      update();
      status.textContent = message || "BGM を読み込めませんでした。再試行してください。";
    }
    function mediaFailed() {
      if (!musicOn || download || !music.error) return;
      // A streamed MP3 can fail only when the browser asks for a later byte
      // range. Fetch the complete recording once and seek within local bytes.
      if (music.error.code !== 2 || localTrack || !canPlay()) {
        musicFailed();
        return;
      }
      stopMusic();
      var request = new AbortController();
      download = request;
      status.textContent = "BGM を読み込み直しています。";
      fetch(DanmakuScore.getTrack(enemy).src, {
        cache: "no-store",
        signal: request.signal,
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Recording unavailable");
          return response.blob();
        })
        .then(function (blob) {
          if (download !== request) return;
          localTrack = URL.createObjectURL(blob);
          download = null;
          status.textContent = "";
          syncMusic();
        })
        .catch(function () {
          if (download !== request) return;
          download = null;
          musicFailed();
        });
    }
    function syncMusic(prime) {
      stopMusic();
      if (!musicOn || !canPlay() || download || (!timelineRunning && !prime)) {
        update();
        return;
      }
      if (!music) {
        music = document.createElement("audio");
        music.dataset.danmakuAudio = "";
        music.preload = "none";
        music.loop = false;
        view.appendChild(music);
        music.addEventListener("loadedmetadata", function () {
          if (musicOn && canPlay()) seekMusic(0.1);
        });
        music.addEventListener("error", mediaFailed);
        music.addEventListener("playing", function () {
          if (!musicOn || !canPlay() || (!timelineRunning && !musicPriming))
            stopMusic();
        });
      }
      var track = DanmakuScore.getTrack(enemy);
      var src = localTrack || new URL(track.src, location.href).href;
      if (music.src !== src || music.error || musicError) {
        music.src = src;
        music.load();
      }
      seekMusic(0.1);
      if (music.playbackRate !== 1) music.playbackRate = 1;
      musicError = false;
      music.muted = false;
      music.volume = 0;
      // Unlock this specific media element in the challenge/resume click, even
      // while the intro is silent. It must not depend on prior radio playback.
      musicPriming = !timelineRunning;
      var token = musicEpoch;
      playPending = true;
      nextResumeAt = performance.now() + 1200;
      music
        .play()
        .then(function () {
          if (token !== musicEpoch) return;
          playPending = musicPriming = false;
          if (!timelineRunning) {
            music.muted = true;
            music.pause();
            update();
            return;
          }
          if (!music.seeking) seekMusic(0.18);
          var start = performance.now();
          function fade(now) {
            if (token !== musicEpoch) return;
            var t = Math.max(0, Math.min(1, (now - start) / 240));
            music.volume = volume * 0.75 * t;
            if (t < 1) fadeFrame = requestAnimationFrame(fade);
          }
          fadeFrame = requestAnimationFrame(fade);
        })
        .catch(function (error) {
          if (token !== musicEpoch) return;
          playPending = musicPriming = false;
          if (error.name === "AbortError") return;
          if (music.error) mediaFailed();
          else musicFailed(error.name === "NotAllowedError" ? "BGM ボタンを押してください。" : "");
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
      compressor.attack.value = 0.004;
      compressor.release.value = 0.12;
      master.connect(compressor);
      compressor.connect(context.destination);
    }
    function load(name) {
      var file = samples[name][0];
      if (buffers[file]) return Promise.resolve();
      if (!pending[file]) {
        pending[file] = fetch(
          new URL(file + ".wav", new URL(base, location.href))
        )
          .then(function (response) {
            if (!response.ok) throw new Error("Sound unavailable");
            return response.arrayBuffer();
          })
          .then(function (bytes) {
            return context.decodeAudioData(bytes);
          })
          .then(function (buffer) {
            buffers[file] = buffer;
          })
          .finally(function () {
            delete pending[file];
          });
      }
      return pending[file];
    }
    function syncEffects() {
      if (!context) return;
      if (effectsOn && canPlay()) context.resume().catch(function () {});
      else {
        stopVoices(
          phase === "over" && effectsOn && visible && !document.hidden
        );
        // Let a final hit finish naturally; all other stop paths are immediate.
        if (!voices.length) context.suspend().catch(function () {});
      }
    }
    function play(name, player, voice) {
      // Mechanics report the action and actual weapon. A dropped or omitted
      // articulation uses the same character's basic cue.
      var action = name + "_" + player;
      if (samples[action]) {
        name = action;
        if (voice && samples[action + "_" + voice]) name += "_" + voice;
      }
      var sample = samples[name];
      if (
        !effectsOn ||
        !canPlay() ||
        !sample ||
        !context ||
        context.state !== "running" ||
        !buffers[sample[0]] ||
        !volume
      )
        return;
      var now = context.currentTime;
      if (lastSound[name] !== undefined && now - lastSound[name] < sample[2])
        return;
      lastSound[name] = now;
      // Bound polyphony; collision bursts cannot drown out spell or pickup cues.
      if (voices.length >= 12) {
        var disposable = voices.find(function (v) {
          return v.name.indexOf("shot_") === 0 || v.name === "hit" || v.name.indexOf("hit_") === 0;
        });
        if (!disposable) return;
        disposable.stop();
      }
      var source = context.createBufferSource(),
        gain = context.createGain();
      source.buffer = buffers[sample[0]];
      if (sample[3]) source.playbackRate.value = sample[3];
      gain.gain.value = sample[1];
      source.connect(gain);
      gain.connect(master);
      var ended = false;
      function cleanup() {
        if (ended) return;
        ended = true;
        source.disconnect();
        gain.disconnect();
        voices = voices.filter(function (v) {
          return v !== voice;
        });
        if (!voices.length && (!effectsOn || !canPlay()))
          context.suspend().catch(function () {});
      }
      var voice = {
        name: name,
        stop: function () {
          source.stop();
          cleanup();
        },
      };
      voices.push(voice);
      source.onended = cleanup;
      source.start();
    }
    musicButton.addEventListener("click", function () {
      musicOn = musicError || !musicOn;
      if (!musicOn) cancelDownload();
      if (musicError && music && music.error) releaseTrack();
      status.textContent = "";
      syncMusic(true);
    });
    function enableEffects() {
      effectsError = false;
      var token = ++effectsEpoch;
      status.textContent = "";
      if (!effectsOn) {
        loading = false;
        syncEffects();
        update();
        return;
      }
      try {
        ensureContext();
        loading = true;
        // Resume in the trusted click stack, including on mobile Safari.
        var unlocked = context.resume();
        // Finish the whole batch before exposing Retry. A second attempt must
        // never inherit still-failing requests from the first attempt.
        Promise.allSettled([unlocked].concat(Object.keys(samples).map(load)))
          .then(function (results) {
            if (token !== effectsEpoch) return;
            if (results.some(function (r) { return r.status === "rejected"; })) {
              effectsOn = false;
              effectsError = true;
              status.textContent =
                "効果音を読み込めませんでした。再試行してください。";
            }
            loading = false;
            syncEffects();
            update();
          });
      } catch (_) {
        effectsOn = false;
        loading = false;
        effectsError = true;
        status.textContent = "このブラウザーでは効果音を再生できません。";
      }
      update();
    }
    effectsButton.addEventListener("click", function () {
      effectsOn = !effectsOn;
      enableEffects();
    });
    volumeInput.addEventListener("input", function () {
      volume = Number(volumeInput.value) / 100;
      if (master)
        master.gain.setTargetAtTime(volume, context.currentTime, 0.015);
      cancelAnimationFrame(fadeFrame);
      if (music) music.volume = volume * 0.75;
      update();
    });
    update();
    return {
      play: play,
      syncTimeline: function (state) {
        timelineTime = state.time;
        var running =
          state.phase === "playing" &&
          state.countdown <= 0 &&
          !state.intermission;
        if (running !== timelineRunning) {
          timelineRunning = running;
          syncMusic();
        }
        if (!musicOn || !canPlay() || !running || !music || musicError || download || playPending)
          return;
        var now = performance.now();
        if (music.ended || music.paused) {
          // Score mode stops at the recording boundary. A Flower match can
          // continue into the next lap before its next round or countdown.
          if (music.ended && DanmakuScore.getTrack(enemy).duration - trackPosition() < 0.3)
            return;
          if (now >= nextResumeAt) syncMusic();
          return;
        }
        if (music.readyState < 2 || music.seeking) return;
        var drift = trackPosition() - music.currentTime;
        if (Math.abs(drift) > 0.85 && now - lastTimelineSeek >= 3000) {
          seekMusic(0.85);
          if (music.playbackRate !== 1) music.playbackRate = 1;
        } else if (now - lastRateCheck >= 250) {
          lastRateCheck = now;
          // Leave the audio clock alone inside the normal render jitter band.
          var rate = 1;
          if (Math.abs(drift) >= 0.09) {
            var correction = Math.round((1 + drift * 0.24) * 100) / 100;
            rate = Math.max(0.94, Math.min(1.06, correction));
          }
          if (music.playbackRate !== rate) music.playbackRate = rate;
        }
      },
      setScene: function (value, id, restart) {
        if ((id && id !== enemy) || value === "closed" || value === "lobby") releaseTrack();
        phase = value;
        if (value === "playing" && effectsOn && !context && !loading)
          enableEffects();
        if (value !== "playing" || restart) timelineRunning = false;
        if (id) enemy = id;
        if (restart) {
          timelineTime = 0;
          stopVoices(false);
        }
        syncMusic(value === "playing");
        syncEffects();
        update();
      },
      setVisible: function (value) {
        if (visible === value) return;
        visible = value;
        syncMusic();
        syncEffects();
      },
    };
  }
  window.DanmakuAudio = { create: create };
})();
