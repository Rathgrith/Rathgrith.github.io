(function () {
  if (window.__siteGalleryPageScriptBound) {
    if (typeof window.__siteInitGalleryPage === "function") {
      window.__siteInitGalleryPage();
    }
    return;
  }
  window.__siteGalleryPageScriptBound = true;

  var INITIAL_BATCH_SIZE = 10;
  var LOAD_BATCH_SIZE = 10;
  var LOAD_ALL_CHUNK_SIZE = 20;
  var MODAL_STRIP_RADIUS = 6;

  var state = {
    gallery: null,
    captions: {},
    filenames: [],
    items: [],
    thumbnailDir: "",
    originalDir: "",
    currentIndex: -1,
    isOpen: false,
    triggerElement: null,
    modalRefs: null,
    preloaded: {},
    rendering: false
  };

  function parseCaptions() {
    var dataNode = document.getElementById("gallery-captions-data");
    if (!dataNode) return {};

    try {
      var parsed = JSON.parse(dataNode.textContent || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function normaliseCaption(filename) {
    var entry = state.captions[filename];
    if (typeof entry === "string") {
      return { caption: entry, camera: "", lens: "" };
    }
    if (!entry || typeof entry !== "object") {
      return { caption: "", camera: "", lens: "" };
    }

    var camera = entry.camera || "";
    var lens = entry.lens || "";
    var gear = entry.gear || "";

    if (!camera && !lens && gear) {
      var parts = gear.split(" + ", 2);
      camera = parts[0] || "";
      lens = parts[1] || "";
    }

    return {
      caption: entry.caption || "",
      camera: camera,
      lens: lens
    };
  }

  function hashString(value) {
    var hash = 2166136261;
    for (var i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function stableGalleryOrder(filenames) {
    return filenames.slice().sort(function (left, right) {
      return hashString(left) - hashString(right) || left.localeCompare(right);
    });
  }

  function createElement(tagName, className, text) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    if (typeof text === "string") element.textContent = text;
    return element;
  }

  function getModalRefs() {
    var root = document.getElementById("gallery-modal");
    if (!root) return null;
    if (state.modalRefs && state.modalRefs.root === root) return state.modalRefs;

    state.modalRefs = {
      root: root,
      image: document.getElementById("gallery-modal-image"),
      caption: document.getElementById("gallery-modal-caption"),
      gear: document.getElementById("gallery-modal-gear"),
      counter: document.getElementById("gallery-modal-counter"),
      strip: document.getElementById("gallery-modal-strip"),
      closeButton: root.querySelector(".gallery-modal__close")
    };
    return state.modalRefs;
  }

  function renderGear(element, entry) {
    if (!element) return;
    var parts = [];
    if (entry.camera) parts.push(entry.camera);
    if (entry.lens) parts.push(entry.lens);

    element.textContent = parts.join("  ·  ");
    element.hidden = !parts.length;
  }

  function renderedFilenames() {
    return state.items.map(function (item) {
      return item.filename;
    });
  }

  function wrapIndex(index, total) {
    return total ? (index % total + total) % total : -1;
  }

  function preloadModalImage(index) {
    var total = state.items.length;
    var normalized = wrapIndex(index, total);
    if (normalized < 0) return;

    var filename = state.items[normalized].filename;
    if (!filename || state.preloaded[filename]) return;
    state.preloaded[filename] = true;

    var image = new Image();
    image.decoding = "async";
    image.src = state.originalDir + filename;
  }

  function modalStripIndices(total, current) {
    if (total <= MODAL_STRIP_RADIUS * 2 + 1) {
      return Array.from({ length: total }, function (_, index) { return index; });
    }

    var indices = [];
    for (var offset = -MODAL_STRIP_RADIUS; offset <= MODAL_STRIP_RADIUS; offset += 1) {
      indices.push(wrapIndex(current + offset, total));
    }
    return indices;
  }

  function renderModalStrip(refs, current) {
    if (!refs || !refs.strip) return;
    var total = state.items.length;
    var indices = modalStripIndices(total, current);
    var fragment = document.createDocumentFragment();
    var activeId = "";

    indices.forEach(function (index) {
      var item = state.items[index];
      var entry = normaliseCaption(item.filename);
      var button = createElement("button", "gallery-modal__thumb");
      var buttonId = "gallery-modal-thumb-" + index;

      button.type = "button";
      button.id = buttonId;
      button.setAttribute("data-gallery-thumb-index", String(index));
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", index === current ? "true" : "false");
      button.setAttribute(
        "aria-label",
        entry.caption ? entry.caption + " (" + (index + 1) + ")" : "Image " + (index + 1)
      );
      button.classList.toggle("is-active", index === current);
      if (entry.caption) button.title = entry.caption;

      var image = createElement("img", "gallery-modal__thumb-image");
      image.src = state.thumbnailDir + item.filename;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      button.appendChild(image);
      fragment.appendChild(button);

      if (index === current) activeId = buttonId;
    });

    refs.strip.replaceChildren(fragment);
    if (activeId) refs.strip.setAttribute("aria-activedescendant", activeId);
  }

  function updateModalContent() {
    var refs = getModalRefs();
    var total = state.items.length;
    if (!refs || !refs.image || !refs.caption || !refs.counter || !total) return;

    state.currentIndex = wrapIndex(state.currentIndex, total);
    var item = state.items[state.currentIndex];
    var entry = normaliseCaption(item.filename);

    refs.image.src = state.originalDir + item.filename;
    refs.image.alt = entry.caption || "Gallery image";
    refs.caption.textContent = entry.caption;
    refs.counter.textContent = state.currentIndex + 1 + " / " + total;
    renderGear(refs.gear, entry);
    renderModalStrip(refs, state.currentIndex);

    preloadModalImage(state.currentIndex - 1);
    preloadModalImage(state.currentIndex + 1);
  }

  function openModal(index, triggerElement) {
    var refs = getModalRefs();
    if (!refs || !state.items.length || index < 0 || index >= state.items.length) return;

    state.isOpen = true;
    state.currentIndex = index;
    state.triggerElement = triggerElement || null;
    refs.root.hidden = false;
    refs.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("gallery-modal-open");
    updateModalContent();

    window.requestAnimationFrame(function () {
      if (refs.closeButton) refs.closeButton.focus();
    });
  }

  function closeModal() {
    var refs = getModalRefs();
    if (!refs || !state.isOpen) return;

    state.isOpen = false;
    refs.root.hidden = true;
    refs.root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("gallery-modal-open");

    if (state.triggerElement && document.contains(state.triggerElement)) {
      state.triggerElement.focus();
    }
    state.triggerElement = null;
  }

  function stepModal(offset) {
    if (!state.isOpen || !state.items.length) return;
    state.currentIndex = wrapIndex(state.currentIndex + offset, state.items.length);
    updateModalContent();
  }

  function bindModalEvents() {
    var refs = getModalRefs();
    if (!refs || refs.root.getAttribute("data-gallery-modal-bound") === "true") return;
    refs.root.setAttribute("data-gallery-modal-bound", "true");

    refs.root.addEventListener("click", function (event) {
      var closeTarget = event.target.closest("[data-gallery-close]");
      var previousTarget = event.target.closest("[data-gallery-prev]");
      var nextTarget = event.target.closest("[data-gallery-next]");
      var thumb = event.target.closest("[data-gallery-thumb-index]");

      if (closeTarget) closeModal();
      else if (previousTarget) stepModal(-1);
      else if (nextTarget) stepModal(1);
      else if (thumb) {
        var index = Number(thumb.getAttribute("data-gallery-thumb-index"));
        if (!isNaN(index)) {
          state.currentIndex = index;
          updateModalContent();
        }
      } else {
        return;
      }
      event.preventDefault();
    });
  }

  function bindGlobalKeyboardEvents() {
    if (window.__siteGalleryModalKeyBound) return;
    window.__siteGalleryModalKeyBound = true;

    document.addEventListener("keydown", function (event) {
      if (!state.isOpen) return;
      if (event.key === "Escape") closeModal();
      else if (event.key === "ArrowLeft") stepModal(-1);
      else if (event.key === "ArrowRight") stepModal(1);
      else return;
      event.preventDefault();
    });
  }

  function createGalleryItem(filename, indexInBatch) {
    var entry = normaliseCaption(filename);
    var anchor = createElement("a");
    var image = createElement("img");
    var zoom = createElement("span", "gallery-card__zoom");
    var icon = createElement("i", "fas fa-search-plus");
    var caption = createElement("div", "caption", entry.caption);
    var item = createElement("div", "gallery-item");

    anchor.href = state.originalDir + filename;
    anchor.setAttribute("data-gallery-filename", filename);
    anchor.setAttribute("aria-label", entry.caption ? "Open " + entry.caption : "Open image preview");

    image.src = state.thumbnailDir + filename;
    image.alt = entry.caption || "Gallery image";
    image.loading = "lazy";
    image.decoding = "async";
    image.fetchPriority = indexInBatch < 4 && !state.items.length ? "high" : "low";

    zoom.setAttribute("aria-hidden", "true");
    zoom.appendChild(icon);
    anchor.appendChild(image);
    anchor.appendChild(zoom);

    if (entry.caption) caption.title = entry.caption;
    item.style.setProperty("--gallery-reveal-delay", Math.min(indexInBatch, 8) * 45 + "ms");
    item.appendChild(anchor);
    item.appendChild(caption);

    return { filename: filename, anchor: anchor, element: item };
  }

  function revealItems(items) {
    window.requestAnimationFrame(function () {
      items.forEach(function (item) {
        item.element.classList.add("is-visible");
      });
    });
  }

  function appendBatch(count) {
    if (!state.gallery || count <= 0) return 0;
    var start = state.items.length;
    var end = Math.min(start + count, state.filenames.length);
    var fragment = document.createDocumentFragment();
    var additions = [];

    for (var index = start; index < end; index += 1) {
      var item = createGalleryItem(state.filenames[index], index - start);
      state.items.push(item);
      additions.push(item);
      fragment.appendChild(item.element);
    }

    state.gallery.appendChild(fragment);
    revealItems(additions);
    return additions.length;
  }

  function setButtonState(button, options) {
    if (!button) return;
    var label = button.querySelector(".gallery-action__label");
    var icon = button.querySelector(".gallery-action__icon i");

    button.disabled = Boolean(options.disabled);
    button.classList.toggle("is-loading", Boolean(options.loading));
    button.setAttribute("aria-busy", options.loading ? "true" : "false");
    if (label && options.label) label.textContent = options.label;
    if (icon && options.icon) icon.className = options.icon;
  }

  function updateControls(refs) {
    var complete = state.items.length >= state.filenames.length;
    if (refs.actions) refs.actions.classList.toggle("is-complete", complete);

    if (refs.more) {
      setButtonState(refs.more, {
        disabled: complete || state.rendering,
        loading: false,
        label: complete ? refs.more.dataset.doneLabel : refs.more.dataset.defaultLabel,
        icon: complete ? refs.more.dataset.doneIcon : refs.more.dataset.icon
      });
    }

    if (refs.all) {
      refs.all.hidden = complete;
      refs.all.setAttribute("aria-hidden", complete ? "true" : "false");
      refs.all.tabIndex = complete ? -1 : 0;
      setButtonState(refs.all, {
        disabled: complete || state.rendering,
        loading: false,
        label: complete ? refs.all.dataset.doneLabel : refs.all.dataset.defaultLabel,
        icon: complete ? refs.all.dataset.doneIcon : refs.all.dataset.icon
      });
    }
  }

  function setControlsLoading(refs, activeButton) {
    [refs.more, refs.all].forEach(function (button) {
      if (!button) return;
      setButtonState(button, {
        disabled: true,
        loading: button === activeButton
      });
    });
  }

  function loadAllInChunks(refs, galleryAtStart) {
    function nextChunk() {
      if (state.gallery !== galleryAtStart || !document.contains(galleryAtStart)) {
        state.rendering = false;
        return;
      }

      appendBatch(LOAD_ALL_CHUNK_SIZE);
      if (state.items.length < state.filenames.length) {
        window.requestAnimationFrame(nextChunk);
        return;
      }

      state.rendering = false;
      updateControls(refs);
    }
    window.requestAnimationFrame(nextChunk);
  }

  function bindGalleryEvents(refs) {
    state.gallery.addEventListener("click", function (event) {
      var anchor = event.target.closest("a[data-gallery-filename]");
      if (!anchor || !state.gallery.contains(anchor)) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      var index = state.items.findIndex(function (item) {
        return item.anchor === anchor;
      });
      if (index >= 0) openModal(index, anchor);
    }, true);

    if (refs.more) {
      refs.more.addEventListener("click", function () {
        if (state.rendering) return;
        state.rendering = true;
        setControlsLoading(refs, refs.more);
        window.requestAnimationFrame(function () {
          appendBatch(LOAD_BATCH_SIZE);
          state.rendering = false;
          updateControls(refs);
        });
      });
    }

    if (refs.all) {
      refs.all.addEventListener("click", function () {
        if (state.rendering) return;
        state.rendering = true;
        setControlsLoading(refs, refs.all);
        loadAllInChunks(refs, state.gallery);
      });
    }
  }

  function resetState() {
    state.gallery = null;
    state.items = [];
    state.currentIndex = -1;
    state.isOpen = false;
    state.triggerElement = null;
    state.modalRefs = null;
    state.preloaded = {};
    state.rendering = false;
    document.body.classList.remove("gallery-modal-open");
  }

  function initGalleryPage() {
    var gallery = document.getElementById("gallery");
    if (!gallery) {
      resetState();
      return;
    }
    if (gallery.getAttribute("data-gallery-bound") === "true") return;

    var container = gallery.closest(".gallery-container");
    if (!container) return;
    gallery.setAttribute("data-gallery-bound", "true");

    state.gallery = gallery;
    state.captions = parseCaptions();
    state.filenames = stableGalleryOrder(Object.keys(state.captions));
    state.items = [];
    state.thumbnailDir = (container.getAttribute("data-thumbnail-dir") || "").trim();
    state.originalDir = (container.getAttribute("data-original-dir") || "").trim();
    state.currentIndex = -1;
    state.isOpen = false;
    state.modalRefs = null;
    state.preloaded = {};
    state.rendering = false;

    var refs = {
      actions: container.querySelector(".gallery-actions"),
      more: container.querySelector("#load-more"),
      all: container.querySelector("#load-all")
    };

    bindModalEvents();
    bindGlobalKeyboardEvents();
    bindGalleryEvents(refs);
    appendBatch(INITIAL_BATCH_SIZE);
    updateControls(refs);
  }

  window.__siteInitGalleryPage = initGalleryPage;
  document.addEventListener("site:content-updated", initGalleryPage);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGalleryPage);
  } else {
    initGalleryPage();
  }
})();
