(function () {
  var decodeContext = null;
  var wavePeakCache = Object.create(null);
  var audioArrayBufferCache = Object.create(null);
  var embeddedCoverCache = Object.create(null);
  var createdCoverObjectUrls = [];

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
    if (isAbsoluteUrl(raw)) return encodeURI(raw);

    var cleaned = raw.replace(/^\/+/, "").replace(/^\.\//, "");
    return encodeURI(baseUrl + cleaned);
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

  function fetchAudioArrayBuffer(url) {
    if (!url) return Promise.reject(new Error("Missing audio URL"));
    if (audioArrayBufferCache[url]) return audioArrayBufferCache[url];

    audioArrayBufferCache[url] = fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error("Failed to fetch audio");
        return response.arrayBuffer();
      })
      .catch(function (error) {
        delete audioArrayBufferCache[url];
        throw error;
      });

    return audioArrayBufferCache[url];
  }

  function readSynchsafeInt(bytes, offset) {
    return (
      ((bytes[offset] & 0x7f) << 21) |
      ((bytes[offset + 1] & 0x7f) << 14) |
      ((bytes[offset + 2] & 0x7f) << 7) |
      (bytes[offset + 3] & 0x7f)
    );
  }

  function readUInt32BE(bytes, offset) {
    return (
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]
    ) >>> 0;
  }

  function bytesToAscii(bytes, start, count) {
    var chars = [];
    for (var i = 0; i < count && start + i < bytes.length; i++) {
      chars.push(String.fromCharCode(bytes[start + i]));
    }
    return chars.join("");
  }

  function findTextTerminator(bytes, start, encoding) {
    var i;
    if (encoding === 0 || encoding === 3) {
      for (i = start; i < bytes.length; i++) {
        if (bytes[i] === 0) return i;
      }
      return -1;
    }
    for (i = start; i + 1 < bytes.length; i++) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) return i;
    }
    return -1;
  }

  function formatToMime(format) {
    var value = (format || "").toUpperCase();
    if (value === "PNG") return "image/png";
    if (value === "GIF") return "image/gif";
    if (value === "JPG" || value === "JPEG") return "image/jpeg";
    return "image/jpeg";
  }

  function blobUrlFromImageBytes(imageBytes, mime) {
    if (!imageBytes || !imageBytes.length) return "";
    var type = mime && /^image\//i.test(mime) ? mime : "image/jpeg";
    var url = URL.createObjectURL(new Blob([imageBytes], { type: type }));
    createdCoverObjectUrls.push(url);
    return url;
  }

  function mimeFromImageHeader(bytes, offset) {
    var i = Number(offset) || 0;
    if (i + 2 < bytes.length && bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      return "image/jpeg";
    }
    if (
      i + 7 < bytes.length &&
      bytes[i] === 0x89 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x4e &&
      bytes[i + 3] === 0x47 &&
      bytes[i + 4] === 0x0d &&
      bytes[i + 5] === 0x0a &&
      bytes[i + 6] === 0x1a &&
      bytes[i + 7] === 0x0a
    ) {
      return "image/png";
    }
    if (
      i + 3 < bytes.length &&
      bytes[i] === 0x47 &&
      bytes[i + 1] === 0x49 &&
      bytes[i + 2] === 0x46 &&
      bytes[i + 3] === 0x38
    ) {
      return "image/gif";
    }
    return "";
  }

  function findImageHeaderOffset(bytes, start) {
    var from = Math.max(0, Number(start) || 0);
    for (var i = from; i < bytes.length - 8; i++) {
      if (mimeFromImageHeader(bytes, i)) return i;
    }
    return -1;
  }

  function parseApicFrame(frameBytes) {
    if (!frameBytes || frameBytes.length < 5) return "";
    var encoding = frameBytes[0];
    var cursor = 1;
    var mimeEnd = frameBytes.indexOf(0, cursor);
    if (mimeEnd < 0) return "";

    var mime = bytesToAscii(frameBytes, cursor, mimeEnd - cursor).toLowerCase();
    cursor = mimeEnd + 1;
    if (cursor >= frameBytes.length) return "";

    cursor += 1; // picture type
    if (cursor >= frameBytes.length) return "";

    var payloadStart = cursor;
    var descEnd = findTextTerminator(frameBytes, cursor, encoding);
    if (descEnd >= 0) {
      cursor = encoding === 0 || encoding === 3 ? descEnd + 1 : descEnd + 2;
      if (cursor < frameBytes.length) {
        return blobUrlFromImageBytes(frameBytes.subarray(cursor), mime);
      }
    }

    var imageOffset = findImageHeaderOffset(frameBytes, payloadStart);
    if (imageOffset >= 0) {
      var detectedMime = mimeFromImageHeader(frameBytes, imageOffset);
      return blobUrlFromImageBytes(frameBytes.subarray(imageOffset), detectedMime || mime);
    }

    return "";
  }

  function parsePicFrame(frameBytes) {
    if (!frameBytes || frameBytes.length < 7) return "";
    var encoding = frameBytes[0];
    var format = bytesToAscii(frameBytes, 1, 3);
    var cursor = 4;
    if (cursor >= frameBytes.length) return "";

    cursor += 1; // picture type
    if (cursor >= frameBytes.length) return "";

    var payloadStart = cursor;
    var descEnd = findTextTerminator(frameBytes, cursor, encoding);
    if (descEnd >= 0) {
      cursor = encoding === 0 || encoding === 3 ? descEnd + 1 : descEnd + 2;
      if (cursor < frameBytes.length) {
        return blobUrlFromImageBytes(frameBytes.subarray(cursor), formatToMime(format));
      }
    }

    var imageOffset = findImageHeaderOffset(frameBytes, payloadStart);
    if (imageOffset >= 0) {
      var detectedMime = mimeFromImageHeader(frameBytes, imageOffset);
      return blobUrlFromImageBytes(frameBytes.subarray(imageOffset), detectedMime || formatToMime(format));
    }

    return "";
  }

  function extractEmbeddedCoverUrl(arrayBuffer) {
    var bytes = new Uint8Array(arrayBuffer);
    if (bytes.length < 10) return "";
    if (bytesToAscii(bytes, 0, 3) !== "ID3") return "";

    var version = bytes[3];
    var tagSize = readSynchsafeInt(bytes, 6);
    var offset = 10;
    var end = Math.min(bytes.length, offset + tagSize);

    if (version === 2) {
      while (offset + 6 <= end) {
        var frameIdV2 = bytesToAscii(bytes, offset, 3);
        var frameSizeV2 = (bytes[offset + 3] << 16) | (bytes[offset + 4] << 8) | bytes[offset + 5];
        if (!frameIdV2.trim() || frameSizeV2 <= 0) break;

        var frameStartV2 = offset + 6;
        var frameEndV2 = Math.min(end, frameStartV2 + frameSizeV2);
        if (frameEndV2 <= frameStartV2) break;

        if (frameIdV2 === "PIC") {
          return parsePicFrame(bytes.subarray(frameStartV2, frameEndV2));
        }

        offset = frameStartV2 + frameSizeV2;
      }
      return "";
    }

    while (offset + 10 <= end) {
      var frameId = bytesToAscii(bytes, offset, 4);
      var frameSize = version === 4 ? readSynchsafeInt(bytes, offset + 4) : readUInt32BE(bytes, offset + 4);
      if (!frameId.trim() || frameSize <= 0) break;

      var frameStart = offset + 10;
      var frameEnd = Math.min(end, frameStart + frameSize);
      if (frameEnd <= frameStart) break;

      if (frameId === "APIC") {
        return parseApicFrame(bytes.subarray(frameStart, frameEnd));
      }

      offset = frameStart + frameSize;
    }

    return "";
  }

  function fetchTrackEmbeddedCover(track) {
    var key = track.streamUrl;
    if (!key) return Promise.reject(new Error("No stream URL"));
    if (Object.prototype.hasOwnProperty.call(embeddedCoverCache, key)) {
      if (embeddedCoverCache[key]) return Promise.resolve(embeddedCoverCache[key]);
      return Promise.reject(new Error("No embedded cover"));
    }

    return fetchAudioArrayBuffer(key)
      .then(function (arrayBuffer) {
        var coverUrl = extractEmbeddedCoverUrl(arrayBuffer);
        embeddedCoverCache[key] = coverUrl || "";
        if (!coverUrl) throw new Error("No embedded cover");
        return coverUrl;
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

  function normaliseWavePeaks(raw) {
    if (!raw) return [];

    var source = raw;
    if (typeof source === "string") {
      source = source.split(/[,\s]+/g);
    }
    if (!Array.isArray(source)) return [];

    var peaks = source
      .map(function (value) {
        var parsed = Number(value);
        if (!Number.isFinite(parsed)) return null;
        return clamp(parsed, 0.04, 0.99);
      })
      .filter(function (value) {
        return value != null;
      });

    return peaks;
  }

  function fallbackPeaks(key, count) {
    var random = seededRandom(hashString(key || "music-player"));
    var peaks = [];
    var level = 0.5;
    for (var i = 0; i < count; i++) {
      level += (random() - 0.5) * 0.34;
      level = clamp(level, 0.08, 0.95);
      var curveBase = Math.abs(Math.sin((i / Math.max(1, count - 1)) * Math.PI * (2 + random() * 2)));
      var curve = Math.pow(curveBase, 1.28);
      peaks.push(clamp(level * 0.42 + curve * 0.58, 0.04, 0.98));
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
      var contrasted = Math.pow(normalized, 1.28);
      var expanded = (contrasted - 0.04) / 0.96;
      peaks[k] = clamp(expanded, 0.04, 0.98);
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

    return fetchAudioArrayBuffer(key)
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
    var vgmdbTrackUrl = (track && (track.vgmdb_track_url || track.vgmdb_track || track.vgmdbTrackUrl || track.track_vgmdb_url)) || "";
    var vgmdbArtistUrl = (track && (track.vgmdb_artist_url || track.vgmdb_artist || track.vgmdbArtistUrl || track.artist_vgmdb_url)) || "";
    var vgmdbAlbumUrl = (track && (track.vgmdb_album_url || track.vgmdb_album || track.vgmdbAlbumUrl || track.album_vgmdb_url)) || "";
    var wavePeaks = track && (track.wave_peaks || track.wavePeaks || track.waveform_peaks);

    return {
      title: title,
      artist: artist,
      album: album,
      cover: resolveAssetUrl(cover, baseUrl),
      streamUrl: resolveAssetUrl(streamUrl, baseUrl),
      songUrl: resolveAssetUrl(songUrl, baseUrl),
      vgmdbTrackUrl: resolveAssetUrl(vgmdbTrackUrl, baseUrl),
      vgmdbArtistUrl: resolveAssetUrl(vgmdbArtistUrl, baseUrl),
      vgmdbAlbumUrl: resolveAssetUrl(vgmdbAlbumUrl, baseUrl),
      wavePeaks: normaliseWavePeaks(wavePeaks)
    };
  }

  function initPlayer(root) {
    if (root.getAttribute("data-music-player-bound") === "true") return;
    root.setAttribute("data-music-player-bound", "true");

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
    var body = root.querySelector(".music-player__body");
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
      waveRenderJob: 0,
      coverRenderJob: 0,
      coverSizeFrame: 0
    };

    function setStatus(message, level) {
      status.textContent = message || "";
      status.dataset.level = level || "info";
      status.hidden = !message;
      scheduleCoverSizeSync();
    }

    function syncCoverSize() {
      if (!cover) return;
      var basisHeight = (body && body.clientHeight) || root.clientHeight || 0;
      if (!basisHeight) return;

      var size = Math.round(basisHeight * 0.8);
      size = Math.max(44, size);
      cover.style.width = size + "px";
      cover.style.height = size + "px";
    }

    function scheduleCoverSizeSync() {
      if (state.coverSizeFrame) {
        window.cancelAnimationFrame(state.coverSizeFrame);
      }
      state.coverSizeFrame = window.requestAnimationFrame(function () {
        state.coverSizeFrame = 0;
        syncCoverSize();
      });
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
        bar.style.height = String(Math.round(clamp(heights[i], 0.04, 0.98) * 100)) + "%";
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
      if (track.wavePeaks && track.wavePeaks.length) {
        renderWaveBars(resamplePeaks(track.wavePeaks, count));
        return;
      }

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

    function createMetaNode(textValue, hrefValue) {
      var text = String(textValue || "");
      if (!hrefValue) {
        var plainText = document.createElement("span");
        plainText.className = "music-player__meta-link";
        plainText.textContent = text;
        return plainText;
      }

      var link = document.createElement("a");
      link.className = "music-player__meta-link music-player__meta-link--clickable";
      link.href = hrefValue;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = text;
      return link;
    }

    function renderTrackMeta(track) {
      title.textContent = track.title;

      artist.textContent = "";
      artist.appendChild(createMetaNode(track.artist, track.vgmdbArtistUrl));
      if (track.album) {
        artist.appendChild(document.createTextNode(" | "));
        artist.appendChild(createMetaNode(track.album, track.vgmdbAlbumUrl));
      }
    }

    function updateCover(track) {
      var coverJobId = ++state.coverRenderJob;
      if (!track.cover) {
        cover.removeAttribute("src");
        cover.setAttribute("data-empty", "true");
        fetchTrackEmbeddedCover(track)
          .then(function (embeddedCoverUrl) {
            if (coverJobId !== state.coverRenderJob) return;
            cover.src = embeddedCoverUrl;
            cover.removeAttribute("data-empty");
            scheduleCoverSizeSync();
          })
          .catch(function () {
            if (coverJobId !== state.coverRenderJob) return;
            cover.removeAttribute("src");
            cover.setAttribute("data-empty", "true");
            scheduleCoverSizeSync();
          });
        return;
      }
      cover.src = track.cover;
      cover.removeAttribute("data-empty");
      scheduleCoverSizeSync();
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

      renderTrackMeta(track);
      cover.alt = track.title + " cover";
      updateCover(track);
      updateSongLink(track);
      currentTime.textContent = "0:00";
      totalTime.textContent = "0:00";
      setStatus("");
      renderStaticWave(track);
      scheduleCoverSizeSync();

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

    function playRandomTrack() {
      var nextIndex = randomIndex(playlist.length, state.index);
      loadTrack(nextIndex, false);
    }

    if (randomButton) {
      randomButton.addEventListener("click", function () {
        playRandomTrack();
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
      scheduleCoverSizeSync();
    });

    audio.addEventListener("timeupdate", function () {
      if (!Number.isFinite(audio.duration)) return;
      if (!state.isSeeking && !state.isDragging) {
        currentTime.textContent = formatTime(audio.currentTime);
        setWaveProgress(ratioFromCurrentTime());
      }
    });

    audio.addEventListener("ended", function () {
      playRandomTrack();
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
      scheduleCoverSizeSync();
    });

    audio.volume = Number(volume.value);
    state.index = randomIndex(playlist.length, -1);
    loadTrack(state.index, false);
  }

  function boot() {
    var players = document.querySelectorAll("[data-music-player]");
    Array.prototype.forEach.call(players, initPlayer);
  }

  window.addEventListener("beforeunload", function () {
    while (createdCoverObjectUrls.length) {
      URL.revokeObjectURL(createdCoverObjectUrls.pop());
    }
  });

  window.__siteInitMusicPlayers = boot;

  document.addEventListener("site:content-updated", boot);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
