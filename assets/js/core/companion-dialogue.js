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
    visible = true;
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
  var subtitles = saved.subtitles !== false,
    lighting = saved.lighting !== false,
    auto = false;
  function persist() {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          affinity: affinity,
          speed: speed,
          subtitles: subtitles,
          lighting: lighting,
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
    q("[data-vn-affinity]").title = "好感度 " + value + " / 100";
    q("[data-vn-affinity-meter]").value = value;
    q("[data-vn-affinity-input]").value = value;
    q("[data-vn-affinity-output]").textContent = value + " / 100 · " + label;
  }
  function renderSettings() {
    q("[data-vn-speed]").value = speed;
    q("[data-vn-subtitles]").checked = subtitles;
    q("[data-vn-lighting]").checked = lighting;
    root.dataset.subtitles = String(subtitles);
    root.dataset.sceneLighting = String(lighting);
    updateAffinity();
  }
  function panelOpen(name) {
    panel = panel === name ? "" : name;
    ["settings", "history", "weather", "topics"].forEach(function (id) {
      q('[data-vn-panel="' + id + '"]').hidden = panel !== id;
      var button = q('[data-vn-open="' + id + '"]');
      if (button) button.setAttribute("aria-expanded", String(panel === id));
    });
    root.classList.toggle("has-vn-panel", Boolean(panel));
    q(".vn-main-view").inert = Boolean(panel);
    if (panel) q('[data-vn-panel="' + panel + '"]').scrollTop = 0;
    clearTimeout(autoTimer);
    if (panel === "history") renderHistory();
    if (panel === "settings") renderSettings();
    if (panel) {
      var focus = q('[data-vn-panel="' + panel + '"] button');
      if (focus) focus.focus({ preventScroll: true });
    } else scheduleAuto();
  }
  function closePanel() {
    if (panel) panelOpen(panel);
  }
  function renderHistory() {
    var container = q("[data-vn-history-list]");
    container.replaceChildren();
    var entries = history.filter(function (entry) {
      return entry.character === currentId;
    });
    if (!entries.length) {
      var empty = document.createElement("p");
      empty.textContent = "还没有读完的台词。";
      container.appendChild(empty);
    }
    entries.forEach(function (entry) {
      var item = document.createElement("li"),
        jp = document.createElement("p"),
        zh = document.createElement("p"),
        source = document.createElement("small");
      jp.lang = "ja";
      jp.textContent = entry.text;
      zh.lang = "zh-CN";
      zh.textContent = entry.translation || "";
      zh.hidden = !subtitles;
      source.textContent = entry.source;
      item.append(jp, zh, source);
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
    q("[data-vn-hint]").textContent = "请选择一个回答";
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
          translation: "",
          source: "你的选择",
        });
        story = { lines: [response], label: "回应" };
        index = 0;
        renderLine();
      });
      target.appendChild(button);
    });
    q("#live2d-interact").textContent = "请选择";
    q("#live2d-interact").disabled = true;
  }
  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (
      !auto ||
      !visible ||
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
    q("[data-vn-translation]").textContent = line.translation || "";
    hooks.stopSpeaking();
    setState("ready");
    q("[data-vn-hint]").textContent =
      index < story.lines.length - 1
        ? "点击 / Enter 继续"
        : "会话结束 · 可选择新话题";
    q("#live2d-interact").textContent =
      index < story.lines.length - 1 ? "继续 ▸" : "话题 ▸";
    q("#live2d-interact").disabled = false;
    if (!logged) {
      logged = true;
      history.push({
        character: currentId,
        text: line.text,
        translation: line.translation,
        source: line.source,
      });
      history = history.slice(-80);
      q("[data-vn-announcement]").textContent =
        data.characters[currentId].name +
        "：" +
        line.text +
        (subtitles && line.translation ? " " + line.translation : "");
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
    q("[data-vn-topic]").textContent = story.label;
    q("[data-vn-source]").textContent =
      line.source === "同人创作" ? "同人会话" : line.source;
    q("[data-vn-source]").title =
      line.source === "同人创作"
        ? "本网站创作的同人台词，并非原作引文"
        : "保留的游戏台词；中文字幕为译文";
    q("[data-live2d-dialogue-text]").textContent = "";
    q("[data-vn-translation]").textContent = "";
    q("[data-vn-hint]").textContent = "点击 / Enter 显示完整台词";
    q("#live2d-interact").textContent = "显示全文";
    q("#live2d-interact").disabled = false;
    q("#live2d-dialogue").dataset.live2dSource = line.source;
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
      if (!visible || document.hidden) {
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
    if (lastTopic === "original") {
      var originals = hooks.originals[currentId],
        offset = originalIndices[currentId] || 0,
        original = originals[offset % originals.length];
      originalIndices[currentId] = offset + 1;
      story = {
        lines: [
          Object.assign({}, original, {
            translation:
              data.translations[currentId][offset % originals.length],
          }),
        ],
        label: "原作回想",
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
    if (!visible || panel || state === "choice") return;
    if (state === "typing") {
      complete();
      return;
    }
    if (story && index < story.lines.length - 1) {
      index++;
      renderLine();
    } else panelOpen("topics");
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
    q("[data-vn-translation]").textContent = "选一个话题，坐下来聊聊吧。";
    q("[data-vn-source]").textContent = "同人会话";
    q("[data-vn-hint]").textContent = "点击「话题」开始";
    q("#live2d-interact").textContent = "话题 ▸";
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
    q("[data-vn-topic]").textContent = "幻想通信";
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
      status === "error"
        ? "连接暂时中断"
        : "正在前往 " +
          (data.characters[currentId] || data.characters.alice).location;
    q("[data-vn-load-note]").textContent =
      status === "error"
        ? "对话仍可使用，点击重试载入角色。"
        : "NOW LOADING · 场景与角色载入中";
    q("[data-vn-retry]").hidden = status !== "error";
    if (status === "ready" && !story) start("today");
  }
  function syncWeather() {
    if (!root) return;
    var weather = window.__siteWeather;
    q("[data-vn-weather-summary]").textContent = weather
      ? weather.location + " · " + weather.temperature + "°C · " + weather.name
      : "天气观测中 · West Midlands";
    root.dataset.sceneTime = weather
      ? weather.isDay
        ? "day"
        : "night"
      : new Date().getHours() >= 7 && new Date().getHours() < 19
        ? "day"
        : "night";
    root.dataset.sceneWeather = weather ? weather.phase : "unknown";
  }
  function mount(widget, callbacks) {
    if (root)
      return {
        trigger: q("#live2d-interact"),
        dialogue: q("#live2d-dialogue"),
      };
    root = widget;
    hooks = callbacks;
    q("[data-companion-stage]").insertAdjacentHTML(
      "afterbegin",
      '<div class="vn-scene-light" aria-hidden="true"></div><div class="vn-scene-caption" data-vn-location></div>'
    );
    q(".companion-load-status").innerHTML =
      '<span class="vn-loading-icon" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span data-vn-load-label>正在准备场景</span><small data-vn-load-note>NOW LOADING</small><button type="button" data-vn-retry hidden>重新连接</button>';
    q("[data-companion-content]").insertAdjacentHTML(
      "afterbegin",
      '<div class="vn-cast" aria-label="选择角色">' +
        Object.keys(data.characters)
          .map(function (id) {
            return (
              '<button type="button" data-vn-character="' +
              id +
              '" aria-label="切换到' +
              data.characters[id].chinese +
              '"><img src="/assets/images/classic/characters/' +
              id +
              '.svg" alt="">' +
              data.characters[id].chinese +
              "</button>"
            );
          })
          .join("") +
        '<span class="vn-mode">STORY</span></div>'
    );
    q("[data-companion-conversation]").innerHTML =
      '<div class="vn-nameplate"><strong data-live2d-dialogue-name lang="ja"></strong><span class="vn-affinity"><meter data-vn-affinity-meter min="0" max="100" aria-label="好感度"></meter><span data-vn-affinity></span></span></div><aside id="live2d-dialogue" class="live2d-dialogue is-visible" aria-hidden="false"><div class="vn-reading" data-vn-reading role="button" tabindex="0" aria-label="显示完整台词或继续"><p class="live2d-dialogue__text" data-live2d-dialogue-text lang="ja"></p><p class="vn-translation" data-vn-translation lang="zh-CN"></p><span class="vn-next-mark" aria-hidden="true">▾</span></div><div class="vn-line-meta"><span data-vn-source></span><span data-vn-topic></span></div></aside><div class="vn-choices" data-vn-choices></div><span class="vn-hint" data-vn-hint></span><span class="visually-hidden" data-vn-announcement aria-live="polite" aria-atomic="true"></span>';
    q("[data-companion-footer]").innerHTML =
      '<button type="button" data-vn-open="topics" aria-expanded="false">话题</button><button type="button" data-vn-auto aria-pressed="false">自动</button><button type="button" data-vn-open="history" aria-expanded="false">记录</button><button type="button" data-vn-open="settings" aria-expanded="false">设置</button><button type="button" id="live2d-interact" class="live2d-interact">话题 ▸</button>';
    q("[data-companion-content]").insertAdjacentHTML(
      "beforeend",
      '<button class="vn-weather-strip" type="button" data-vn-open="weather" aria-expanded="false"><span aria-hidden="true">◇</span><span data-vn-weather-summary>天气观测中</span><span aria-hidden="true">▴</span></button>' +
        '<section class="vn-panel" data-vn-panel="topics" hidden aria-label="对话话题"><header>选择话题<button type="button" data-vn-close aria-label="关闭话题">×</button></header><div class="vn-topic-list"><button type="button" data-vn-topic-start="today">01 · 今日问候 / 节日</button><button type="button" data-vn-topic-start="craft">02 · 研究与创作</button><button type="button" data-vn-topic-start="rest">03 · 休息片刻</button><button type="button" data-vn-topic-start="weather">04 · 窗外天气</button><button type="button" data-vn-topic-start="original">05 · 原作回想</button></div><small>节日与时间以你的本机日期为准。</small></section>' +
        '<section class="vn-panel" data-vn-panel="settings" hidden aria-label="对话设置"><header>会话设置<button type="button" data-vn-close aria-label="关闭设置">×</button></header><label for="vn-affinity">好感度 <output id="vn-affinity-output" data-vn-affinity-output></output></label><input id="vn-affinity" data-vn-affinity-input type="range" min="0" max="100" step="1" aria-describedby="vn-affinity-help"><p id="vn-affinity-help">初见 → 相识 → 信任 → 知己<br>各角色独立保存。回答会增加 1–2 点；也可在此自由设置，新话题与回答使用新数值。</p><label for="vn-speed">文字速度</label><select id="vn-speed" data-vn-speed><option value="65">慢速</option><option value="38">标准</option><option value="18">快速</option><option value="0">立即显示</option></select><label class="vn-check"><input type="checkbox" data-vn-subtitles> 显示中文字幕</label><label class="vn-check"><input type="checkbox" data-vn-lighting> 场景环境光</label><button type="button" data-vn-reset-position>将窗口移回右侧</button><small>设置只保存在此浏览器。新增会话为同人创作；「原作回想」保留原有引文出处。</small></section>' +
        '<section class="vn-panel" data-vn-panel="history" hidden aria-label="对话记录"><header>对话记录<button type="button" data-vn-close aria-label="关闭记录">×</button></header><ol class="vn-history" data-vn-history-list></ol><small>本次访问 · 最多保留 80 条记录</small></section>' +
        '<section class="vn-panel" data-vn-panel="weather" hidden aria-label="当地天气"><header>窗外天气<button type="button" data-vn-close aria-label="关闭天气">×</button></header><div data-vn-weather-mount></div><button type="button" data-vn-topic-start="weather">聊聊今天的天气 ▸</button></section>'
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
        var opener = q('[data-vn-open="' + previous + '"]');
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
        q('[data-vn-open="' + previous + '"]').focus();
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
    q("[data-vn-subtitles]").addEventListener("change", function (event) {
      subtitles = event.target.checked;
      root.dataset.subtitles = String(subtitles);
      persist();
    });
    q("[data-vn-lighting]").addEventListener("change", function (event) {
      lighting = event.target.checked;
      root.dataset.sceneLighting = String(lighting);
      persist();
    });
    document.addEventListener("site:weather-updated", syncWeather);
    document.addEventListener("site:weather-error", function () {
      q("[data-vn-weather-summary]").textContent = window.__siteWeather
        ? window.__siteWeather.location +
          " · " +
          window.__siteWeather.temperature +
          "°C · 更新失败"
        : "天气暂不可用 · 点击查看 / 重试";
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        clearTimeout(autoTimer);
        hooks.stopSpeaking();
      } else scheduleAuto();
    });
    setCharacter(document.documentElement.dataset.live2dCharacter || "alice");
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
      if (!value) {
        clearTimeout(autoTimer);
        if (hooks) hooks.stopSpeaking();
      } else scheduleAuto();
    },
    start: start,
  };
})();
