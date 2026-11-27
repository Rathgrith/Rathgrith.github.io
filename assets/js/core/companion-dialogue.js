/* Visual-novel controller. Story state is independent of optional WebGL/model loading. */
(function () {
  "use strict";
  var data = window.CompanionStories,
    root,
    hooks,
    bgm,
    voiceReactions,
    motion,
    standalone,
    currentId = "",
    story,
    index = 0,
    line;
  var state = "idle",
    timer = 0,
    autoTimer = 0,
    generation = 0,
    logged = false,
    visitedReplies = false,
    panel = "",
    visible = true,
    gameActive = false;
  var replyIdleMs = 3000, replyRemaining = replyIdleMs, replyDeadline = 0, replyTimer = 0;
  var foldedReplies = null, previousCommand = "", repliesInView = false;
  var pressedPointers = new Set(), hoveredReply = null, pageBlurred = false;
  var minimumLoadingMs = 0,
    loadingUntil = 0,
    readyTimer = 0;
  var history = [],
    originalIndices = {},
    pick = data.createPicker(),
    branchTopic = null,
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
  var foldIdleReplies = saved.foldIdleReplies !== false,
    lighting = saved.lighting !== false,
    lightStrength = number(saved.lightStrength, 75, 0, 100),
    auto = false;
  var focusPlanes = { near: "手前", subject: "人物", far: "背景" }, apertureStops = [2, 2.8, 4, 5.6];
  var lensFocusMode = saved.lensFocusMode === "manual" ? "manual" : "auto",
    lensFocusPlane = Object.hasOwn(focusPlanes, saved.lensFocusPlane) ? saved.lensFocusPlane : "subject",
    lensFNumber = apertureStops.includes(saved.lensFNumber) ? saved.lensFNumber : 4;
  function persist() {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          affinity: affinity,
          speed: speed,
          foldIdleReplies: foldIdleReplies,
          lighting: lighting,
          lightStrength: lightStrength,
          lensFocusMode: lensFocusMode,
          lensFocusPlane: lensFocusPlane,
          lensFNumber: lensFNumber,
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
    var reading = q("[data-vn-reading]");
    var awaitingChoice = value === "choice" && !foldedReplies;
    reading.setAttribute("aria-disabled", String(awaitingChoice));
    reading.setAttribute("aria-description", foldedReplies ? "返事をもう一度表示する" :
      awaitingChoice ? "場面に表示された返事を選んでください" : "会話を進める");
    reading.tabIndex = awaitingChoice ? -1 : 0;
  }
  function resetReplies() {
    clearTimeout(replyTimer);
    replyTimer = 0;
    replyRemaining = replyIdleMs;
    foldedReplies = null;
    pressedPointers.clear();
    hoveredReply = null;
    root.removeAttribute("data-replies-folded");
  }
  function syncReplyIdle(activity) {
    var now = performance.now();
    if (replyTimer) {
      clearTimeout(replyTimer);
      replyTimer = 0;
      replyRemaining = Math.max(0, replyDeadline - now);
    }
    if (activity) replyRemaining = replyIdleMs;
    if (!root || !foldIdleReplies || foldedReplies || !repliesInView || !visible ||
        gameActive || panel || document.hidden || pageBlurred ||
        pressedPointers.size || hoveredReply || q("[data-vn-choices] button:focus") ||
        !q("[data-vn-choices] button") || q('[data-radio-open][aria-expanded="true"]')) return;
    replyDeadline = now + replyRemaining;
    replyTimer = setTimeout(checkReplyIdle, replyRemaining);
  }
  function noteReplyActivity() {
    // Pointer movement can be frequent. Update the deadline without creating
    // another timer for every movement; the outstanding callback checks it.
    if (replyTimer) replyDeadline = performance.now() + replyIdleMs;
    else syncReplyIdle(true);
  }
  function checkReplyIdle() {
    var wait = replyDeadline - performance.now();
    if (wait > 0) {
      replyTimer = setTimeout(checkReplyIdle, wait);
      return;
    }
    replyTimer = 0;
    var menu = q("[data-vn-choices]"), command = q("#live2d-interact");
    if (!menu.firstElementChild || !visible || gameActive || panel || document.hidden) return;
    var focusWasInMenu = menu.contains(document.activeElement);
    // Retain the actual commands and their original story/affinity callbacks.
    foldedReplies = document.createDocumentFragment();
    while (menu.firstChild) foldedReplies.appendChild(menu.firstChild);
    previousCommand = command.textContent;
    command.textContent = "選択 ▸";
    root.setAttribute("data-replies-folded", "");
    q(".vn-scene-frame").removeAttribute("data-replies-pending");
    setState(state);
    if (focusWasInMenu) command.focus({ preventScroll: true });
    if (hooks.restScene) hooks.restScene();
  }
  function restoreReplies(focus) {
    if (!foldedReplies) return false;
    var menu = q("[data-vn-choices]");
    q(".vn-scene-frame").setAttribute("data-replies-pending", "");
    menu.appendChild(foldedReplies);
    foldedReplies = null;
    root.removeAttribute("data-replies-folded");
    q("#live2d-interact").textContent = previousCommand;
    setState(state);
    if (focus !== false) menu.querySelector("button").focus({ preventScroll: true });
    syncReplyIdle(true);
    return true;
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
    q("[data-vn-fold-replies]").checked = foldIdleReplies;
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
    if (panel === "topics") renderTopics();
    if (panel === "settings") renderSettings();
    if (panel) {
      var focus = q('[data-vn-panel="' + panel + '"] button');
      if (focus) focus.focus({ preventScroll: true });
      if (root.classList.contains("is-docked"))
        q('[data-vn-panel="' + panel + '"]').scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
    } else scheduleAuto();
    syncReplyIdle(true);
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
  function branches() {
    return (window.CompanionBranches || {})[currentId];
  }
  function suggestedTopics() {
    var tree = branches();
    return tree && ["today", "rest", "weather", "craft"].includes(lastTopic)
      ? tree.topics : [];
  }
  function renderTopics() {
    var list = q("[data-vn-topic-list]"),
      tree = branches();
    list.replaceChildren();
    function appendTopics(heading, topics) {
      if (!topics.length) return;
      var title = document.createElement("h3");
      title.textContent = heading;
      list.appendChild(title);
      topics.forEach(function (topic) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = topic.label;
        button.setAttribute("data-vn-topic-start", topic.id);
        list.appendChild(button);
      });
    }
    if (tree) appendTopics("選択肢のある会話", tree.topics.map(function (topic) {
      return { id: "branch:" + topic.id, label: topic.label };
    }));
    appendTopics("日常の話題", [
      { id: "today", label: "今日のこと" },
      { id: "craft", label: "魔法の話" },
      { id: "friends", label: "友人のこと" },
      { id: "rest", label: "お茶にしましょう" },
      { id: "weather", label: "窓の向こう" },
      { id: "original", label: "思い出" },
    ]);
  }
  function startBranchNode(id, level) {
    var tree = branches(),
      node = tree && tree.nodes[id];
    if (!node || !branchTopic) return;
    story = {
      lines: node.affinityLines
        ? [
            node.affinityLines[
              level === undefined ? data.tier(affinity[currentId]) : level
            ],
          ]
        : node.lines.slice(),
      choices: node.choices,
      label: branchTopic.label,
    };
    root.dataset.vnBranchNode = id;
    index = 0;
    renderLine();
    // The clicked option is replaced; keep keyboard focus in the conversation
    // so Enter can finish typing and Tab reaches the new set of choices.
    q("[data-vn-reading]").focus({ preventScroll: true });
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
      var empty = document.createElement("li");
      empty.className = "vn-history-empty";
      empty.textContent = "まだ記録はありません。";
      container.appendChild(empty);
    }
    entries.forEach(function (entry, i) {
      var item = document.createElement("li"),
        text = document.createElement("p");
      if (!i || entries[i - 1].reply !== entry.reply) {
        var speaker = document.createElement("strong");
        speaker.textContent = entry.reply ? "あなた" : data.characters[currentId].name;
        item.appendChild(speaker);
      }
      if (entry.reply) item.className = "vn-history-reply";
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
    if (!story || index < story.lines.length - 1 || state === "typing") return;
    var offeredStory = story;
    function addReply(label, attribute, onChoose, value) {
      if (!target.firstElementChild) {
        var heading = document.createElement("span");
        heading.className = "vn-choice-heading";
        heading.setAttribute("aria-hidden", "true");
        heading.textContent = target.getAttribute("aria-label");
        target.appendChild(heading);
      }
      var offeredState = state;
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      if (attribute) button.setAttribute(attribute, value || "");
      button.addEventListener("click", function () {
        if (story !== offeredStory || state !== offeredState || !button.isConnected ||
            panel || !visible || gameActive) return;
        onChoose();
        // Some browsers do not focus buttons tapped with a pointer.
        if (!panel && story !== offeredStory) q("[data-vn-reading]").focus({ preventScroll: true });
      });
      target.appendChild(button);
    }
    if (!story.choices || !story.choices.length) {
      renderFollowups(addReply);
      return;
    }
    setState("choice");
    story.choices.forEach(function (choice, choiceIndex) {
      addReply(choice.label, choice.next && "data-vn-choice-next", function () {
        var level = data.tier(affinity[currentId]);
        affinity[currentId] = Math.min(
          100,
          Math.max(0, affinity[currentId] + choice.delta)
        );
        persist();
        updateAffinity();
        history.push({
          character: currentId,
          reply: true,
          text: choice.label,
        });
        if (choice.next) {
          startBranchNode(choice.next, level);
          return;
        }
        var response = pick(
          currentId + ":choice:" + choiceIndex + ":" + level,
          [choice.responses[level]].concat(
            (choice.responseVariations || [])[level] || []
          )
        );
        story = { lines: [response], label: "返事" };
        index = 0;
        renderLine();
      }, choice.next);
    });
    q("#live2d-interact").textContent = "選択 ▸";
  }
  function renderFollowups(action) {
    if (branchTopic) {
      var topicId = branchTopic.id;
      action("別のことも聞く", "data-vn-return-topic", function () {
        start("branch:" + topicId);
      });
      action("話題を変える", "data-vn-return-topics", function () {
        panelOpen("topics");
      });
    } else if (lastTopic.indexOf("friend:") === 0) {
      var friendTopic = lastTopic;
      action("もう少し聞かせて", "data-vn-friend-more", function () {
        start(friendTopic);
      });
      action("別の人のこと", "data-vn-friend-back", function () {
        panelOpen("friends");
      });
    } else {
      suggestedTopics().forEach(function (topic) {
        // Suggestions continue a finished line; auto mode never activates one.
        action(topic.label, "data-vn-suggest-topic", function () {
          start("branch:" + topic.id);
        });
      });
    }
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
    var text = q("[data-live2d-dialogue-text]");
    text.removeAttribute("data-unread");
    text.textContent = line.text;
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
    syncReplyIdle(true);
    scheduleAuto();
  }
  function renderLine() {
    clearTimers();
    resetReplies();
    logged = false;
    visitedReplies = false;
    line = story.lines[index];
    if (!line) return;
    // Start a reply-bearing line at its final reading position. Revealing the
    // buttons then leaves the sentence exactly where the reader's eye was.
    var reading = q("[data-vn-reading]");
    // Keep the full sentence available throughout the visual ink reveal.
    reading.setAttribute("aria-label", line.text);
    var expectsReplies = index === story.lines.length - 1 &&
      Boolean((story.choices && story.choices.length) || branchTopic ||
        lastTopic.startsWith("friend:") || suggestedTopics().length);
    reading.toggleAttribute("data-expects-replies", expectsReplies);
    q(".vn-scene-frame").toggleAttribute("data-replies-pending", expectsReplies);
    var choices = q("[data-vn-choices]");
    if (choices.contains(document.activeElement))
      q("[data-vn-reading]").focus({ preventScroll: true });
    choices.replaceChildren();
    var body = q("[data-vn-dialogue-body]");
    body.scrollTop = 0;
    if (root.style.getPropertyValue("--vn-reading-extension")) {
      var main = q(".vn-main-view");
      var bounds = main.getBoundingClientRect();
      var offset = q(".companion-conversation").getBoundingClientRect().top - bounds.top;
      if (offset < 0 && bounds.height) main.scrollTop += offset * main.offsetHeight / bounds.height;
    }
    var text = q("[data-live2d-dialogue-text]");
    text.replaceChildren();
    text.dataset.unread = line.text;
    q("#live2d-interact").textContent = "次へ ▸";
    q("#live2d-interact").disabled = false;
    q("#live2d-dialogue").setAttribute("aria-hidden", "false");
    q("#live2d-dialogue").classList.add("is-visible");
    root.classList.add("has-dialogue");
    setState("typing");
    hooks.perform(line);
    if (voiceReactions) voiceReactions.play(currentId, line);
    if (speed === 0 || !motion.matches) {
      complete();
      return;
    }
    var speech = window.CompanionSpeech.plan(line.text),
      chars = speech.chars,
      position = 0,
      offset = 0,
      run = generation;
    function tick() {
      if (run !== generation) return;
      if (!visible || gameActive || document.hidden) {
        timer = setTimeout(tick, 250);
        return;
      }
      var character = chars[position++];
      var glyph = document.createElement("span");
      glyph.className = "vn-ink";
      glyph.textContent = character;
      text.appendChild(glyph);
      offset += character.length;
      text.dataset.unread = line.text.slice(offset);
      var duration = speech.duration(position - 1, speed);
      if (speech.units[position - 1].length)
        hooks.speak(chars[position - 1], duration, speech.units[position - 1]);
      if (position >= chars.length) {
        complete();
        return;
      }
      timer = setTimeout(tick, duration);
    }
    tick();
  }
  function start(topic) {
    closePanel();
    if (topic === "friends") {
      panelOpen("friends");
      return;
    }
    lastTopic = topic || "today";
    branchTopic = null;
    delete root.dataset.vnBranchNode;
    if (lastTopic.indexOf("branch:") === 0) {
      var tree = branches();
      branchTopic =
        tree &&
        tree.topics.find(function (topic) {
          return topic.id === lastTopic.slice(7);
        });
      if (branchTopic) startBranchNode(branchTopic.entry);
      else panelOpen("topics");
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
        lines: [
          pick(
            currentId + ":friend:" + remark.id,
            [remark].concat(remark.variants || [])
          ),
        ],
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
        pick: pick,
      });
    }
    index = 0;
    renderLine();
  }
  function advance() {
    if (!visible || gameActive || panel || restoreReplies() || state === "choice") return;
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
    resetReplies();
    if (voiceReactions) voiceReactions.stop();
    story = null;
    branchTopic = null;
    delete root.dataset.vnBranchNode;
    line = null;
    index = 0;
    setState("idle");
    q("[data-vn-choices]").replaceChildren();
    var text = q("[data-live2d-dialogue-text]");
    text.removeAttribute("data-unread");
    text.textContent = "……";
    q("[data-vn-reading]").setAttribute("aria-label", "……");
    q("[data-vn-reading]").removeAttribute("data-expects-replies");
    q(".vn-scene-frame").removeAttribute("data-replies-pending");
    q("[data-vn-announcement]").textContent = "";
    q("#live2d-interact").textContent = "話題 ▸";
    q("#live2d-interact").disabled = false;
  }
  function setCharacter(id) {
    if (!root || !data.characters[id] || currentId === id) return;
    clearTimeout(readyTimer);
    loadingUntil = 0;
    currentId = id;
    closePanel();
    cancel();
    var character = data.characters[id];
    root.dataset.vnCharacter = id;
    if (bgm) bgm.setCharacter(id);
    q("[data-companion-name]").textContent = "Playground";
    var nameplate = q("[data-live2d-dialogue-name]");
    var name = document.createElement("span");
    name.className = "vn-speaker-name";
    name.textContent = character.name;
    var portrait = document.createElement("img");
    portrait.alt = "";
    portrait.src = window.SiteAssets.characterIcon(id);
    portrait.width = portrait.height = 24;
    nameplate.replaceChildren(portrait, name);
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
    clearTimeout(readyTimer);
    if (status === "loading") {
      // Library and model loading belong to the same visible loading interval.
      if (!loadingUntil) loadingUntil = performance.now() + minimumLoadingMs;
    } else {
      var remaining = Math.ceil(loadingUntil - performance.now());
      if (status === "ready" && remaining > 0) {
        readyTimer = setTimeout(function () { setReady("ready"); }, remaining);
        return;
      }
      loadingUntil = 0;
    }
    root.classList.toggle("is-loading", status === "loading");
    root.classList.toggle("has-live2d-error", status === "error");
    q("[data-companion-stage]").setAttribute(
      "aria-busy",
      String(status === "loading")
    );
    q("[data-vn-load-label]").textContent =
      status === "error" ? "接続できませんでした" : "少女祈祷中…";

    q("[data-vn-retry]").hidden = status !== "error";
    if (status === "ready" && !story && !panel && !gameActive) start("today");
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
    if (voiceReactions) voiceReactions.setGameActive(value);
    if (bgm) bgm.setGameActive(value);
    closePanel();
    q(".vn-main-view").hidden = value;
    q(".vn-main-view").inert = value;
    syncReplyIdle();
    if (value) {
      clearTimeout(autoTimer);
      hooks.stopSpeaking();
    } else scheduleAuto();
    document.dispatchEvent(
      new CustomEvent("site:companion-game", { detail: { active: value } })
    );
  }
  function bindLensDial(input) {
    var dial = input.closest(".pg-lens-dial"), drag = null, skipClick = false;
    function turn(value) {
      if (value === input.valueAsNumber) return;
      input.valueAsNumber = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    dial.addEventListener("pointerdown", function (event) {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, stop: input.valueAsNumber };
      skipClick = false;
      dial.setPointerCapture(event.pointerId);
    });
    dial.addEventListener("pointermove", function (event) {
      if (!drag || event.pointerId !== drag.id) return;
      var dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!skipClick && Math.max(Math.abs(dx), Math.abs(dy)) < 7) return;
      if (!skipClick && Math.abs(dy) > Math.abs(dx)) {
        skipClick = true;
        drag = null;
        return;
      }
      skipClick = true;
      var stop = drag.stop + Math.round(dx / 18);
      turn(Math.max(0, Math.min(Number(input.max), stop)));
    });
    dial.addEventListener("pointercancel", function () { skipClick = true; });
    dial.addEventListener("lostpointercapture", function () { drag = null; });
    dial.addEventListener("click", function (event) {
      // The label and the dial face are one target. Skip native label forwarding
      // so a tap advances exactly once, even when it lands on the range itself.
      event.preventDefault();
      input.focus({ preventScroll: true });
      if (!skipClick || event.detail === 0) turn((input.valueAsNumber + 1) % (Number(input.max) + 1));
      skipClick = false;
    });
  }

  function mountViewfinder() {
    q(".companion-stage").insertAdjacentHTML("beforeend",
      '<div class="pg-scene-mount" aria-hidden="true" inert>' +
        '<svg class="pg-viewfinder-grid" viewBox="0 0 300 300" preserveAspectRatio="none" focusable="false">' +
          '<defs><path id="pg-third-lines" d="M100 0v300 M200 0v300 M0 100h300 M0 200h300" vector-effect="non-scaling-stroke"/></defs>' +
          '<use href="#pg-third-lines" class="pg-grid-shadow"/><use href="#pg-third-lines" class="pg-grid-ink"/>' +
        '</svg></div>');
    // Anchor the instrument to the part of the frame left clear by replies.
    q(".vn-actor-area").insertAdjacentHTML("beforeend",
      '<span class="pg-lens-readout"><span class="pg-lens-mode"></span>' +
        '<span data-pg-focus-plane></span><span class="pg-lens-divider">·</span><span data-pg-aperture></span></span>');

    var deck = document.createElement("div");
    deck.className = "pg-lens-deck";
    deck.setAttribute("role", "group");
    deck.setAttribute("aria-label", "撮影レンズ");
    var focusStops = ["auto"].concat(Object.keys(focusPlanes));
    function addDial(key, label, stops) {
      deck.insertAdjacentHTML("beforeend",
        '<label class="pg-lens-dial" data-lens-dial="' + key + '" title="クリックで一段、左右にドラッグして調整">' +
          '<span class="pg-dial-face" aria-hidden="true"></span>' +
          '<input type="range" class="pg-dial-input" data-vn-' + key + '-dial min="0" max="' + (stops.length - 1) +
            '" step="1" aria-label="' + label + '" aria-description="左右の矢印キーで調整">' +
          '<span class="pg-dial-copy" aria-hidden="true"><span class="pg-dial-label">' + label +
            '</span><span class="pg-dial-value"></span></span></label>');
      var input = deck.lastElementChild.querySelector("input");
      bindLensDial(input);
      return input;
    }
    var focus = addDial("focus", "ピント", focusStops), iris = addDial("aperture", "絞り", apertureStops);
    var roster = q(".pg-roster");
    if (roster) roster.append(deck);
    else q(".vn-scene-frame").after(deck);

    function showStop(input, index, text, spoken) {
      var label = input.closest(".pg-lens-dial");
      input.valueAsNumber = index;
      input.setAttribute("aria-valuetext", spoken || text);
      label.style.setProperty("--dial-angle", (-135 + 270 * index / Number(input.max)) + "deg");
      label.querySelector(".pg-dial-value").textContent = text;
    }
    function applyLens() {
      var auto = lensFocusMode === "auto";
      var planeName = focusPlanes[auto ? "subject" : lensFocusPlane];
      var fStop = "f/" + lensFNumber;
      showStop(focus, auto ? 0 : focusStops.indexOf(lensFocusPlane), auto ? "AF · 自動" : planeName,
        auto ? "自動・顔追従" : "手動・" + planeName);
      showStop(iris, apertureStops.indexOf(lensFNumber), fStop);
      root.dataset.lensFocusMode = lensFocusMode;
      root.dataset.lensFocusPlane = lensFocusPlane;
      root.dataset.lensFNumber = lensFNumber;
      q(".pg-lens-mode").textContent = auto ? "AF" : "MF";
      q("[data-pg-focus-plane]").textContent = planeName;
      q("[data-pg-aperture]").textContent = fStop;
      if (hooks.lighting) hooks.lighting();
    }
    deck.addEventListener("input", function (event) {
      if (event.target === focus) {
        var stop = focusStops[focus.valueAsNumber];
        lensFocusMode = stop === "auto" ? "auto" : "manual";
        if (stop !== "auto") lensFocusPlane = stop;
      } else if (event.target === iris) {
        lensFNumber = apertureStops[iris.valueAsNumber];
      }
      applyLens();
      persist();
    });
    applyLens();
  }
  function arrangePlayground(mainView, template) {
    var workspace = template.content.cloneNode(true);
    var roster = workspace.querySelector(".pg-roster");
    var cast = q(".vn-cast");
    cast.querySelectorAll("[data-vn-character]").forEach(function (button) {
      var character = data.characters[button.dataset.vnCharacter];
      var name = document.createElement("strong");
      name.textContent = character.name;
      var place = document.createElement("small");
      place.textContent = character.location.split("·").pop().trim();
      var label = document.createElement("span");
      label.append(name, place);
      button.replaceChildren(button.querySelector("img"), label);
    });
    roster.append(cast);
    workspace.querySelector(".pg-dialogue-desk").append(
      q(".companion-conversation"), q(".companion-footer")
    );
    workspace.querySelector(".pg-radio").append(q(".vn-bgm"));
    var arcade = q(".vn-arcade-entry");
    arcade.innerHTML = '<img class="pg-app-icon" alt=""><span class="pg-app-title">弾幕遊戯</span><span class="pg-app-detail">スコアアタック・対戦</span>';
    arcade.querySelector("img").src = window.SiteAssets.url("/assets/images/classic/icons/16/playground.svg");
    var forecast = q(".vn-weather-strip");
    var weatherTitle = forecast.querySelector(".vn-weather-brand");
    weatherTitle.classList.add("pg-app-title");
    weatherTitle.textContent = "天気観測";
    forecast.querySelector("[data-vn-weather-summary]").classList.add("pg-app-detail");
    forecast.lastElementChild.remove();
    forecast.insertAdjacentHTML("afterbegin", '<svg class="pg-app-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><use href="#weather-icon-observe"></use></svg>');
    workspace.querySelector(".pg-launchers").append(arcade, forecast);
    mainView.append(workspace);
    roster.after(q(".vn-scene-frame"));
  }

  function mountDialogueReading(main) {
    var frame = q(".companion-conversation");
    var body = q("[data-vn-dialogue-body]");
    var scene = q(".vn-scene-frame"), choices = q("[data-vn-choices]");
    var stage = q("[data-companion-stage]");
    var extension = 0, extendedReplies = false, pending = 0;

    function updateCue() {
      var overflow = body.scrollHeight - body.clientHeight;
      frame.classList.toggle("has-more-dialogue", overflow - body.scrollTop > 2);
      // A keyboard reader can enter a long passage before tabbing to its replies.
      body.tabIndex = overflow > 1 || extension ? 0 : -1;
    }
    function fit() {
      pending = 0;
      if (main.inert || !main.clientHeight || !body.clientHeight) return;
      // Measure the reserved subtitle band, even when the previous line was
      // long. Apply the new height before paint and keep the reader's position.
      // The narrow layout opens a row below the actor. Use the actual wrapped
      // menu height, including when text zoom makes a reply occupy more lines.
      var sceneStyle = getComputedStyle(scene);
      if (choices.childElementCount && sceneStyle.getPropertyValue("--vn-command-min")) {
        var menuHeight = (choices.scrollHeight + choices.offsetHeight - choices.clientHeight) + "px";
        if (scene.style.getPropertyValue("--vn-menu-height") !== menuHeight)
          scene.style.setProperty("--vn-menu-height", menuHeight);
      } else if (!scene.hasAttribute("data-replies-pending")) {
        scene.style.removeProperty("--vn-menu-height");
      }
      var top = main.scrollTop;
      if (extension) root.style.removeProperty("--vn-reading-extension");
      if (extendedReplies) root.removeAttribute("data-extended-replies");
      var scrolls = main.scrollHeight > main.clientHeight + 1 &&
        /^(auto|scroll)$/.test(getComputedStyle(main).overflowY);
      root.toggleAttribute("data-scrollable-workspace", scrolls);
      // Keep a single scroll owner even if each reply wraps to several lines.
      var replyOverflow = choices.scrollHeight - choices.clientHeight;
      // The command row is intentionally clipped while the camera is panning.
      // Only its fully-open size can establish whether this is a long reply.
      var opening = parseFloat(sceneStyle.getPropertyValue("--vn-reply-reveal")) < 1;
      extendedReplies = scrolls && !opening && choices.clientHeight > 0 && replyOverflow > 1;
      if (extendedReplies) {
        root.style.setProperty("--vn-reply-frame-height", (scene.offsetHeight + replyOverflow + 1) + "px");
        root.style.setProperty("--vn-reply-camera-height", stage.offsetHeight + "px");
        root.setAttribute("data-extended-replies", "");
      }
      var extra = body.scrollHeight - body.clientHeight;
      extension = scrolls && extra > 1 ? extra + 1 : 0;
      if (extension) root.style.setProperty("--vn-reading-extension", extension + "px");
      if (main.scrollTop !== top) main.scrollTop = top;
      updateCue();
    }
    function schedule() {
      if (!pending) pending = requestAnimationFrame(fit);
    }
    var observer = new ResizeObserver(schedule);
    [main, body, q("#live2d-dialogue"), choices].concat(Array.from(main.children))
      .forEach(function (element) { observer.observe(element); });
    var changes = new MutationObserver(schedule);
    changes.observe(choices, { childList: true });
    changes.observe(main, { attributes: true, attributeFilter: ["inert"] });
    function afterPan(event) {
      if (event.target === scene && event.propertyName === "--vn-reply-reveal") schedule();
    }
    scene.addEventListener("transitionend", afterPan);
    scene.addEventListener("transitioncancel", afterPan);
    body.addEventListener("scroll", updateCue, { passive: true });
  }
  function observeReplyActivity() {
    var menu = q("[data-vn-choices]"), readingArea = "[data-vn-choices], [data-vn-dialogue-body]";
    var hoverDevice = matchMedia("(any-hover: hover)");
    var pointerX, pointerY;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        var entry = entries[entries.length - 1];
        repliesInView = entry.isIntersecting && entry.intersectionRect.height > 0 && entry.intersectionRect.width > 0;
        syncReplyIdle();
      }).observe(menu);
    } else repliesInView = true;
    window.addEventListener("blur", function () {
      pageBlurred = true;
      pressedPointers.clear();
      hoveredReply = null;
      syncReplyIdle();
    });
    window.addEventListener("focus", function () { pageBlurred = false; syncReplyIdle(); });
    new MutationObserver(function () { syncReplyIdle(); }).observe(q("[data-radio-open]"), {
      attributes: true, attributeFilter: ["aria-expanded"]
    });
    root.addEventListener("pointermove", function (event) {
      if (!event.isTrusted || event.pointerType === "touch") return;
      // WebKit can report zero movementX/Y even for physical mouse travel.
      var moved = event.movementX || event.movementY ||
        (pointerX !== undefined && (event.clientX !== pointerX || event.clientY !== pointerY));
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!moved || !menu.childElementCount) return;
      // A button appearing under a still cursor, or a touch-generated mouseover,
      // is not a deliberate hover. Only physical pointer travel can claim it.
      var reply = event.target.closest("[data-vn-choices] button");
      if (reply && hoverDevice.matches) {
        if (hoveredReply !== reply) {
          hoveredReply = reply;
          syncReplyIdle(true);
        }
      } else if (event.target.closest(readingArea)) noteReplyActivity();
    }, { passive: true });
    menu.addEventListener("pointerout", function (event) {
      if (hoveredReply && !hoveredReply.contains(event.relatedTarget)) {
        hoveredReply = null;
        syncReplyIdle(true);
      }
    });
    // Wait until the browser has placed focus at its destination. Moving
    // between replies holds the menu; tabbing away starts a fresh interval.
    function focusChanged() { queueMicrotask(function () { syncReplyIdle(true); }); }
    menu.addEventListener("focusin", focusChanged);
    menu.addEventListener("focusout", focusChanged);
    root.addEventListener("pointerdown", function (event) {
      if (menu.childElementCount && event.target.closest(readingArea)) pressedPointers.add(event.pointerId);
      syncReplyIdle(true);
    }, { passive: true });
    function releasePointer(event) {
      if (pressedPointers.delete(event.pointerId)) syncReplyIdle(true);
    }
    document.addEventListener("pointerup", releasePointer, true);
    document.addEventListener("pointercancel", releasePointer, true);
    root.addEventListener("wheel", noteReplyActivity, { passive: true });
    root.addEventListener("keydown", function (event) {
      if (event.isTrusted) syncReplyIdle(true);
    }, true);
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
    standalone = document.body.dataset.playgroundStandalone === "true";
    motion = matchMedia("(prefers-reduced-motion: no-preference)");
    function syncMotionPreference() {
      if (!motion.matches && state === "typing") complete();
    }
    if (motion.addEventListener) motion.addEventListener("change", syncMotionPreference);
    else if (motion.addListener) motion.addListener(syncMotionPreference);
    q("[data-companion-stage]").insertAdjacentHTML(
      "afterbegin",
      '<div class="vn-scene-light" aria-hidden="true"></div><div class="vn-scene-caption" data-vn-location></div>'
    );
    var loader = q(".companion-load-status");
    loader.replaceChildren(
      document.getElementById("prayer-loader-template").content.cloneNode(true)
    );
    minimumLoadingMs = Number(loader.querySelector(".prayer-loader").dataset.loadingMinMs) || 0;
    loader
      .querySelector("[data-prayer-label]")
      .setAttribute("data-vn-load-label", "");
    loader.insertAdjacentHTML(
      "beforeend",
      '<button type="button" data-vn-retry hidden>再試行</button>'
    );
    q("[data-companion-content]").insertAdjacentHTML(
      "afterbegin",
      '<div class="vn-cast" role="group" aria-label="話し相手">' +
        Object.keys(data.characters)
          .map(function (id) {
            return (
              '<button type="button" data-vn-character="' +
              id +
              '"><img width="24" height="24" alt="">' +
              data.characters[id].name +
              "</button>"
            );
          })
          .join("") +
        "</div>"
    );
    q(".vn-cast")
      .querySelectorAll("[data-vn-character]")
      .forEach(function (button) {
        button.querySelector("img").src = window.SiteAssets.characterIcon(
          button.dataset.vnCharacter
        );
      });
    q("[data-companion-conversation]").innerHTML =
      '<div class="vn-nameplate"><strong data-live2d-dialogue-name></strong><span class="vn-affinity"><meter data-vn-affinity-meter min="0" max="100" aria-label="親密度"></meter><span data-vn-affinity></span></span></div><div class="vn-dialogue-body" data-vn-dialogue-body role="region" aria-label="台詞"><aside id="live2d-dialogue" class="live2d-dialogue is-visible" aria-hidden="false"><div class="vn-reading" data-vn-reading role="button" tabindex="0" aria-description="会話を進める"><p class="live2d-dialogue__text" id="vn-spoken-line" data-live2d-dialogue-text></p><span class="vn-next-mark" aria-hidden="true">▾</span></div></aside></div>' +
      '<span class="vn-dialogue-ornament" aria-hidden="true"></span><span class="visually-hidden" data-vn-announcement aria-live="polite" aria-atomic="true"></span>';
    q("[data-companion-footer]").innerHTML =
      '<button type="button" data-vn-open="topics" aria-expanded="false">話題</button><button type="button" data-vn-auto aria-pressed="false">自動</button><button type="button" data-vn-open="history" aria-expanded="false">履歴</button><button type="button" data-vn-open="settings" aria-expanded="false">設定</button><button type="button" id="live2d-interact" class="live2d-interact">次へ ▸</button>';
    q("[data-companion-content]").insertAdjacentHTML(
      "beforeend",
      '<button class="vn-weather-strip" type="button" data-vn-open="weather" aria-expanded="false"><span class="vn-weather-brand">非想天則</span><span data-vn-weather-summary>観測中…</span><span aria-hidden="true">▴</span></button>' +
        '<section class="vn-panel vn-dialog-panel" data-vn-panel="topics" hidden aria-label="話題"><header><h2>話題</h2><button type="button" data-vn-close aria-label="閉じる">×</button></header><div class="vn-topic-list" data-vn-topic-list></div></section>' +
        '<section class="vn-panel vn-dialog-panel" data-vn-panel="friends" hidden aria-label="友人のこと"><header><h2>友人のこと</h2><button type="button" data-vn-close aria-label="閉じる">×</button></header><div class="vn-friends-list" data-vn-friends-list></div></section>' +
        '<section class="vn-panel vn-dialog-panel" data-vn-panel="settings" hidden aria-label="設定"><header><h2>設定</h2><button type="button" data-vn-close aria-label="閉じる">×</button></header><fieldset class="vn-setting-group"><legend>会話</legend><label for="vn-affinity">親密度 <output id="vn-affinity-output" data-vn-affinity-output></output></label><input id="vn-affinity" data-vn-affinity-input type="range" min="0" max="100" step="1"><label for="vn-speed">文字速度</label><select id="vn-speed" data-vn-speed><option value="65">ゆっくり</option><option value="38">ふつう</option><option value="18">はやい</option><option value="0">一括表示</option></select><label class="vn-check"><input type="checkbox" data-vn-fold-replies> ' + (replyIdleMs / 1000) + '秒操作がないと返事をたたむ</label></fieldset><fieldset class="vn-setting-group"><legend>場面演出</legend><label class="vn-check"><input type="checkbox" data-vn-lighting> 環境光・撮影効果</label><label for="vn-light-strength">効果の強さ <output data-vn-light-output></output></label><input id="vn-light-strength" data-vn-light-strength type="range" min="0" max="100" step="1"></fieldset><button type="button" data-vn-reset-position>元の位置へ</button></section>' +
        '<section class="vn-panel vn-dialog-panel" data-vn-panel="history" hidden aria-label="履歴"><header><h2>履歴</h2><button type="button" data-vn-close aria-label="閉じる">×</button></header><ol class="vn-history" data-vn-history-list aria-label="会話の記録" tabindex="0"></ol></section>' +
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
    var stage = q("[data-companion-stage]");
    var scene = document.createElement("div");
    scene.className = "vn-scene-frame";
    stage.before(scene);
    scene.appendChild(stage);
    scene.insertAdjacentHTML("beforeend",
      '<div class="vn-actor-area" aria-hidden="true" inert></div>' +
      '<div class="vn-choices vn-scene-choices" data-vn-choices role="group" aria-label="返事" aria-describedby="vn-spoken-line"></div>');
    if (window.CompanionAtmosphere) window.CompanionAtmosphere.mount(scene);
    bgm = window.CompanionBGM.mount(root);
    observeReplyActivity();
    bgm.setVisible(visible);
    voiceReactions = window.CompanionVoiceReactions.mount(root, {
      current: function () {
        return { character: currentId, line: line };
      },
    });
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
      if (target.hasAttribute("data-vn-topic-start")) {
        start(target.dataset.vnTopicStart);
        if (!panel) q("[data-vn-reading]").focus({ preventScroll: true });
      }
      if (target.hasAttribute("data-vn-character"))
        hooks.select(target.dataset.vnCharacter);
      if (target.id === "live2d-interact") {
        var firstReply = state === "choice" && q("[data-vn-choices] button");
        if (firstReply) firstReply.focus();
        else advance();
      }
      if (target.hasAttribute("data-vn-auto")) {
        auto = !auto;
        target.setAttribute("aria-pressed", String(auto));
        scheduleAuto();
      }
      if (target.hasAttribute("data-vn-retry")) hooks.retry();
      if (target.hasAttribute("data-vn-reset-position")) {
        hooks.resetPosition();
        closePanel();
        panelOpener("settings").focus({ preventScroll: true });
      }
    });
    q("[data-vn-reading]").addEventListener("click", advance);
    q("[data-vn-choices]").addEventListener("focusin", function () {
      visitedReplies = true;
    });
    q("[data-vn-reading]").addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        advance();
      }
    });
    root.addEventListener("keydown", function (event) {
      var choice = event.target.closest(".vn-choices button");
      var direction = event.key;
      // The scene precedes the speaker in DOM order. A reader who finished a
      // line by keyboard can still tab directly from that line to its replies.
      if ((state === "choice" || !visitedReplies) && event.key === "Tab" && !event.shiftKey &&
          event.target.matches("[data-vn-reading]")) {
        var firstReply = q("[data-vn-choices] button");
        if (firstReply) {
          event.preventDefault();
          firstReply.focus();
        }
      }
      if (choice) {
        if (direction === "ArrowRight") direction = "ArrowDown";
        if (direction === "ArrowLeft") direction = "ArrowUp";
      }
      if (
        choice &&
        ["ArrowUp", "ArrowDown", "Home", "End"].indexOf(direction) !== -1
      ) {
        var options = Array.from(
          q(".vn-choices").querySelectorAll("button:not(:disabled)")
        );
        var at = options.indexOf(choice),
          next =
            direction === "Home"
              ? 0
              : direction === "End"
                ? options.length - 1
                : (at + (direction === "ArrowDown" ? 1 : -1) + options.length) %
                  options.length;
        event.preventDefault();
        options[next].focus();
      }
      if (event.key === "Tab" && panel) {
        var activePanel = q('[data-vn-panel="' + panel + '"]');
        var stops = Array.from(
          activePanel.querySelectorAll(
            'button, input, select, a[href], summary, [tabindex="0"]'
          )
        ).filter(function (element) {
          return (
            !element.disabled &&
            element.getClientRects().length &&
            element.checkVisibility({ visibilityProperty: true })
          );
        });
        var first = stops[0],
          last = stops[stops.length - 1];
        if (
          first &&
          ((event.shiftKey && document.activeElement === first) ||
            (!event.shiftKey && document.activeElement === last))
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
      if (event.key === "Escape" && panel) {
        event.preventDefault();
        event.stopPropagation();
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
    q("[data-vn-fold-replies]").addEventListener("change", function (event) {
      foldIdleReplies = event.target.checked;
      persist();
      if (!foldIdleReplies) restoreReplies(false);
      syncReplyIdle(true);
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
        ? window.__siteWeather.temperature + "°C · 更新できませんでした"
        : "天気を取得できません";
    });
    document.addEventListener("visibilitychange", function () {
      syncReplyIdle();
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
    var workspace = document.getElementById("playground-workspace");
    if (workspace) arrangePlayground(mainView, workspace);
    mountViewfinder();
    mountDialogueReading(mainView);
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
      syncReplyIdle();
      if (voiceReactions) voiceReactions.setVisible(value);
      if (bgm) bgm.setVisible(value);
      if (window.CompanionDanmaku) window.CompanionDanmaku.setVisible(value);
      if (!value) {
        clearTimeout(autoTimer);
        if (hooks) hooks.stopSpeaking();
      } else scheduleAuto();
    },
    start: start,
  };
})();
