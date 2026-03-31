(function () {
  if (window.__siteGalleryPageScriptBound) {
    if (typeof window.__siteInitGalleryPage === "function") {
      window.__siteInitGalleryPage();
    }
    return;
  }
  window.__siteGalleryPageScriptBound = true;

  function parseCaptions() {
    var dataNode = document.getElementById("gallery-captions-data");
    if (!dataNode) return {};
    try {
      var parsed = JSON.parse(dataNode.textContent || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function disableLegacyPopupForAnchor(anchor) {
    if (!anchor) return;

    anchor.classList.remove("image-popup");
    anchor.removeAttribute("data-mfp-src");

    if (!window.jQuery || !window.jQuery.fn) return;
    var $anchor = window.jQuery(anchor);
    if (typeof $anchor.off === "function") {
      $anchor.off("click.magnificPopup");
    }
    if (typeof $anchor.removeData === "function") {
      $anchor.removeData("magnificPopup");
    }
  }

  function disableLegacyPopupInGallery(gallery) {
    if (!gallery) return;
    var anchors = gallery.querySelectorAll("a[data-gallery-filename], a.image-popup");
    Array.prototype.forEach.call(anchors, disableLegacyPopupForAnchor);
  }

  function scheduleLegacyPopupCleanup(gallery) {
    if (!gallery) return;

    function cleanup() {
      disableLegacyPopupInGallery(gallery);
    }

    [0, 120, 300, 700, 1300, 2600, 5000].forEach(function (delay) {
      window.setTimeout(cleanup, delay);
    });
  }

  function shuffleInPlace(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  }

  var galleryModalState = {
    isOpen: false,
    currentIndex: -1,
    filenames: [],
    captions: {},
    thumbnailDir: "",
    originalDir: "",
    triggerElement: null,
    galleryElement: null,
    stripSignature: "",
    stripButtons: []
  };

  function collectRenderedModalItems() {
    var gallery = galleryModalState.galleryElement;
    if (!gallery) return { filenames: [], anchors: [] };

    var anchors = Array.prototype.slice.call(
      gallery.querySelectorAll("a[data-gallery-filename]")
    );
    var filenames = [];

    anchors = anchors.filter(function (anchor) {
      var filename = anchor.getAttribute("data-gallery-filename");
      if (!filename) return false;
      filenames.push(filename);
      return true;
    });

    var nextSignature = filenames.join("\n");
    if (nextSignature !== galleryModalState.stripSignature) {
      galleryModalState.stripSignature = "";
      galleryModalState.stripButtons = [];
    }

    galleryModalState.filenames = filenames;
    return { filenames: filenames, anchors: anchors };
  }

  function getModalRefs() {
    var root = document.getElementById("gallery-modal");
    if (!root) return null;

    return {
      root: root,
      image: document.getElementById("gallery-modal-image"),
      caption: document.getElementById("gallery-modal-caption"),
      counter: document.getElementById("gallery-modal-counter"),
      strip: document.getElementById("gallery-modal-strip"),
      closeButton: root.querySelector(".gallery-modal__close")
    };
  }

  function preloadModalImage(index) {
    if (!galleryModalState.filenames.length) return;

    var total = galleryModalState.filenames.length;
    var normalized = (index + total) % total;
    var filename = galleryModalState.filenames[normalized];
    if (!filename) return;

    var img = new Image();
    img.src = galleryModalState.originalDir + filename;
  }

  function buildModalStrip(refs) {
    if (!refs || !refs.strip) return [];

    var signature = galleryModalState.filenames.join("\n");
    if (signature !== galleryModalState.stripSignature) {
      refs.strip.innerHTML = "";
      galleryModalState.stripButtons = [];
      galleryModalState.stripSignature = signature;

      var fragment = document.createDocumentFragment();
      var baseThumbnailDir = galleryModalState.thumbnailDir || galleryModalState.originalDir;

      galleryModalState.filenames.forEach(function (filename, index) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "gallery-modal__thumb";
        button.id = "gallery-modal-thumb-" + index;
        button.setAttribute("data-gallery-thumb-index", String(index));
        button.setAttribute("role", "option");

        var caption = galleryModalState.captions[filename] || "";
        var label = caption ? caption + " (" + (index + 1) + ")" : "Image " + (index + 1);
        button.setAttribute("aria-label", label);
        if (caption) {
          button.setAttribute("title", caption);
        }

        var image = document.createElement("img");
        image.className = "gallery-modal__thumb-image";
        image.src = baseThumbnailDir + filename;
        image.alt = caption || "Thumbnail " + (index + 1);
        image.loading = "lazy";
        image.decoding = "async";

        button.appendChild(image);
        fragment.appendChild(button);
        galleryModalState.stripButtons.push(button);
      });

      refs.strip.appendChild(fragment);
    }

    return galleryModalState.stripButtons;
  }

  function syncModalStripActive(refs, index) {
    if (!refs || !refs.strip) return;

    var buttons = buildModalStrip(refs);
    if (!buttons.length) return;

    var activeButton = null;
    buttons.forEach(function (button, buttonIndex) {
      var isActive = buttonIndex === index;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive) {
        activeButton = button;
      }
    });

    if (!activeButton) return;

    refs.strip.setAttribute("aria-activedescendant", activeButton.id);
    if (typeof activeButton.scrollIntoView === "function") {
      var smoothAllowed =
        !window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      activeButton.scrollIntoView({
        behavior: smoothAllowed ? "smooth" : "auto",
        block: "nearest",
        inline: "center"
      });
    }
  }

  function updateModalContent() {
    var refs = getModalRefs();
    if (!refs || !refs.image || !refs.caption || !refs.counter) return;
    if (!galleryModalState.filenames.length) return;

    var total = galleryModalState.filenames.length;
    var index = (galleryModalState.currentIndex + total) % total;
    var filename = galleryModalState.filenames[index];
    var captionText = galleryModalState.captions[filename] || "";

    refs.image.src = galleryModalState.originalDir + filename;
    refs.image.alt = captionText || "Gallery image";
    refs.caption.textContent = captionText;
    refs.counter.textContent = index + 1 + " / " + total;
    syncModalStripActive(refs, index);

    preloadModalImage(index - 1);
    preloadModalImage(index + 1);
  }

  function openModal(index, triggerElement) {
    var refs = getModalRefs();
    if (!refs || !refs.root) return;
    collectRenderedModalItems();
    if (!galleryModalState.filenames.length) return;
    if (index < 0 || index >= galleryModalState.filenames.length) return;

    disableLegacyPopupInGallery(galleryModalState.galleryElement);
    if (window.jQuery && window.jQuery.magnificPopup && typeof window.jQuery.magnificPopup.close === "function") {
      window.jQuery.magnificPopup.close();
    }

    galleryModalState.isOpen = true;
    galleryModalState.currentIndex = index;
    galleryModalState.triggerElement = triggerElement || null;

    refs.root.hidden = false;
    refs.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("gallery-modal-open");
    updateModalContent();

    window.setTimeout(function () {
      if (refs.closeButton) {
        refs.closeButton.focus();
      }
    }, 0);
  }

  function closeModal() {
    var refs = getModalRefs();
    if (!refs || !refs.root) return;
    if (!galleryModalState.isOpen) return;

    galleryModalState.isOpen = false;
    refs.root.hidden = true;
    refs.root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("gallery-modal-open");

    if (galleryModalState.triggerElement && typeof galleryModalState.triggerElement.focus === "function") {
      galleryModalState.triggerElement.focus();
    }
  }

  function stepModal(offset) {
    if (!galleryModalState.isOpen || !galleryModalState.filenames.length) return;
    var total = galleryModalState.filenames.length;
    galleryModalState.currentIndex = (galleryModalState.currentIndex + offset + total) % total;
    updateModalContent();
  }

  function bindModalEvents() {
    var refs = getModalRefs();
    if (!refs || !refs.root) return;
    if (refs.root.getAttribute("data-gallery-modal-bound") === "true") return;
    refs.root.setAttribute("data-gallery-modal-bound", "true");

    refs.root.addEventListener("click", function (event) {
      if (event.target.closest("[data-gallery-close]")) {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.target.closest("[data-gallery-prev]")) {
        event.preventDefault();
        stepModal(-1);
        return;
      }

      if (event.target.closest("[data-gallery-next]")) {
        event.preventDefault();
        stepModal(1);
        return;
      }

      var thumb = event.target.closest("[data-gallery-thumb-index]");
      if (thumb) {
        event.preventDefault();
        var thumbIndex = Number(thumb.getAttribute("data-gallery-thumb-index"));
        if (!isNaN(thumbIndex)) {
          galleryModalState.currentIndex = thumbIndex;
          updateModalContent();
        }
      }
    });

    if (window.__siteGalleryModalKeyBound) return;
    window.__siteGalleryModalKeyBound = true;

    document.addEventListener("keydown", function (event) {
      if (!galleryModalState.isOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepModal(-1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        stepModal(1);
      }
    });
  }

  function initGalleryPage() {
    var gallery = document.getElementById("gallery");
    if (!gallery) {
      galleryModalState.isOpen = false;
      galleryModalState.galleryElement = null;
      document.body.classList.remove("gallery-modal-open");
      return;
    }

    var container = gallery.closest(".gallery-container");
    if (!container) return;
    if (gallery.getAttribute("data-gallery-bound") === "true") return;
    gallery.setAttribute("data-gallery-bound", "true");

    var captions = parseCaptions();
    var thumbnailDir = (container.getAttribute("data-thumbnail-dir") || "").trim();
    var originalDir = (container.getAttribute("data-original-dir") || "").trim();

    var galleryActions = document.querySelector(".gallery-actions");
    var loadMoreButton = document.getElementById("load-more");
    var loadAllButton = document.getElementById("load-all");

    var INITIAL_BATCH_SIZE = 10;
    var LOAD_BATCH_SIZE = 5;
    var MIN_LOADING_MS = 260;

    var filenames = shuffleInPlace(Object.keys(captions));
    var renderedFilenames = [];
    var currentIndex = 0;
    var isRenderingBatch = false;

    galleryModalState.filenames = renderedFilenames;
    galleryModalState.captions = captions;
    galleryModalState.thumbnailDir = thumbnailDir;
    galleryModalState.originalDir = originalDir;
    galleryModalState.galleryElement = gallery;
    galleryModalState.currentIndex = 0;
    bindModalEvents();
    scheduleLegacyPopupCleanup(gallery);

    function setButtonLabel(button, text) {
      if (!button) return;
      var label = button.querySelector(".gallery-action__label");
      if (label) {
        label.textContent = text;
        return;
      }
      button.textContent = text;
    }

    function setButtonIcon(button, iconClass) {
      if (!button || !iconClass) return;
      var icon = button.querySelector(".gallery-action__icon i");
      if (!icon) return;
      icon.className = iconClass;
    }

    function setButtonLoading(button, loading) {
      if (!button) return;
      button.classList.toggle("is-loading", loading);
      button.setAttribute("aria-busy", loading ? "true" : "false");
    }

    function setCompletedLayout(completed) {
      if (galleryActions) {
        galleryActions.classList.toggle("is-complete", completed);
      }

      if (loadAllButton) {
        loadAllButton.hidden = completed;
        loadAllButton.style.display = completed ? "none" : "";
        loadAllButton.setAttribute("aria-hidden", completed ? "true" : "false");
        if (completed) {
          loadAllButton.setAttribute("tabindex", "-1");
        } else {
          loadAllButton.removeAttribute("tabindex");
        }
      }
    }

    function createGalleryItem(filename, indexInBatch) {
      var thumbnail = document.createElement("a");
      thumbnail.href = originalDir + filename;
      thumbnail.setAttribute("data-gallery-filename", filename);
      thumbnail.setAttribute("aria-label", "Open image preview");
      disableLegacyPopupForAnchor(thumbnail);

      var img = document.createElement("img");
      img.src = thumbnailDir + filename;
      img.alt = captions[filename];
      img.loading = "lazy";
      img.decoding = "async";
      thumbnail.appendChild(img);

      var caption = document.createElement("div");
      caption.className = "caption";
      caption.textContent = captions[filename];

      var item = document.createElement("div");
      item.className = "gallery-item";
      item.style.transitionDelay = indexInBatch * 60 + "ms";
      item.appendChild(thumbnail);
      item.appendChild(caption);

      return item;
    }

    function revealItems(items) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          items.forEach(function (item) {
            item.classList.add("is-visible");
          });
        });
      });
    }

    function updateButtonState() {
      var remaining = filenames.length - currentIndex;
      var completed = remaining <= 0;
      setCompletedLayout(completed);

      if (loadMoreButton) {
        if (completed) {
          loadMoreButton.dataset.state = "done";
          loadMoreButton.disabled = true;
          setButtonLabel(loadMoreButton, loadMoreButton.dataset.doneLabel || "All photos loaded");
          setButtonIcon(loadMoreButton, loadMoreButton.dataset.doneIcon || "fas fa-check");
        } else {
          loadMoreButton.dataset.state = "ready";
          loadMoreButton.disabled = false;
          setButtonLabel(loadMoreButton, loadMoreButton.dataset.defaultLabel || "Load more photos");
          setButtonIcon(loadMoreButton, loadMoreButton.dataset.icon || "fas fa-plus");
        }
      }

      if (loadAllButton) {
        if (completed) {
          loadAllButton.dataset.state = "done";
          loadAllButton.disabled = true;
          setButtonLabel(loadAllButton, loadAllButton.dataset.doneLabel || "All photos loaded");
          setButtonIcon(loadAllButton, loadAllButton.dataset.doneIcon || "fas fa-check");
        } else {
          loadAllButton.dataset.state = "ready";
          loadAllButton.disabled = false;
          setButtonLabel(loadAllButton, loadAllButton.dataset.defaultLabel || "Load all photos");
          setButtonIcon(loadAllButton, loadAllButton.dataset.icon || "fas fa-layer-group");
        }
      }
    }

    function renderNextBatch(batchSize) {
      if (currentIndex >= filenames.length || batchSize <= 0) return;

      var nextFiles = filenames.slice(currentIndex, currentIndex + batchSize);
      var fragment = document.createDocumentFragment();
      var newItems = [];

      nextFiles.forEach(function (filename, indexInBatch) {
        var item = createGalleryItem(filename, indexInBatch);
        fragment.appendChild(item);
        newItems.push(item);
        renderedFilenames.push(filename);
      });

      gallery.appendChild(fragment);
      scheduleLegacyPopupCleanup(gallery);
      revealItems(newItems);
      currentIndex += nextFiles.length;
    }

    function setLoadingControls(activeButton, loading) {
      [loadMoreButton, loadAllButton].forEach(function (button) {
        if (!button) return;

        if (loading) {
          button.disabled = true;
          setButtonLoading(button, button === activeButton);
          return;
        }

        setButtonLoading(button, false);
      });
    }

    function runBatchAction(button, batchSizeGetter) {
      if (!button || isRenderingBatch || button.disabled) return;

      isRenderingBatch = true;
      setLoadingControls(button, true);
      var start = Date.now();
      var batchSize = batchSizeGetter();

      requestAnimationFrame(function () {
        renderNextBatch(batchSize);

        var elapsed = Date.now() - start;
        var wait = Math.max(0, MIN_LOADING_MS - elapsed);

        window.setTimeout(function () {
          isRenderingBatch = false;
          updateButtonState();
          setLoadingControls(null, false);
        }, wait);
      });
    }

    if (loadMoreButton) {
      loadMoreButton.addEventListener("click", function () {
        runBatchAction(loadMoreButton, function () {
          return LOAD_BATCH_SIZE;
        });
      });
    }

    if (loadAllButton) {
      loadAllButton.addEventListener("click", function () {
        runBatchAction(loadAllButton, function () {
          return filenames.length - currentIndex;
        });
      });
    }

    gallery.addEventListener("click", function (event) {
      var target = event.target;
      if (!target) return;

      var link = target.closest("a[data-gallery-filename]");
      if (!link || !gallery.contains(link)) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      var filename = link.getAttribute("data-gallery-filename");
      if (!filename) return;

      var rendered = collectRenderedModalItems();
      var index = rendered.anchors.indexOf(link);
      if (index < 0) {
        index = rendered.filenames.indexOf(filename);
      }
      if (index < 0) return;

      openModal(index, link);
    }, true);

    renderNextBatch(INITIAL_BATCH_SIZE);
    updateButtonState();
  }

  window.__siteInitGalleryPage = initGalleryPage;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGalleryPage);
  } else {
    initGalleryPage();
  }
  document.addEventListener("site:content-updated", initGalleryPage);
})();
