/* Short recorded interjections, independent of text and its mouth animation. */
(function () {
  "use strict";
  var base = new URL(document.currentScript.dataset.audioBase, location.href);
  var manifestUrl = new URL("manifest.json", base);
  manifestUrl.search = new URL(document.currentScript.src).search;

  function moodFor(line) {
    var effects = { question: "curious", idea: "curious", surprise: "surprise",
      blush: "warm", music: "warm", sparkle: "warm", anger: "hmm", sigh: "sigh", sweat: "sigh" };
    if (effects[line.effect]) return effects[line.effect];
    if (/^[あえ][っ？?]/.test(line.text)) return "surprise";
    if (/[？?]/.test(line.text)) return "curious";
    return "ack";
  }

  function mount(root, hooks) {
    var enabled = false, visible = true, game = false, volume = .55;
    var audio, manifest, pending, epoch = 0, timer = 0;
    var lastTime = {}, lastClip = {};
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "vn-voice-toggle";
    toggle.dataset.voiceReactions = "";
    root.querySelector(".vn-nameplate").appendChild(toggle);
    var settings = root.querySelector('[data-vn-panel="settings"]');
    settings.insertAdjacentHTML("beforeend", '<label for="vn-reaction-volume">声の音量</label><input id="vn-reaction-volume" data-reaction-volume type="range" min="0" max="100" value="55">' +
      '<details class="vn-voice-credits"><summary>音声クレジット</summary>' +
      '<p>アリス：東北イタコ（CV：木戸衣吹）<br>パチュリー：東北きりたん（CV：茜屋日海夏）<br><a href="https://zunko.jp/con_voice.html" target="_blank" rel="noopener noreferrer">東北ずん子・ずんだもんプロジェクト 音声素材</a></p>' +
      '<p>魔理沙：<a href="https://amitaro.net/" target="_blank" rel="noopener noreferrer">あみたろの声素材工房</a></p></details>');

    function allowed() { return enabled && visible && !game && !document.hidden; }
    function update(state) {
      toggle.textContent = "声：" + (enabled ? "入" : "切");
      toggle.setAttribute("aria-pressed", String(enabled));
      toggle.setAttribute("aria-label", enabled ? "相槌の声を切る" : "相槌の声を入れる");
      root.dataset.reactionVoiceState = state || (enabled ? "ready" : "off");
    }
    function stop() {
      epoch++; clearTimeout(timer);
      if (audio) { audio.pause(); audio.muted = true; }
      update();
    }
    function load() {
      if (manifest) return Promise.resolve(manifest);
      if (!pending) pending = fetch(manifestUrl).then(function (r) {
        if (!r.ok) throw new Error("Voice reactions unavailable");
        return r.json();
      }).then(function (value) { manifest = value; return value; }).finally(function () { pending = null; });
      return pending;
    }
    function ensureAudio() {
      if (audio) return;
      audio = document.createElement("audio");
      audio.preload = "none";
      audio.dataset.companionReactionAudio = "";
      root.appendChild(audio);
      audio.addEventListener("ended", stop);
      audio.addEventListener("error", function () { stop(); update("error"); });
    }
    function play(character, line, preview) {
      stop();
      if (!allowed() || !line) return;
      var mood = moodFor(line), now = performance.now();
      // Neutral lines mostly stay silent. Switching characters has its own budget.
      if (!preview && (now - (lastTime[character] || -Infinity) < 5000 || (mood === "ack" && Math.random() > .35))) return;
      var token = epoch;
      ensureAudio(); update("loading");
      timer = setTimeout(function () { if (token === epoch) { stop(); update("error"); } }, 8000);
      load().then(function (data) {
        if (token !== epoch || !allowed()) return;
        var clips = data[character] && data[character][mood];
        if (!clips || !clips.length) { stop(); return; }
        var candidates = clips.filter(function (clip) { return clip !== lastClip[character]; });
        // Never repeat the same recording on adjacent lines.
        if (!preview && !candidates.length) { stop(); return; }
        var choices = candidates.length ? candidates : clips;
        var clip = choices[Math.floor(Math.random() * choices.length)];
        audio.src = new URL(clip, base).href;
        audio.volume = volume; audio.muted = false;
        return audio.play().then(function () {
          if (token !== epoch || !allowed()) return;
          clearTimeout(timer);
          lastTime[character] = performance.now(); lastClip[character] = clip;
          root.dataset.reactionVoiceMood = mood;
          update("playing");
        });
      }).catch(function () { if (token === epoch) { stop(); update("error"); } });
    }
    toggle.addEventListener("click", function () {
      enabled = !enabled;
      if (enabled) { var current = hooks.current(); play(current.character, current.line, true); }
      else stop();
    });
    settings.querySelector("[data-reaction-volume]").addEventListener("input", function (event) {
      volume = Number(event.target.value) / 100;
      if (audio) audio.volume = volume;
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });
    document.addEventListener("site:before-content-replace", stop);
    window.addEventListener("pagehide", stop);
    update();
    return {
      play: play, stop: stop,
      setVisible: function (value) { visible = value; if (!value) stop(); },
      setGameActive: function (value) { game = value; if (value) stop(); },
    };
  }
  window.CompanionVoiceReactions = { mount: mount };
})();
