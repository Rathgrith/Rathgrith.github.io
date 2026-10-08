(function () {
  if (window.__siteGalleryPageScriptBound) {
    if (typeof window.__siteInitGalleryPage === "function") {
      window.__siteInitGalleryPage();
    }
    return;
  }
  window.__siteGalleryPageScriptBound = true;

  var MODAL_STRIP_RADIUS = 6;

  var state = {
    gallery: null,
    captions: {},
    items: [],
    thumbnailDir: "",
    originalDir: "",
    currentIndex: -1,
    isOpen: false,
    triggerElement: null,
    modalRefs: null,
    modalMount: null,
    preloaded: {},
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
      lens: lens,
    };
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
    if (state.modalRefs && state.modalRefs.root === root)
      return state.modalRefs;

    state.modalRefs = {
      root: root,
      image: document.getElementById("gallery-modal-image"),
      caption: document.getElementById("gallery-modal-caption"),
      gear: document.getElementById("gallery-modal-gear"),
      counter: document.getElementById("gallery-modal-counter"),
      strip: document.getElementById("gallery-modal-strip"),
      closeButton: root.querySelector(".gallery-modal__close"),
      placeholder: root.querySelector("[data-gallery-placeholder]"),
      status: root.querySelector("[data-gallery-status]"),
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

  function wrapIndex(index, total) {
    return total ? ((index % total) + total) % total : -1;
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
      return Array.from({ length: total }, function (_, index) {
        return index;
      });
    }

    var indices = [];
    for (
      var offset = -MODAL_STRIP_RADIUS;
      offset <= MODAL_STRIP_RADIUS;
      offset += 1
    ) {
      indices.push(wrapIndex(current + offset, total));
    }
    return indices;
  }

  function centerModalActiveThumbnail(refs) {
    if (!refs || !refs.strip) return;
    // Center within the strip only; scrollIntoView can also move the page.
    window.requestAnimationFrame(function () {
      var active = refs.strip.querySelector(".is-active");
      if (!active) return;
      var stripRect = refs.strip.getBoundingClientRect();
      var activeRect = active.getBoundingClientRect();
      refs.strip.scrollLeft += activeRect.left - stripRect.left - (refs.strip.clientWidth - activeRect.width) / 2;
    });
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
      button.setAttribute(
        "aria-selected",
        index === current ? "true" : "false"
      );
      button.setAttribute(
        "aria-label",
        entry.caption
          ? entry.caption + " (" + (index + 1) + ")"
          : "Image " + (index + 1)
      );
      button.classList.toggle("is-active", index === current);
      button.tabIndex = index === current ? 0 : -1;
      if (entry.caption) button.title = entry.caption;

      var image = createElement("img", "gallery-modal__thumb-image");
      image.src = state.thumbnailDir + item.filename;
      image.alt = "";
      image.loading = "eager";
      image.decoding = "async";
      button.appendChild(image);
      fragment.appendChild(button);

      if (index === current) activeId = buttonId;
    });

    var restoreStripFocus = refs.strip.contains(document.activeElement);
    refs.strip.replaceChildren(fragment);
    if (activeId) {
      refs.strip.setAttribute("aria-activedescendant", activeId);
      if (restoreStripFocus) document.getElementById(activeId).focus({ preventScroll: true });
      centerModalActiveThumbnail(refs);
    }
  }

  function updateModalContent() {
    var refs = getModalRefs();
    var total = state.items.length;
    if (!refs || !refs.image || !refs.caption || !refs.counter || !total)
      return;

    state.currentIndex = wrapIndex(state.currentIndex, total);
    var item = state.items[state.currentIndex];
    var entry = normaliseCaption(item.filename);

    // Show the local thumbnail until the large original has decoded.
    // A request token prevents a slow previous photo replacing the next one.
    var requestId = (state.imageRequestId || 0) + 1;
    state.imageRequestId = requestId;
    refs.image.style.opacity = "0";
    refs.placeholder.src = state.thumbnailDir + item.filename;
    refs.placeholder.hidden = false;
    refs.status.textContent = "Loading full-size image…";
    var fullImage = new Image();
    fullImage.src = state.originalDir + item.filename;
    var ready = fullImage.decode ? fullImage.decode() : new Promise(function (resolve, reject) {
      fullImage.onload = resolve;
      fullImage.onerror = reject;
    });
    ready.then(function () {
      if (requestId !== state.imageRequestId || !state.isOpen) return;
      refs.image.src = fullImage.src;
      return refs.image.decode ? refs.image.decode() : Promise.resolve();
    }).then(function () {
      if (requestId !== state.imageRequestId || !state.isOpen) return;
      refs.image.style.opacity = "1";
      refs.placeholder.hidden = true;
      refs.status.textContent = "";
    }).catch(function () {
      if (requestId !== state.imageRequestId || !state.isOpen) return;
      refs.status.textContent = "Full-size image unavailable. Showing preview.";
    });
    refs.image.alt = entry.caption || "Gallery image";
    refs.caption.textContent = entry.caption;
    refs.counter.textContent = state.currentIndex + 1 + " / " + total;
    renderGear(refs.gear, entry);
    renderModalStrip(refs, state.currentIndex);

    preloadModalImage(state.currentIndex - 1);
    preloadModalImage(state.currentIndex + 1);
  }

  function restoreModalMount() {
    var mount = state.modalMount;
    var refs = state.modalRefs;
    if (!mount || !refs) return;
    if (mount.parent.isConnected) {
      var next = mount.next && mount.next.parentNode === mount.parent ? mount.next : null;
      mount.parent.insertBefore(refs.root, next);
    } else {
      // Soft navigation may have replaced the original page while open.
      refs.root.remove();
    }
    state.modalMount = null;
  }

  function openModal(index, triggerElement) {
    var refs = getModalRefs();
    if (
      !refs ||
      !state.items.length ||
      index < 0 ||
      index >= state.items.length
    )
      return;

    state.isOpen = true;
    state.currentIndex = index;
    state.triggerElement = triggerElement || null;
    // Mount outside the document frame so viewport layout and modal stacking
    // remain independent of page navigation.
    if (refs.root.parentNode !== document.body) {
      state.modalMount = { parent: refs.root.parentNode, next: refs.root.nextSibling };
      document.body.appendChild(refs.root);
    }
    refs.root.hidden = false;
    refs.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("gallery-modal-open");
    updateModalContent();

    window.requestAnimationFrame(function () {
      if (refs.closeButton) refs.closeButton.focus({ preventScroll: true });
    });
  }

  function closeModal() {
    var refs = getModalRefs();
    if (!refs || !state.isOpen) return;

    state.isOpen = false;
    refs.root.hidden = true;
    refs.root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("gallery-modal-open");
    restoreModalMount();

    if (state.triggerElement && document.contains(state.triggerElement)) {
      state.triggerElement.focus();
    }
    state.triggerElement = null;
  }

  function stepModal(offset) {
    if (!state.isOpen || !state.items.length) return;
    state.currentIndex = wrapIndex(
      state.currentIndex + offset,
      state.items.length
    );
    updateModalContent();
  }

  function bindModalEvents() {
    var refs = getModalRefs();
    if (!refs || refs.root.getAttribute("data-gallery-modal-bound") === "true")
      return;
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

    window.addEventListener("resize", function () {
      if (state.isOpen) centerModalActiveThumbnail(getModalRefs());
    });

    document.addEventListener("keydown", function (event) {
      if (!state.isOpen) return;
      if (event.key === "Tab") {
        var refs = getModalRefs();
        var controls = refs.root.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]');
        var first = controls[0];
        var last = controls[controls.length - 1];
        if (!refs.root.contains(document.activeElement)) { (event.shiftKey ? last : first).focus(); event.preventDefault(); }
        else if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
        else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
        return;
      }
      if (event.key === "Escape") closeModal();
      else if (event.key === "ArrowLeft") stepModal(-1);
      else if (event.key === "ArrowRight") stepModal(1);
      else return;
      event.preventDefault();
    });
  }

  function bindGalleryEvents() {
    state.gallery.addEventListener(
      "click",
      function (event) {
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
      },
      true
    );
  }

  function resetState() {
    restoreModalMount();
    state.gallery = null;
    state.items = [];
    state.currentIndex = -1;
    state.isOpen = false;
    state.triggerElement = null;
    state.modalRefs = null;
    state.preloaded = {};
    document.body.classList.remove("gallery-modal-open");
  }

  function shuffleCollections(gallery) {
    gallery.querySelectorAll(".classic-showcase-grid").forEach(function (grid) {
      var cards = Array.prototype.slice.call(grid.children);
      for (var i = cards.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var card = cards[i];
        cards[i] = cards[j];
        cards[j] = card;
      }
      var fragment = document.createDocumentFragment();
      cards.forEach(function (card) {
        fragment.appendChild(card);
      });
      grid.appendChild(fragment);
    });
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
    restoreModalMount();
    gallery.setAttribute("data-gallery-bound", "true");

    // Shuffle once per page load, before deriving the viewer's navigation order.
    shuffleCollections(gallery);
    state.gallery = gallery;
    state.captions = parseCaptions();
    state.items = Array.prototype.map.call(gallery.querySelectorAll("a[data-gallery-filename]"), function (anchor) {
      return { filename: anchor.getAttribute("data-gallery-filename"), anchor: anchor, element: anchor.closest("figure") };
    });
    state.thumbnailDir = (
      container.getAttribute("data-thumbnail-dir") || ""
    ).trim();
    state.originalDir = (
      container.getAttribute("data-original-dir") || ""
    ).trim();
    state.currentIndex = -1;
    state.isOpen = false;
    state.modalRefs = null;
    state.preloaded = {};

    bindModalEvents();
    bindGlobalKeyboardEvents();
    bindGalleryEvents();
  }

  window.__siteInitGalleryPage = initGalleryPage;
  document.addEventListener("site:content-updated", initGalleryPage);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGalleryPage);
  } else {
    initGalleryPage();
  }
})();
