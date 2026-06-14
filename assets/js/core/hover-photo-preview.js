(function () {
  var DATA_ID = "gallery-hover-preview-data";
  var TRIGGER_SELECTOR = "[data-gallery-hover-preview]";
  var cachedPool = null;
  var lastFilename = "";

  function parseGalleryPool() {
    var dataNode = document.getElementById(DATA_ID);
    if (!dataNode) return [];

    try {
      var parsed = JSON.parse(dataNode.textContent || "[]");
      var filenames = Array.isArray(parsed) ? parsed : Object.keys(parsed || {});
      return filenames.filter(function (filename) {
        if (typeof filename !== "string") return false;
        return /\.(jpe?g|png|webp|gif)$/i.test(filename);
      });
    } catch (error) {
      return [];
    }
  }

  function getGalleryPool() {
    var currentNode = document.getElementById(DATA_ID);
    if (!currentNode) {
      cachedPool = null;
      return [];
    }

    if (!cachedPool) {
      cachedPool = parseGalleryPool();
    }

    return cachedPool;
  }

  function normaliseDir(value) {
    var dir = String(value || "/images/gallery/thumbnails/").trim();
    if (!dir) dir = "/images/gallery/thumbnails/";
    if (dir.charAt(dir.length - 1) !== "/") dir += "/";
    return dir;
  }

  function pickFilename(pool) {
    if (!pool.length) return "";
    if (pool.length === 1) return pool[0];

    var next = pool[Math.floor(Math.random() * pool.length)];
    if (next === lastFilename) {
      next = pool[(pool.indexOf(next) + 1) % pool.length];
    }
    lastFilename = next;
    return next;
  }

  function updatePreview(trigger) {
    var image = trigger.querySelector(".hover-photo__card img");
    if (!image) return;

    var pool = getGalleryPool();
    var filename = pickFilename(pool);
    if (!filename) return;

    var thumbnailDir = normaliseDir(trigger.getAttribute("data-gallery-thumbnail-dir"));
    var nextSrc = thumbnailDir + filename;
    if (image.getAttribute("src") !== nextSrc) {
      image.setAttribute("src", nextSrc);
    }
    image.setAttribute("alt", "Random gallery preview");
  }

  function bindTrigger(trigger) {
    if (!trigger || trigger.getAttribute("data-gallery-hover-bound") === "true") return;
    trigger.setAttribute("data-gallery-hover-bound", "true");

    trigger.addEventListener("pointerenter", function () {
      updatePreview(trigger);
    });
    trigger.addEventListener("focus", function () {
      updatePreview(trigger);
    });
    trigger.addEventListener("touchstart", function () {
      updatePreview(trigger);
    }, { passive: true });
  }

  function init() {
    cachedPool = null;
    var triggers = document.querySelectorAll(TRIGGER_SELECTOR);
    Array.prototype.forEach.call(triggers, bindTrigger);
  }

  document.addEventListener("site:content-updated", init);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
