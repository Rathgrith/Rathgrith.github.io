(function () {
  var LAYER_CLASS = "paper-click-layer";
  var MARK_CLASS = "paper-click-mark";
  var MAX_MARKS = 12;
  var REMOVE_AFTER_MS = 760;
  var activeMarks = [];
  var bound = false;
  var layer = null;

  function shouldReduceMotion() {
    return window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function ensureLayer() {
    if (layer && document.body && document.body.contains(layer)) return layer;
    if (!document.body) return null;

    layer = document.querySelector("." + LAYER_CLASS);
    if (layer) return layer;

    layer = document.createElement("div");
    layer.className = LAYER_CLASS;
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    return layer;
  }

  function pruneMarks() {
    while (activeMarks.length > MAX_MARKS) {
      var oldMark = activeMarks.shift();
      if (oldMark && oldMark.parentNode) oldMark.parentNode.removeChild(oldMark);
    }
  }

  function removeMark(mark) {
    var index = activeMarks.indexOf(mark);
    if (index !== -1) activeMarks.splice(index, 1);
    if (mark && mark.parentNode) mark.parentNode.removeChild(mark);
  }

  function createMark(event) {
    if (document.body && document.body.getAttribute("data-disable-paper-click-effect") === "true") return;
    if (shouldReduceMotion()) return;
    if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    var root = ensureLayer();
    if (!root) return;

    var mark = document.createElement("span");
    var variant = (activeMarks.length % 4) + 1;
    var rotation = Math.round((Math.random() * 34) - 17);

    mark.className = MARK_CLASS + " " + MARK_CLASS + "--" + variant;
    mark.style.setProperty("--click-x", event.clientX + "px");
    mark.style.setProperty("--click-y", event.clientY + "px");
    mark.style.setProperty("--click-rotate", rotation + "deg");

    root.appendChild(mark);
    activeMarks.push(mark);
    pruneMarks();

    mark.addEventListener("animationend", function () {
      removeMark(mark);
    }, { once: true });

    window.setTimeout(function () {
      removeMark(mark);
    }, REMOVE_AFTER_MS);
  }

  function init() {
    if (bound || !document.body) return;
    if (document.body.getAttribute("data-disable-paper-click-effect") === "true") return;

    bound = true;
    document.addEventListener("pointerdown", createMark, { passive: true, capture: true });
  }

  document.addEventListener("site:content-updated", init);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
