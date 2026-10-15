(function () {
  var DATA_ID = "gallery-hover-preview-data";
  var TRIGGER_SELECTOR = "[data-gallery-hover-preview]";
  var cachedDataNode = null;
  var cachedPool = [];

  function parseGalleryPool() {
    var dataNode = document.getElementById(DATA_ID);
    if (!dataNode) return [];

    if (dataNode === cachedDataNode) return cachedPool;

    try {
      var parsed = JSON.parse(dataNode.textContent || "[]");
      var filenames = Array.isArray(parsed)
        ? parsed
        : Object.keys(parsed || {});
      cachedPool = filenames.filter(function (filename) {
        return (
          typeof filename === "string" &&
          /\.(jpe?g|png|webp|gif)$/i.test(filename)
        );
      });
    } catch (error) {
      cachedPool = [];
    }

    cachedDataNode = dataNode;
    return cachedPool;
  }

  function normaliseDir(value) {
    var dir = String(value || "/images/gallery/thumbnails/").trim();
    if (!dir) dir = "/images/gallery/thumbnails/";
    return dir.charAt(dir.length - 1) === "/" ? dir : dir + "/";
  }

  function hashString(value) {
    var hash = 2166136261;
    for (var i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function selectStableFilename(trigger, pool) {
    var configured = trigger.getAttribute("data-gallery-preview");
    if (configured && pool.indexOf(configured) !== -1) return configured;
    if (!pool.length) return "";

    var identity = [
      window.location.pathname,
      trigger.textContent.replace(/\s+/g, " ").trim(),
      String(pool.length),
    ].join("|");
    return pool[hashString(identity) % pool.length];
  }

  function initialisePreview(trigger, pool) {
    if (!trigger || trigger.getAttribute("data-gallery-hover-ready") === "true")
      return;

    var image = trigger.querySelector(".hover-photo__card img");
    var filename = selectStableFilename(trigger, pool);
    if (!image || !filename) return;

    image.src =
      normaliseDir(trigger.getAttribute("data-gallery-thumbnail-dir")) +
      encodeURIComponent(filename);
    image.alt = "Photography gallery preview";
    trigger.setAttribute("data-gallery-hover-ready", "true");
  }

  var activeTrigger = null;
  var placementFrame = 0;

  function place(trigger) {
    var card = trigger.querySelector(".hover-photo__card");
    if (!card || !trigger.isConnected) return;
    var anchor = trigger.getBoundingClientRect();
    var bounds = card.getBoundingClientRect();
    card.style.left =
      Math.max(
        16,
        Math.min(
          innerWidth - bounds.width - 16,
          anchor.left + anchor.width / 2 - bounds.width / 2
        )
      ) + "px";
    card.style.top =
      Math.max(
        8,
        anchor.top > bounds.height + 18
          ? anchor.top - bounds.height - 10
          : Math.min(innerHeight - bounds.height - 8, anchor.bottom + 10)
      ) + "px";
  }

  function init() {
    var pool = parseGalleryPool();
    Array.prototype.forEach.call(
      document.querySelectorAll(TRIGGER_SELECTOR),
      function (trigger) {
        initialisePreview(trigger, pool);
      }
    );
  }

  // Delegate once: replaced pages must not retain one resize listener per photo.
  function activate(event) {
    var trigger = event.target.closest && event.target.closest(".hover-photo");
    if (
      !trigger ||
      (event.relatedTarget && trigger.contains(event.relatedTarget))
    )
      return;
    if (activeTrigger && activeTrigger !== trigger)
      activeTrigger.setAttribute("data-preview-dismissed", "true");
    activeTrigger = trigger;
    trigger.removeAttribute("data-preview-dismissed");
    place(trigger);
  }
  function reposition() {
    if (placementFrame || !activeTrigger) return;
    placementFrame = requestAnimationFrame(function () {
      placementFrame = 0;
      if (
        activeTrigger &&
        activeTrigger.isConnected &&
        activeTrigger.matches(":hover, :focus-within")
      )
        place(activeTrigger);
      else activeTrigger = null;
    });
  }
  document.addEventListener("pointerover", activate);
  document.addEventListener("focusin", activate);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && activeTrigger) {
      activeTrigger.setAttribute("data-preview-dismissed", "true");
    }
  });
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, { passive: true });
  document.addEventListener("site:before-content-replace", function () {
    activeTrigger = null;
    cancelAnimationFrame(placementFrame);
    placementFrame = 0;
    cachedDataNode = null;
    cachedPool = [];
  });

  document.addEventListener("site:content-updated", init);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
