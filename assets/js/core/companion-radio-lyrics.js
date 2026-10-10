/* Bundled same-origin lyrics with optional browser-local overrides. Imported files never leave the device. */
(function (global) {
  "use strict";
  var FILE_LIMIT = 200 * 1024,
    STORE_LIMIT = 100 * 1024;
  var STORE_KEY = "site-companion-radio-lrc-v1";
  function bytes(text) {
    return new TextEncoder().encode(text).length;
  }
  function parse(text) {
    if (typeof text !== "string") throw new TypeError("LRC must be text");
    if (bytes(text) > FILE_LIMIT) throw new RangeError("LRC exceeds 200 KB");
    var lines = [],
      offset = 0;
    text = text.replace(/^\uFEFF/, "");
    text.split(/\r?\n|\r/).forEach(function (row) {
      var meta = /^\s*\[offset:\s*([+-]?\d+)\s*\]\s*$/i.exec(row);
      if (meta) {
        offset = Math.max(-3600000, Math.min(3600000, Number(meta[1])));
        return;
      }
      var times = [],
        pattern = /\[(\d{1,4}):([0-5]?\d)(?:[.:](\d{1,3}))?\]/g;
      var lyric = row
        .replace(pattern, function (_, minutes, seconds, fraction) {
          times.push(
            Number(minutes) * 60 +
              Number(seconds) +
              Number((fraction || "").padEnd(3, "0")) / 1000
          );
          return "";
        })
        .trim();
      if (!lyric || !times.length) return;
      // Untimed headers are ignored; lyric content remains plain text, never HTML.
      times.forEach(function (time) {
        lines.push({ time: time, text: lyric });
      });
    });
    lines.sort(function (a, b) {
      return a.time - b.time;
    });
    var merged = [];
    lines.forEach(function (line) {
      // Positive LRC offset advances the lyric display, per the LRC convention.
      var time = Math.max(0, line.time - offset / 1000),
        last = merged[merged.length - 1];
      if (last && last.time === time) {
        if (last.text.split("\n").indexOf(line.text) === -1)
          last.text += "\n" + line.text;
      } else merged.push({ time: time, text: line.text });
    });
    return { lines: merged, offset: offset };
  }
  function indexAt(lines, time) {
    var lo = 0,
      hi = lines.length;
    while (lo < hi) {
      var mid = (lo + hi) >>> 1;
      if (lines[mid].time <= time) lo = mid + 1;
      else hi = mid;
    }
    return lo - 1;
  }
  function mount(container, preview) {
    if (!container || !container.ownerDocument)
      throw new TypeError("A lyrics container is required");
    if (container._companionRadioLyrics) return container._companionRadioLyrics;
    var document = container.ownerDocument,
      records = Object.create(null);
    var track = "",
      source = "",
      lines = [],
      delay = 0,
      time = 0,
      shown = -2,
      generation = 0;
    var destroyed = false,
      picker = null,
      pending = null,
      loadState = "empty";
    try {
      var raw = global.localStorage.getItem(STORE_KEY);
      var stored = raw && bytes(raw) <= STORE_LIMIT ? JSON.parse(raw) : null;
      if (
        stored &&
        stored.version === 1 &&
        stored.tracks &&
        typeof stored.tracks === "object"
      ) {
        Object.keys(stored.tracks).forEach(function (id) {
          var entry = stored.tracks[id];
          if (!entry) return;
          var imported = typeof entry.lrc === "string";
          if (
            imported
              ? bytes(entry.lrc) > FILE_LIMIT
              : !Number.isFinite(entry.delay)
          )
            return;
          records[id] = {
            delay: Number.isFinite(entry.delay)
              ? Math.max(-30, Math.min(30, entry.delay))
              : 0,
            saved: Number.isFinite(entry.saved) ? entry.saved : 0,
          };
          if (imported) records[id].lrc = entry.lrc;
        });
      }
    } catch (_) {}
    var panel = document.createElement("section");
    panel.className = "vn-radio-lyrics";
    panel.setAttribute("aria-label", "同期歌詞");
    panel.innerHTML =
      '<div class="vn-radio-lyrics-header"><span>歌詞</span>' +
      '<button type="button" data-lyrics-open>LRCを開く</button><input type="file" accept=".lrc,text/plain" data-lyrics-file hidden></div>' +
      '<div class="vn-radio-lyrics-lines"><p class="vn-radio-lyrics-previous" data-lyrics-previous aria-hidden="true"></p>' +
      '<p class="vn-radio-lyrics-current" data-lyrics-current role="status" aria-live="polite" aria-atomic="true">歌詞は未登録</p>' +
      '<p class="vn-radio-lyrics-next" data-lyrics-next aria-hidden="true"></p></div>' +
      '<div class="vn-radio-lyrics-timing" data-lyrics-timing hidden><button type="button" data-lyrics-earlier aria-label="歌詞を0.5秒早める">−0.5秒</button>' +
      '<output data-lyrics-offset aria-label="歌詞の表示補正">±0.0秒</output>' +
      '<button type="button" data-lyrics-later aria-label="歌詞を0.5秒遅らせる">＋0.5秒</button>' +
      '<button type="button" data-lyrics-reset aria-label="表示補正をリセット">戻す</button></div>' +
      '<p class="vn-radio-lyrics-status" data-lyrics-status role="status" aria-live="polite"></p>';
    container.appendChild(panel);
    function get(name) {
      return panel.querySelector("[data-lyrics-" + name + "]");
    }
    var current = get("current"),
      previous = get("previous"),
      next = get("next");
    var open = get("open"),
      file = get("file"),
      status = get("status");
    function render() {
      if (destroyed) return;
      var index = indexAt(lines, time - delay);
      if (index !== shown) {
        shown = index;
        current.textContent = lines.length
          ? index < 0
            ? "♪"
            : lines[index].text
          : "歌詞は未登録";
        if (lines.length && index < 0)
          current.setAttribute("aria-label", "前奏");
        else current.removeAttribute("aria-label");
        previous.textContent = index > 0 ? lines[index - 1].text : "";
        next.textContent = lines[index + 1] ? lines[index + 1].text : "";
      }
      get("timing").hidden = !lines.length;
      get("offset").textContent =
        (delay === 0 ? "±" : delay > 0 ? "＋" : "−") +
        Math.abs(delay).toFixed(1) +
        "秒";
      get("earlier").disabled = delay <= -30;
      get("later").disabled = delay >= 30;
      get("reset").disabled = delay === 0;
      open.disabled = !track;
      panel.dataset.lyricsState = lines.length ? "ready" : "empty";
      // The deck and full receiver use the same parsed LRC, offset and clock.
      // Keep the deck current even while the receiver is closed.
      if (preview) {
        var text = lines.length
          ? index < 0
            ? "♪ 前奏"
            : lines[index].text || "♪ 間奏"
          : loadState === "loading"
            ? "歌詞を読み込み中…"
            : loadState === "error"
              ? "歌詞を読み込めません"
              : "歌詞は未登録";
        if (preview.textContent !== text) {
          preview.textContent = text;
          preview.title = text;
        }
        preview.dataset.lyricsState = loadState;
      }
    }
    function persist() {
      var saved = Object.create(null);
      Object.keys(records)
        .sort(function (a, b) {
          return records[b].saved - records[a].saved;
        })
        .forEach(function (id) {
          saved[id] = records[id];
          if (
            bytes(JSON.stringify({ version: 1, tracks: saved })) > STORE_LIMIT
          )
            delete saved[id];
        });
      try {
        global.localStorage.setItem(
          STORE_KEY,
          JSON.stringify({ version: 1, tracks: saved })
        );
        return Object.prototype.hasOwnProperty.call(saved, track);
      } catch (_) {
        return false;
      }
    }
    function sourceURL(value) {
      if (typeof value !== "string" || !value.trim()) return "";
      try {
        var url = new URL(value, document.baseURI);
        if (
          !/^https?:$/.test(url.protocol) ||
          url.origin !== document.location.origin ||
          url.username ||
          url.password
        )
          return "";
        url.hash = "";
        return url.href;
      } catch (_) {
        return "";
      }
    }
    function abortPending() {
      if (pending) pending.abort();
      pending = null;
    }
    async function loadBundled(url, token) {
      var request = (pending = new AbortController());
      status.textContent = "歌詞を読み込み中…";
      try {
        var response = await global.fetch(url, {
          signal: request.signal,
          mode: "same-origin",
          redirect: "error",
        });
        if (
          !response.ok ||
          Number(response.headers.get("Content-Length")) > FILE_LIMIT ||
          !response.body
        )
          throw new Error("Invalid lyrics response");
        var reader = response.body.getReader(),
          decoder = new TextDecoder("utf-8", { fatal: true }),
          size = 0,
          text = "";
        try {
          while (true) {
            var chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > FILE_LIMIT) throw new RangeError("LRC exceeds 200 KB");
            text += decoder.decode(chunk.value, { stream: true });
          }
          text += decoder.decode();
        } finally {
          reader.releaseLock();
        }
        var parsed = parse(text);
        if (destroyed || token !== generation || url !== source) return;
        if (!parsed.lines.length) throw new Error("No timed lyrics");
        lines = parsed.lines;
        loadState = "ready";
        shown = -2;
        status.textContent = "";
        render();
      } catch (_) {
        request.abort();
        if (!destroyed && token === generation && url === source) {
          loadState = "error";
          status.textContent =
            "歌詞を読み込めませんでした。LRCファイルを選ぶこともできます。";
          render();
        }
      } finally {
        if (pending === request) pending = null;
      }
    }
    function setTrack(id, sourceUrl) {
      if (destroyed) return;
      id = typeof id === "string" ? id.slice(0, 200) : "";
      var nextSource = id ? sourceURL(sourceUrl) : "";
      if (id === track && nextSource === source) return;
      generation++;
      abortPending();
      track = id;
      source = nextSource;
      time = 0;
      var record = records[track];
      var imported = record && typeof record.lrc === "string";
      lines = imported ? parse(record.lrc).lines : [];
      loadState = lines.length
        ? "ready"
        : source && !imported
          ? "loading"
          : "empty";
      delay = record ? record.delay : 0;
      shown = -2;
      status.textContent = "";
      file.value = "";
      render();
      if (source && !imported) loadBundled(source, generation);
    }
    function adjust(amount) {
      if (!lines.length) return;
      if (!records[track]) records[track] = {};
      delay = Math.max(-30, Math.min(30, amount));
      records[track].delay = delay;
      records[track].saved = Date.now();
      persist();
      render();
    }
    open.addEventListener("click", function () {
      if (destroyed || !track) return;
      // The radio can advance while the native file picker remains open.
      picker = { track: track, generation: generation };
      file.click();
    });
    file.addEventListener("cancel", function () {
      picker = null;
    });
    file.addEventListener("change", async function () {
      var selected = file.files && file.files[0],
        selection = picker;
      picker = null;
      file.value = "";
      if (destroyed || !selected || !track) return;
      if (
        selection &&
        (selection.track !== track || selection.generation !== generation)
      ) {
        status.textContent =
          "曲が切り替わりました。LRCファイルを選び直してください。";
        return;
      }
      if (selected.size > FILE_LIMIT) {
        status.textContent = "200KB以内のLRCファイルを選んでください。";
        return;
      }
      var target = selection ? selection.track : track,
        token = ++generation;
      abortPending();
      try {
        var buffer = await selected.arrayBuffer();
        var text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
        var parsed = parse(text);
        if (destroyed || token !== generation || target !== track) return;
        if (!parsed.lines.length) {
          status.textContent = "時刻付きの歌詞が見つかりませんでした。";
          return;
        }
        records[target] = { lrc: text, delay: 0, saved: Date.now() };
        lines = parsed.lines;
        loadState = "ready";
        delay = 0;
        shown = -2;
        status.textContent = persist()
          ? "このブラウザに保存しました。"
          : "このタブ内で読み込みました。";
        render();
      } catch (_) {
        if (!destroyed && token === generation && target === track)
          status.textContent = "UTF-8形式のLRCファイルを選んでください。";
      }
    });
    get("earlier").addEventListener("click", function () {
      adjust(delay - 0.5);
    });
    get("later").addEventListener("click", function () {
      adjust(delay + 0.5);
    });
    get("reset").addEventListener("click", function () {
      adjust(0);
    });
    var controller = {
      root: panel,
      setTrack: setTrack,
      setTime: function (seconds) {
        time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
        render();
      },
      destroy: function () {
        destroyed = true;
        generation++;
        abortPending();
        panel.remove();
        delete container._companionRadioLyrics;
      },
    };
    container._companionRadioLyrics = controller;
    render();
    return controller;
  }
  var api = { mount: mount, parse: parse, indexAt: indexAt };
  global.CompanionRadioLyrics = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
