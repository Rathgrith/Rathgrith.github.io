(function () {
  var decodeContext = null;
  var wavePeakCache = Object.create(null);

  function isAbsoluteUrl(value) {
    return /^[a-z][a-z0-9+.-]*:/i.test(value) || /^\/\//.test(value);
  }

  function normaliseBaseUrl(root) {
    var raw = (root.getAttribute("data-music-baseurl") || "/").trim();
    if (!raw) return "/";
    var base = raw.charAt(0) === "/" ? raw : "/" + raw;
    return base.charAt(base.length - 1) === "/" ? base : base + "/";
  }

  function resolveAssetUrl(value, baseUrl) {
    if (!value) return "";
    var raw = String(value).trim();
    if (!raw) return "";
    if (isAbsoluteUrl(raw)) return raw;

    var cleaned = raw.replace(/^\/+/, "").replace(/^\.\//, "");
    return baseUrl + cleaned;
  }

  function parsePlaylist(root) {
    var source = root.querySelector("[data-music-playlist]");
    if (!source) return [];

    try {
      var data = JSON.parse(source.textContent);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    var total = Math.floor(seconds);
    var mins = Math.floor(total / 60);
    var secs = total % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  function randomIndex(length, exclude) {
    if (!Number.isFinite(length) || length <= 0) return 0;
    if (length === 1) return 0;

    var picked = Math.floor(Math.random() * length);
    while (picked === exclude) {
      picked = Math.floor(Math.random() * length);
    }
    return picked;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hashString(value) {
    var hash = 2166136261;
    for (var i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    var state = seed >>> 0;
    if (!state) state = 1;
    return function () {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function decodeAudioBuffer(context, arrayBuffer) {
    var cloned = arrayBuffer.slice(0);
    var possiblePromise = context.decodeAudioData(cloned);
    if (possiblePromise && typeof possiblePromise.then === "function") {
      return possiblePromise;
    }
    return new Promise(function (resolve, reject) {
      context.decodeAudioData(cloned, resolve, reject);
    });
  }

  function resamplePeaks(source, count) {
    if (!Array.isArray(source) || !source.length || count <= 0) {
      return [];
    }
    if (source.length === count) {
      return source.slice();
    }
    var result = [];
    for (var i = 0; i < count; i++) {
      var start = Math.floor((i * source.length) / count);
      var end = Math.floor(((i + 1) * source.length) / count);
      if (end <= start) end = start + 1;
      var sum = 0;
      var n = 0;
      for (var j = start; j < end && j < source.length; j++) {
        sum += source[j];
        n += 1;
      }
      result.push(n ? sum / n : 0.12);
    }
    return result;
  }

  function fallbackPeaks(key, count) {
    var random = seededRandom(hashString(key || "music-player"));
    var peaks = [];
    var level = 0.46;
    for (var i = 0; i < count; i++) {
      level += (random() - 0.5) * 0.26;
      level = clamp(level, 0.12, 0.92);
      var curve = Math.abs(Math.sin((i / Math.max(1, count - 1)) * Math.PI * (2 + random() * 2)));
      peaks.push(clamp(level * 0.62 + curve * 0.38, 0.12, 0.96));
    }
    return peaks;
  }

  function extractStaticPeaks(buffer, count) {
    var channels = Math.max(1, buffer.numberOfChannels || 1);
    var channelData = [];
    for (var c = 0; c < channels; c++) {
      channelData.push(buffer.getChannelData(c));
    }

    var length = channelData[0].length;
    if (!length) return fallbackPeaks("empty", count);

    var peaks = [];
    for (var i = 0; i < count; i++) {
      var start = Math.floor((i * length) / count);
      var end = Math.floor(((i + 1) * length) / count);
      if (end <= start) end = start + 1;
      var stride = Math.max(1, Math.floor((end - start) / 220));
      var localMax = 0;
      for (var s = start; s < end; s += stride) {
        var sample = 0;
        for (var ch = 0; ch < channels; ch++) {
          sample += Math.abs(channelData[ch][s] || 0);
        }
        sample /= channels;
        if (sample > localMax) localMax = sample;
      }
      peaks.push(localMax);
    }

    var maxPeak = 0;
    for (var p = 0; p < peaks.length; p++) {
      if (peaks[p] > maxPeak) maxPeak = peaks[p];
    }
    if (!maxPeak) return fallbackPeaks("silent", count);

    for (var k = 0; k < peaks.length; k++) {
      var normalized = peaks[k] / maxPeak;
      peaks[k] = clamp(Math.pow(normalized, 0.72), 0.12, 0.96);
    }
    return peaks;
  }

  function fetchTrackPeaks(track) {
    var key = track.streamUrl;
    if (!key) return Promise.reject(new Error("No stream URL"));
    if (wavePeakCache[key]) return Promise.resolve(wavePeakCache[key]);
    if (!window.AudioContext && !window.webkitAudioContext) {
      return Promise.reject(new Error("AudioContext unavailable"));
    }

    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!decodeContext) {
      decodeContext = new Ctx();
    }

    return fetch(key)
      .then(function (response) {
        if (!response.ok) throw new Error("Failed to fetch audio");
        return response.arrayBuffer();
      })
      .then(function (arrayBuffer) {
        return decodeAudioBuffer(decodeContext, arrayBuffer);
      })
      .then(function (audioBuffer) {
        var peaks = extractStaticPeaks(audioBuffer, 256);
        wavePeakCache[key] = peaks;
        return peaks;
      });
  }

  function normaliseTrack(track, index, baseUrl) {
    var title = (track && track.title) || "Track " + (index + 1);
    var artist = (track && track.artist) || "Unknown artist";
    var album = (track && track.album) || "";
    var cover = (track && (track.cover || track.cover_url || track.local_cover)) || "";
    var streamUrl = (track && (track.stream_url || track.audio_url || track.local_audio || track.url || track.src)) || "";
    var songUrl = (track && (track.song_url || track.source_url || track.link)) || "";

    return {
      title: title,
      artist: artist,
      album: album,
      cover: resolveAssetUrl(cover, baseUrl),
      streamUrl: resolveAssetUrl(streamUrl, baseUrl),
      songUrl: resolveAssetUrl(songUrl, baseUrl)
    };
  }

  function initPlayer(root) {
    var baseUrl = normaliseBaseUrl(root);
    var playlist = parsePlaylist(root)
      .map(function (track, index) {
        return normaliseTrack(track, index, baseUrl);
      })
      .filter(function (track) {
        return Boolean(track.streamUrl);
      });
    if (!playlist.length) return;

    var audio = root.querySelector("[data-music-audio]");
    var cover = root.querySelector("[data-music-cover]");
    var title = root.querySelector("[data-music-title]");
    var artist = root.querySelector("[data-music-artist]");
    var status = root.querySelector("[data-music-status]");
    var scrub = root.querySelector("[data-music-scrub]");
    var wave = root.querySelector("[data-music-wave]");
    var currentTime = root.querySelector("[data-music-time-current]");
    var totalTime = root.querySelector("[data-music-time-total]");
    var volume = root.querySelector("[data-music-volume]");
    var toggle = root.querySelector("[data-music-action=\"toggle\"]");
    var toggleIcon = root.querySelector("[data-music-toggle-icon]");
    var toggleText = root.querySelector("[data-music-toggle-text]");
    var randomButton = root.querySelector("[data-music-action=\"random\"]");
    var songLink = root.querySelector("[data-music-song-link]");

    var state = {
      index: 0,
      isSeeking: false,
      isDragging: false,
      waveBars: [],
      waveRenderJob: 0
    };

    function setStatus(message, level) {
      status.textContent = message || "";
      status.dataset.level = level || "info";
      status.hidden = !message;
    }

    function ratioFromCurrentTime() {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return 0;
      return clamp(audio.currentTime / audio.duration, 0, 1);
    }

    function updateScrubA11y(ratio) {
      scrub.setAttribute("aria-valuenow", String(Math.round(clamp(ratio, 0, 1) * 100)));
      scrub.setAttribute("aria-valuetext", currentTime.textContent + " / " + totalTime.textContent);
    }

    function waveBarCount() {
      var width = wave.clientWidth || scrub.clientWidth || 320;
      return Math.max(48, Math.min(140, Math.floor(width / 4)));
    }

    function setWaveProgress(ratio) {
      if (!state.waveBars.length) return;
      var progress = clamp(Number(ratio) || 0, 0, 1);
      var activeCount = Math.round(state.waveBars.length * progress);
      for (var i = 0; i < state.waveBars.length; i++) {
        state.waveBars[i].classList.toggle("is-played", i < activeCount);
      }
      updateScrubA11y(progress);
    }

    function renderWaveBars(heights) {
      var fragment = document.createDocumentFragment();
      var bars = [];
      for (var i = 0; i < heights.length; i++) {
        var bar = document.createElement("span");
        bar.className = "music-player__wave-bar";
        bar.style.height = String(Math.round(clamp(heights[i], 0.12, 0.96) * 100)) + "%";
        fragment.appendChild(bar);
        bars.push(bar);
      }
      wave.textContent = "";
      wave.appendChild(fragment);
      state.waveBars = bars;
      setWaveProgress(ratioFromCurrentTime());
    }

    function renderStaticWave(track) {
      var count = waveBarCount();
      var baseKey = [track.streamUrl, track.title, track.artist, track.album].join("|");
      var fallback = fallbackPeaks(baseKey, count);
      renderWaveBars(fallback);

      var jobId = ++state.waveRenderJob;
      fetchTrackPeaks(track)
        .then(function (peaks256) {
          if (jobId !== state.waveRenderJob) return;
          var resampled = resamplePeaks(peaks256, count);
          renderWaveBars(resampled);
        })
        .catch(function () {
          if (jobId !== state.waveRenderJob) return;
          renderWaveBars(fallback);
        });
    }

    function updateToggleState() {
      var isPaused = audio.paused;
      var ariaLabel = isPaused ? "Play" : "Pause";
      if (toggleIcon) {
        toggleIcon.classList.remove("fa-play", "fa-pause");
        toggleIcon.classList.add(isPaused ? "fa-play" : "fa-pause");
      }
      if (toggleText) {
        toggleText.textContent = ariaLabel;
      }
      toggle.setAttribute("aria-label", ariaLabel);
    }

    function updateSongLink(track) {
      if (!track.songUrl) {
        songLink.hidden = true;
        songLink.removeAttribute("href");
        return;
      }
      songLink.href = track.songUrl;
      songLink.hidden = false;
    }

    function updateCover(track) {
      if (!track.cover) {
        cover.removeAttribute("src");
        cover.setAttribute("data-empty", "true");
        return;
      }
      cover.src = track.cover;
      cover.removeAttribute("data-empty");
    }

    function seekToRatio(ratio) {
      var progress = clamp(ratio, 0, 1);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = progress * audio.duration;
      }
      currentTime.textContent = Number.isFinite(audio.duration)
        ? formatTime((audio.duration || 0) * progress)
        : formatTime(0);
      setWaveProgress(progress);
    }

    function ratioFromPointer(event) {
      var rect = scrub.getBoundingClientRect();
      if (!rect.width) return 0;
      var x = clamp(event.clientX - rect.left, 0, rect.width);
      return x / rect.width;
    }

    function loadTrack(index, autoplay) {
      var bounded = ((index % playlist.length) + playlist.length) % playlist.length;
      state.index = bounded;
      var track = playlist[bounded];

      audio.src = track.streamUrl;
      audio.load();

      title.textContent = track.title;
      artist.textContent = track.album ? track.artist + " | " + track.album : track.artist;
      cover.alt = track.title + " cover";
      updateCover(track);
      updateSongLink(track);
      currentTime.textContent = "0:00";
      totalTime.textContent = "0:00";
      setStatus("");
      renderStaticWave(track);

      if (autoplay) {
        var promise = audio.play();
        if (promise && typeof promise.catch === "function") {
          promise.catch(function () {
            setStatus("Tap play to start audio.", "warn");
            updateToggleState();
          });
        }
      } else {
        updateToggleState();
      }
    }

    function playRandomTrack(autoplay) {
      var nextIndex = randomIndex(playlist.length, state.index);
      loadTrack(nextIndex, autoplay);
    }

    if (randomButton) {
      randomButton.addEventListener("click", function () {
        playRandomTrack(true);
      });
    }

    toggle.addEventListener("click", function () {
      if (audio.paused) {
        var promise = audio.play();
        if (promise && typeof promise.catch === "function") {
          promise.catch(function () {
            setStatus("Unable to autoplay. Try another track.", "error");
          });
        }
      } else {
        audio.pause();
      }
    });

    scrub.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      state.isDragging = true;
      state.isSeeking = true;
      scrub.classList.add("is-seeking");
      scrub.setPointerCapture(event.pointerId);
      seekToRatio(ratioFromPointer(event));
    });

    scrub.addEventListener("pointermove", function (event) {
      if (!state.isDragging) return;
      seekToRatio(ratioFromPointer(event));
    });

    function endPointerSeek(event) {
      if (!state.isDragging) return;
      state.isDragging = false;
      state.isSeeking = false;
      scrub.classList.remove("is-seeking");
      if (event && scrub.hasPointerCapture(event.pointerId)) {
        scrub.releasePointerCapture(event.pointerId);
      }
      setWaveProgress(ratioFromCurrentTime());
    }

    scrub.addEventListener("pointerup", endPointerSeek);
    scrub.addEventListener("pointercancel", endPointerSeek);
    scrub.addEventListener("lostpointercapture", function () {
      state.isDragging = false;
      state.isSeeking = false;
      scrub.classList.remove("is-seeking");
    });

    scrub.addEventListener("keydown", function (event) {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      var seconds = event.shiftKey ? 10 : 5;
      var nextTime = audio.currentTime;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        nextTime += seconds;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        nextTime -= seconds;
      } else if (event.key === "Home") {
        nextTime = 0;
      } else if (event.key === "End") {
        nextTime = audio.duration;
      } else {
        return;
      }
      event.preventDefault();
      audio.currentTime = clamp(nextTime, 0, audio.duration);
      setWaveProgress(ratioFromCurrentTime());
    });

    audio.addEventListener("play", function () {
      updateToggleState();
      setStatus("");
    });

    audio.addEventListener("pause", function () {
      updateToggleState();
    });

    audio.addEventListener("loadedmetadata", function () {
      if (Number.isFinite(audio.duration)) {
        totalTime.textContent = formatTime(audio.duration);
      }
      setWaveProgress(ratioFromCurrentTime());
    });

    audio.addEventListener("timeupdate", function () {
      if (!Number.isFinite(audio.duration)) return;
      if (!state.isSeeking && !state.isDragging) {
        currentTime.textContent = formatTime(audio.currentTime);
        setWaveProgress(ratioFromCurrentTime());
      }
    });

    audio.addEventListener("ended", function () {
      playRandomTrack(true);
    });

    audio.addEventListener("error", function () {
      setStatus("Track failed to load. Check local path or source URL.", "error");
    });

    volume.addEventListener("input", function () {
      audio.volume = Number(volume.value);
    });

    window.addEventListener("resize", function () {
      var track = playlist[state.index];
      if (!track) return;
      renderStaticWave(track);
    });

    audio.volume = Number(volume.value);
    state.index = randomIndex(playlist.length, -1);
    loadTrack(state.index, false);
  }

  function boot() {
    var players = document.querySelectorAll("[data-music-player]");
    Array.prototype.forEach.call(players, initPlayer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
