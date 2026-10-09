/* Locally rendered, explicitly opt-in Japanese voices. No service or API key. */
(function () {
  "use strict";
  var base = new URL(document.currentScript.dataset.voiceBase, location.href);
  var manifestUrl = new URL('manifest.json', base);
  manifestUrl.search = new URL(document.currentScript.src).search;
  function mount(root, hooks) {
    var enabled = false, visible = true, game = false, audio, manifest, pending;
    var busy = false, epoch = 0, frame = 0, loadTimer = 0, volume = .7, failed = false;
    var toolbar = document.createElement("div");
    toolbar.className = "vn-voice-toolbar";
    toolbar.innerHTML = '<button type="button" data-voice-toggle aria-pressed="false">声：切</button>' +
      '<button type="button" data-voice-replay disabled aria-label="台詞をもう一度聞く">↻</button>' +
      '<span class="visually-hidden" data-voice-status role="status" aria-live="polite"></span>';
    root.querySelector(".vn-nameplate").appendChild(toolbar);
    var settings = root.querySelector('[data-vn-panel="settings"]');
    settings.insertAdjacentHTML("beforeend", '<label for="vn-voice-volume">声の音量</label><input id="vn-voice-volume" data-voice-volume type="range" min="0" max="100" value="70">' +
      '<details class="vn-voice-credits"><summary>音声クレジット</summary><p>音声合成：VOICEVOX</p>' +
      '<p><a href="https://voicevox.hiroshiba.jp/product/shikoku_metan/" target="_blank" rel="noopener noreferrer">VOICEVOX:四国めたん</a>（アリス）</p>' +
      '<p><a href="https://voicevox.hiroshiba.jp/product/kasukabe_tsumugi/" target="_blank" rel="noopener noreferrer">VOICEVOX:春日部つむぎ</a>（魔理沙）</p>' +
      '<p><a href="https://voicevox.hiroshiba.jp/product/tohoku_kiritan/" target="_blank" rel="noopener noreferrer">VOICEVOX:東北きりたん</a>（パチュリー）</p></details>');
    var toggle = toolbar.querySelector('[data-voice-toggle]'), replay = toolbar.querySelector('[data-voice-replay]');
    var status = toolbar.querySelector('[data-voice-status]');
    function allowed() { return enabled && visible && !game && !document.hidden; }
    function update() {
      toggle.textContent = "声：" + (enabled ? "入" : "切");
      toggle.setAttribute("aria-pressed", String(enabled));
      toggle.setAttribute("aria-label", enabled ? "台詞の音声を切る" : "台詞の音声を入れる");
      replay.disabled = !enabled;
      root.dataset.voiceState = failed ? "error" : busy ? "speaking" : enabled ? "ready" : "off";
    }
    function stop() {
      epoch++; cancelAnimationFrame(frame); clearTimeout(loadTimer);
      if (audio) { audio.pause(); audio.muted = true; }
      busy = false;
      status.textContent = '';
      hooks.stopSpeaking();
      hooks.duck(false);
      update();
    }
    function fail() {
      stop(); failed = true; status.textContent = '↻ で再試行'; update(); hooks.settled();
    }
    function loadManifest() {
      if (manifest) return Promise.resolve(manifest);
      if (!pending) pending = fetch(manifestUrl).then(function (r) {
        if (!r.ok) throw new Error('Voice manifest unavailable');
        return r.json();
      }).then(function (value) { manifest = value; return value; }).finally(function () { pending = null; });
      return pending;
    }
    function ensureAudio() {
      if (audio) return;
      audio = document.createElement('audio');
      audio.preload = 'none';
      audio.dataset.companionVoice = '';
      root.appendChild(audio);
      audio.addEventListener('ended', function () { stop(); status.textContent = ''; hooks.settled(); });
      audio.addEventListener('waiting', function () { hooks.stopSpeaking(); });
      audio.addEventListener('error', function () { if (busy) fail(); });
    }
    function play(character, text) {
      stop(); failed = false; status.textContent = '';
      if (!allowed() || !text) return;
      ensureAudio();
      var token = epoch;
      busy = true; update(); status.textContent = '読込中…';
      loadTimer = setTimeout(function () { if (token === epoch) fail(); }, 12000);
      loadManifest().then(function (data) {
        if (token !== epoch || !allowed()) return;
        var line = data.lines[character] && data.lines[character][text];
        if (!line) throw new Error('No voice for this line');
        audio.src = new URL(line.src, base).href;
        audio.volume = volume; audio.muted = false;
        return audio.play().then(function () {
          if (token !== epoch || !allowed()) return;
          clearTimeout(loadTimer);
          status.textContent = '再生中'; hooks.duck(true);
          var cue = -1;
          function tick() {
            if (token !== epoch) return;
            if (!audio.paused && audio.readyState >= 3) {
              var time = audio.currentTime, next = -1;
              for (var i = 0; i < line.cues.length && line.cues[i][0] <= time; i++) next = i;
              if (next !== cue) {
                cue = next;
                var phone = line.cues[cue];
                if (phone && time < phone[0] + phone[1]) {
                  if (phone[2] === 'rest') hooks.stopSpeaking();
                  else hooks.speak('あ', Math.max(25, (phone[0] + phone[1] - time) * 1000), [phone[2]]);
                }
              }
            }
            frame = requestAnimationFrame(tick);
          }
          frame = requestAnimationFrame(tick);
        });
      }).catch(function () {
        if (token !== epoch) return;
        fail();
      });
    }
    toggle.addEventListener('click', function () {
      enabled = !enabled; failed = false;
      if (enabled) hooks.replay(); else { stop(); status.textContent = ''; hooks.settled(); }
      update();
    });
    replay.addEventListener('click', function () { if (enabled) hooks.replay(); });
    settings.querySelector('[data-voice-volume]').addEventListener('input', function (event) {
      volume = Number(event.target.value) / 100;
      if (audio) audio.volume = volume;
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
    document.addEventListener('site:before-content-replace', stop);
    window.addEventListener('pagehide', stop);
    update();
    return {
      play: play, stop: stop,
      isBusy: function () { return busy; },
      isEnabled: function () { return enabled; },
      setVisible: function (value) { visible = value; if (!value) stop(); },
      setGameActive: function (value) { game = value; if (value) stop(); },
    };
  }
  window.CompanionVoice = {mount: mount};
})();
