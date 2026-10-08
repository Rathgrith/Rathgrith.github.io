/* Visual-novel controller. Story state is independent of optional WebGL/model loading. */
(function () {
  "use strict";
  var data = window.CompanionStories,
    root,
    hooks,
    currentId = "",
    story,
    index = 0,
    line;
  var state = "idle",
    timer = 0,
    autoTimer = 0,
    generation = 0,
    logged = false,
    panel = "",
    visible = true,
    gameActive = false;
  var history = [],
    originalIndices = {},
    lastTopic = "today";
  var key = "site-companion-v1",
    saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch (_) {}
  function number(value, fallback, min, max) {
    var n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }
  var affinity = {};
  Object.keys(data.characters).forEach(function (id) {
    affinity[id] = number(saved.affinity && saved.affinity[id], 35, 0, 100);
  });
  var speed = [0, 18, 38, 65].indexOf(saved.speed) >= 0 ? saved.speed : 38;
  var lighting = saved.lighting !== false,
    lightStrength = number(saved.lightStrength, 75, 0, 100),
    auto = false;
  function persist() {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          affinity: affinity,
          speed: speed,
          lighting: lighting,
          lightStrength: lightStrength,
        })
      );
    } catch (_) {}
  }
  function q(selector) {
    return root.querySelector(selector);
  }
  function clearTimers() {
    generation++;
    clearTimeout(timer);
    clearTimeout(autoTimer);
    timer = autoTimer = 0;
    if (hooks) hooks.stopSpeaking();
  }
  function setState(value) {
    state = value;
    root.dataset.dialogueState = value;
  }
  function updateAffinity() {
    var value = affinity[currentId],
      label = data.tierNames[data.tier(value)];
    q("[data-vn-affinity]").textContent = label;
    q("[data-vn-affinity]").title = "親密度 " + value + " / 100";
    q("[data-vn-affinity-meter]").value = value;
    q("[data-vn-affinity-input]").value = value;
    q("[data-vn-affinity-output]").textContent = value + " / 100 · " + label;
  }
  function renderSettings() {
    q("[data-vn-speed]").value = speed;
    q("[data-vn-lighting]").checked = lighting;
    q("[data-vn-light-strength]").value = lightStrength;
    syncLighting();
    updateAffinity();
  }
  function syncLighting() {
    root.dataset.sceneLighting = String(lighting);
    root.dataset.sceneLightStrength = String(lightStrength);
    root.style.setProperty("--vn-light-strength", lightStrength / 100);
    q("[data-vn-light-output]").textContent = lightStrength + "%";
    q("[data-vn-light-strength]").disabled = !lighting;
    if (hooks && hooks.lighting) hooks.lighting();
  }
  function panelOpen(name) {
    panel = panel === name ? "" : name;
    ["settings", "history", "weather", "topics", "friends"].forEach(
      function (id) {
        q('[data-vn-panel="' + id + '"]').hidden = panel !== id;
        var button = q('[data-vn-open="' + id + '"]');
        if (button) button.setAttribute("aria-expanded", String(panel === id));
      }
    );
    root.classList.toggle("has-vn-panel", Boolean(panel));
    q(".vn-main-view").inert = Boolean(panel);
    if (panel) q('[data-vn-panel="' + panel + '"]').scrollTop = 0;
    clearTimeout(autoTimer);
    if (panel === "history") renderHistory();
    if (panel === "friends") renderFriends();
    if (panel === "settings") renderSettings();
    if (panel) {
      var focus = q('[data-vn-panel="' + panel + '"] button');
      if (focus) focus.focus({ preventScroll: true });
    } else scheduleAuto();
  }
  function closePanel() {
    if (panel) panelOpen(panel);
  }
  function renderFriends() {
    var list = q("[data-vn-friends-list]");
    list.replaceChildren();
    (window.CompanionRemarks[currentId] || []).forEach(function (remark) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = remark.name;
      button.setAttribute("data-vn-topic-start", "friend:" + remark.id);
      list.appendChild(button);
    });
  }
  function panelOpener(name) {
    return q('[data-vn-open="' + name + '"]') || q('[data-vn-open="topics"]');
  }
  function renderHistory() {
    var container = q("[data-vn-history-list]");
    container.replaceChildren();
    var entries = history.filter(function (entry) {
      return entry.character === currentId;
    });
    if (!entries.length) {
      var empty = document.createElement("p");
      empty.textContent = "まだ記録はありません。";
      container.appendChild(empty);
    }
    entries.forEach(function (entry) {
      var item = document.createElement("li"),
        text = document.createElement("p");
      text.lang = "ja";
      text.textContent = entry.text;
      item.appendChild(text);
      container.appendChild(item);
    });
    container.scrollTop = container.scrollHeight;
  }
  function renderChoices() {
    var target = q("[data-vn-choices]");
    target.replaceChildren();
    if (
      !story ||
      index < story.lines.length - 1 ||
      !story.choices ||
      state === "typing"
    )
      return;
    setState("choice");
    story.choices.forEach(function (choice) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = "▸ " + choice.label;
      button.addEventListener("click", function () {
        if (state !== "choice") return;
        var response = choice.responses[data.tier(affinity[currentId])];
        affinity[currentId] = Math.min(
          100,
          Math.max(0, affinity[currentId] + choice.delta)
        );
        persist();
        updateAffinity();
        history.push({
          character: currentId,
          text: "▸ " + choice.label,
        });
        story = { lines: [response], label: "返事" };
        index = 0;
        renderLine();
      });
      target.appendChild(button);
    });
    q("#live2d-interact").textContent = "選択";
    q("#live2d-interact").disabled = true;
  }
  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (
      !auto ||
      !visible ||
      gameActive ||
      document.hidden ||
      panel ||
      state !== "ready" ||
      !story ||
      index >= story.lines.length - 1
    )
      return;
    autoTimer = setTimeout(advance, Math.max(2400, line.text.length * 85));
  }
  function complete() {
    clearTimeout(timer);
    timer = 0;
    if (!line) return;
    q("[data-live2d-dialogue-text]").textContent = line.text;
    hooks.stopSpeaking();
    setState("ready");
    q("#live2d-interact").textContent =
      index < story.lines.length - 1
        ? "次へ ▸"
        : lastTopic.indexOf("friend:") === 0
          ? "別の人 ▸"
          : "話題 ▸";
    q("#live2d-interact").disabled = false;
    if (!logged) {
      logged = true;
      history.push({
        character: currentId,
        text: line.text,
      });
      history = history.slice(-80);
      q("[data-vn-announcement]").textContent =
        data.characters[currentId].name + "：" + line.text;
    }
    renderChoices();
    scheduleAuto();
  }
  function renderLine() {
    clearTimers();
    logged = false;
    line = story.lines[index];
    if (!line) return;
    q("[data-vn-choices]").replaceChildren();
    q("[data-live2d-dialogue-text]").textContent = "";
    q("#live2d-interact").textContent = "次へ ▸";
    q("#live2d-interact").disabled = false;
    q("#live2d-dialogue").setAttribute("aria-hidden", "false");
    q("#live2d-dialogue").classList.add("is-visible");
    root.classList.add("has-dialogue");
    setState("typing");
    hooks.perform(line);
    if (speed === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      complete();
      return;
    }
    var chars = Array.from(line.text),
      position = 0,
      run = generation;
    function tick() {
      if (run !== generation) return;
      if (!visible || gameActive || document.hidden) {
        timer = setTimeout(tick, 250);
        return;
      }
      q("[data-live2d-dialogue-text]").textContent = chars
        .slice(0, ++position)
        .join("");
      if (position >= chars.length) {
        complete();
        return;
      }
      hooks.speak();
      var punctuation = /[。、！？…]/.test(chars[position - 1]);
      timer = setTimeout(tick, speed * (punctuation ? 4 : 1));
    }
    tick();
  }
  function start(topic) {
    closePanel();
    lastTopic = topic || "today";
    if (lastTopic === "friends") {
      panelOpen("friends");
      return;
    }
    if (lastTopic.indexOf("friend:") === 0) {
      var remark = (window.CompanionRemarks[currentId] || []).find(
        function (item) {
          return item.id === lastTopic.slice(7);
        }
      );
      if (!remark) {
        panelOpen("friends");
        return;
      }
      story = {
        lines: [remark],
        label: remark.name,
      };
    } else if (lastTopic === "original") {
      var originals = hooks.originals[currentId],
        offset = originalIndices[currentId] || 0,
        original = originals[offset % originals.length];
      originalIndices[currentId] = offset + 1;
      story = {
        lines: [original],
        label: "思い出",
      };
    } else {
      story = data.story(currentId, lastTopic, affinity[currentId], {
        weather: window.__siteWeather,
        date: new Date(),
      });
    }
    index = 0;
    renderLine();
  }
  function advance() {
    if (!visible || gameActive || panel || state === "choice") return;
    if (state === "typing") {
      complete();
      return;
    }
    if (story && index < story.lines.length - 1) {
      index++;
      renderLine();
    } else panelOpen(lastTopic.indexOf("friend:") === 0 ? "friends" : "topics");
  }
  function cancel() {
    if (!root) return;
    clearTimers();
    story = null;
    line = null;
    index = 0;
    setState("idle");
    q("[data-vn-choices]").replaceChildren();
    q("[data-live2d-dialogue-text]").textContent = "……";
    q("[data-vn-announcement]").textContent = "";
    q("#live2d-interact").textContent = "話題 ▸";
    q("#live2d-interact").disabled = false;
  }
  function setCharacter(id) {
    if (!root || !data.characters[id] || currentId === id) return;
    currentId = id;
    closePanel();
    cancel();
    var character = data.characters[id];
    root.dataset.vnCharacter = id;
    q("[data-companion-name]").textContent = character.fullName;
    q("[data-live2d-dialogue-name]").textContent = character.name;
    q("[data-vn-location]").textContent = character.location;
    root.querySelectorAll("[data-vn-character]").forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.vnCharacter === id)
      );
    });
    renderSettings();
    syncWeather();
    if (window.__siteInitWeatherWidgets) window.__siteInitWeatherWidgets();
  }
  function setReady(status) {
    if (!root) return;
    root.classList.toggle("is-loading", status === "loading");
    root.classList.toggle("has-live2d-error", status === "error");
    q("[data-companion-stage]").setAttribute(
      "aria-busy",
      String(status === "loading")
    );
    q("[data-vn-load-label]").textContent =
      status === "error" ? "接続できませんでした" : "少女祈祷中…";

    q("[data-vn-retry]").hidden = status !== "error";
    if (status === "ready" && !story) start("today");
  }
  function syncWeather() {
    if (!root) return;
    var weather = window.__siteWeather;
    q("[data-vn-weather-summary]").textContent = weather
      ? weather.temperature + "°C · " + weather.name
      : "観測中…";
    root.dataset.sceneTime = weather
      ? weather.isDay
        ? "day"
        : "night"
      : new Date().getHours() >= 7 && new Date().getHours() < 19
        ? "day"
        : "night";
    root.dataset.sceneWeather = weather ? weather.phase : "unknown";
    syncLighting();
  }
  function setGameActive(value) {
    gameActive = value;
    closePanel();
    q(".vn-main-view").hidden = value;
    q(".vn-main-view").inert = value;
    if (value) {
      clearTimeout(autoTimer);
      hooks.stopSpeaking();
    } else scheduleAuto();
    document.dispatchEvent(
      new CustomEvent("site:companion-game", { detail: { active: value } })
    );
  }
  function mount(widget, callbacks) {
    if (root)
      return {
        trigger: q("#live2d-interact"),
        dialogue: q("#live2d-dialogue"),
      };
    root = widget;
    root.lang = "ja";
    hooks = callbacks;
    q("[data-companion-stage]").insertAdjacentHTML(
      "afterbegin",
      '<div class="vn-scene-light" aria-hidden="true"></div><div class="vn-scene-caption" data-vn-location></div>'
    );
    var loader = q(".companion-load-status");
    loader.replaceChildren(
      document.getElementById("prayer-loader-template").content.cloneNode(true)
    );
    loader
      .querySelector("[data-prayer-label]")
      .setAttribute("data-vn-load-label", "");
    loader.insertAdjacentHTML(
      "beforeend",
      '<button type="button" data-vn-retry hidden>再試行</button>'
    );
    q("[data-companion-content]").insertAdjacentHTML(
      "afterbegin",
      '<div class="vn-cast" aria-label="話し相手">' +
        Object.keys(data.characters)
          .map(function (id) {
            return (
              '<button type="button" data-vn-character="' +
              id +
              '" aria-label="話し相手：' +
              data.characters[id].name +
              '"><img src="/assets/images/classic/characters/' +
              id +
              '.svg" alt="">' +
              data.characters[id].name +
              "</button>"
            );
          })
          .join("") +
        "</div>"
    );
    q("[data-companion-conversation]").innerHTML =
      '<div class="vn-nameplate"><strong data-live2d-dialogue-name></strong><span class="vn-affinity"><meter data-vn-affinity-meter min="0" max="100" aria-label="親密度"></meter><span data-vn-affinity></span></span></div><aside id="live2d-dialogue" class="live2d-dialogue is-visible" aria-hidden="false"><div class="vn-reading" data-vn-reading role="button" tabindex="0" aria-label="会話を進める"><p class="live2d-dialogue__text" data-live2d-dialogue-text></p><span class="vn-next-mark" aria-hidden="true">▾</span></div></aside><div class="vn-choices" data-vn-choices></div><span class="visually-hidden" data-vn-announcement aria-live="polite" aria-atomic="true"></span>';
    q("[data-companion-footer]").innerHTML =
      '<button type="button" data-vn-open="topics" aria-expanded="false">話題</button><button type="button" data-vn-auto aria-pressed="false">自動</button><button type="button" data-vn-open="history" aria-expanded="false">履歴</button><button type="button" data-vn-open="settings" aria-expanded="false">設定</button><button type="button" id="live2d-interact" class="live2d-interact">次へ ▸</button>';
    q("[data-companion-content]").insertAdjacentHTML(
      "beforeend",
      '<button class="vn-weather-strip" type="button" data-vn-open="weather" aria-expanded="false"><span class="vn-weather-brand">非想天則</span><span data-vn-weather-summary>観測中…</span><span aria-hidden="true">▴</span></button>' +
        '<section class="vn-panel" data-vn-panel="topics" hidden aria-label="話題"><header>話題<button type="button" data-vn-close aria-label="閉じる">×</button></header><div class="vn-topic-list"><button type="button" data-vn-topic-start="today">今日のこと</button><button type="button" data-vn-topic-start="craft">魔法の話</button><button type="button" data-vn-topic-start="friends">友人のこと</button><button type="button" data-vn-topic-start="rest">お茶にしましょう</button><button type="button" data-vn-topic-start="weather">窓の向こう</button><button type="button" data-vn-topic-start="original">思い出</button></div></section>' +
        '<section class="vn-panel" data-vn-panel="friends" hidden aria-label="友人のこと"><header>友人のこと<button type="button" data-vn-close aria-label="閉じる">×</button></header><div class="vn-friends-list" data-vn-friends-list></div></section>' +
        '<section class="vn-panel" data-vn-panel="settings" hidden aria-label="設定"><header>設定<button type="button" data-vn-close aria-label="閉じる">×</button></header><label for="vn-affinity">親密度 <output id="vn-affinity-output" data-vn-affinity-output></output></label><input id="vn-affinity" data-vn-affinity-input type="range" min="0" max="100" step="1"><label for="vn-speed">文字速度</label><select id="vn-speed" data-vn-speed><option value="65">ゆっくり</option><option value="38">ふつう</option><option value="18">はやい</option><option value="0">一括表示</option></select><label class="vn-check"><input type="checkbox" data-vn-lighting> 環境光</label><label for="vn-light-strength">光の強さ <output data-vn-light-output></output></label><input id="vn-light-strength" data-vn-light-strength type="range" min="0" max="100" step="1"><button type="button" data-vn-reset-position>元の位置へ</button></section>' +
        '<section class="vn-panel" data-vn-panel="history" hidden aria-label="履歴"><header>履歴<button type="button" data-vn-close aria-label="閉じる">×</button></header><ol class="vn-history" data-vn-history-list></ol></section>' +
        '<section class="vn-panel" data-vn-panel="weather" hidden aria-labelledby="vn-weather-title"><header><h2 class="vn-weather-title" id="vn-weather-title">非想天則</h2><button type="button" data-vn-close aria-label="閉じる">×</button></header><div data-vn-weather-mount></div><button class="vn-weather-talk" type="button" data-vn-topic-start="weather">空の話をする ▸</button></section>'
    );
    var content = q("[data-companion-content]");
    var mainView = document.createElement("div");
    mainView.className = "vn-main-view";
    Array.from(content.children)
      .filter(function (child) {
        return !child.matches("[data-vn-panel]");
      })
      .forEach(function (child) {
        mainView.appendChild(child);
      });
    content.prepend(mainView);
    var weather = document.querySelector("[data-weather-widget]");
    if (weather) {
      weather.hidden = false;
      q("[data-vn-weather-mount]").appendChild(weather);
    }
    root.addEventListener("click", function (event) {
      var target = event.target.closest("button");
      if (!target) return;
      if (target.hasAttribute("data-vn-open")) panelOpen(target.dataset.vnOpen);
      if (target.hasAttribute("data-vn-close")) {
        var previous = panel;
        closePanel();
        var opener = panelOpener(previous);
        if (opener) opener.focus();
      }
      if (target.hasAttribute("data-vn-topic-start"))
        start(target.dataset.vnTopicStart);
      if (target.hasAttribute("data-vn-character"))
        hooks.select(target.dataset.vnCharacter);
      if (target.id === "live2d-interact") advance();
      if (target.hasAttribute("data-vn-auto")) {
        auto = !auto;
        target.setAttribute("aria-pressed", String(auto));
        scheduleAuto();
      }
      if (target.hasAttribute("data-vn-retry")) hooks.retry();
      if (target.hasAttribute("data-vn-reset-position")) {
        hooks.resetPosition();
        closePanel();
      }
    });
    q("[data-vn-reading]").addEventListener("click", advance);
    q("[data-vn-reading]").addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        advance();
      }
    });
    root.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && panel) {
        event.preventDefault();
        var previous = panel;
        closePanel();
        panelOpener(previous).focus();
      }
    });
    q("[data-vn-affinity-input]").addEventListener("input", function (event) {
      affinity[currentId] = number(event.target.value, 35, 0, 100);
      updateAffinity();
      persist();
    });
    q("[data-vn-speed]").addEventListener("change", function (event) {
      speed = Number(event.target.value);
      persist();
      if (state === "typing") complete();
    });
    q("[data-vn-lighting]").addEventListener("change", function (event) {
      lighting = event.target.checked;
      syncLighting();
      persist();
    });
    q("[data-vn-light-strength]").addEventListener("input", function (event) {
      lightStrength = number(event.target.value, 75, 0, 100);
      syncLighting();
      persist();
    });
    document.addEventListener("site:weather-updated", syncWeather);
    document.addEventListener("site:weather-error", function () {
      q("[data-vn-weather-summary]").textContent = window.__siteWeather
        ? window.__siteWeather.temperature +
          "°C · 更新できませんでした"
        : "天気を取得できません";
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        clearTimeout(autoTimer);
        hooks.stopSpeaking();
      } else scheduleAuto();
    });
    setCharacter(document.documentElement.dataset.live2dCharacter || "alice");
    window.CompanionDanmaku.mount(root, {
      activate: setGameActive,
      character: function () {
        return currentId;
      },
    });
    return { trigger: q("#live2d-interact"), dialogue: q("#live2d-dialogue") };
  }
  window.SiteCompanion = {
    mount: mount,
    setCharacter: setCharacter,
    setReady: setReady,
    cancel: cancel,
    next: advance,
    setVisible: function (value) {
      visible = value;
      if (window.CompanionDanmaku) window.CompanionDanmaku.setVisible(value);
      if (!value) {
        clearTimeout(autoTimer);
        if (hooks) hooks.stopSpeaking();
      } else scheduleAuto();
    },
    start: start,
  };
})();
