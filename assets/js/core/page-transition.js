(function () {
  if (document.body.dataset.playgroundStandalone === "true") return;
  if (window.__sitePageTransitionBootstrapped) return;
  window.__sitePageTransitionBootstrapped = true;

  var activeNavigation = null;
  var renderedUrl = new URL(window.location.href);
  var renderedEntry = null;
  var entrySequence = 0;
  var scrollPositions = new Map();
  var boundNavigation = false;

  function isModifiedClick(event) {
    return (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    );
  }

  function hasNonHtmlExtension(url) {
    var match = url.pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
    if (!match) return false;

    var ext = match[1];
    return ext !== "html" && ext !== "htm";
  }

  function isSameDocument(url, current) {
    return (
      url.origin === current.origin &&
      url.pathname === current.pathname &&
      url.search === current.search
    );
  }

  function internalPageUrl(anchor, event) {
    if (isModifiedClick(event)) return null;
    if (
      anchor.hasAttribute("download") ||
      anchor.hasAttribute("data-full-navigation")
    )
      return null;

    var target = (anchor.getAttribute("target") || "").toLowerCase();
    if (target && target !== "_self") return null;

    var rawHref = anchor.getAttribute("href");
    if (
      !rawHref ||
      rawHref.indexOf("mailto:") === 0 ||
      rawHref.indexOf("tel:") === 0 ||
      rawHref.indexOf("javascript:") === 0
    ) {
      return null;
    }

    var url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch (e) {
      return null;
    }

    if (url.origin !== window.location.origin || hasNonHtmlExtension(url)) return null;
    return url;
  }

  function canSoftNavigate() {
    return Boolean(
      window.fetch && window.DOMParser && document.getElementById("main")
    );
  }

  function hardNavigate(url) {
    // A failed Back/Forward fetch is already at its destination URL. Reloading
    // that entry also works for fragments and keeps the forward history intact.
    if (url === window.location.href) window.location.reload();
    else window.location.assign(url);
  }

  function syncHeadTag(nextDoc, selector, attrName) {
    var nextHead = nextDoc && nextDoc.head;
    if (!nextHead) return;

    var nextTag = nextHead.querySelector(selector);
    var currentTag = document.head.querySelector(selector);

    if (!nextTag) {
      if (currentTag && currentTag.parentNode) {
        currentTag.parentNode.removeChild(currentTag);
      }
      return;
    }

    if (!currentTag) {
      document.head.appendChild(nextTag.cloneNode(true));
      return;
    }

    var nextValue = nextTag.getAttribute(attrName);
    if (nextValue != null) {
      currentTag.setAttribute(attrName, nextValue);
    }
  }

  function updateDocumentMeta(nextDoc) {
    if (!nextDoc) return;

    if (nextDoc.title) {
      document.title = nextDoc.title;
    }

    var nextLang = nextDoc.documentElement
      ? nextDoc.documentElement.getAttribute("lang")
      : "";
    if (nextLang) {
      document.documentElement.setAttribute("lang", nextLang);
    }

    syncHeadTag(nextDoc, "link[rel='canonical']", "href");
    syncHeadTag(nextDoc, "meta[property='og:url']", "content");
    syncHeadTag(nextDoc, "meta[property='og:title']", "content");
    syncHeadTag(nextDoc, "meta[property='og:description']", "content");
    syncHeadTag(nextDoc, "meta[name='description']", "content");
  }

  function syncBodyDataAttribute(nextBody, attributeName) {
    var nextValue = nextBody.getAttribute(attributeName);
    if (nextValue != null) {
      document.body.setAttribute(attributeName, nextValue);
    } else {
      document.body.removeAttribute(attributeName);
    }
  }

  function applyBodyClass(nextBody) {
    if (!document.body || !nextBody) return;

    var nextClasses = (nextBody.getAttribute("class") || "")
      .trim()
      .split(/\s+/)
      .filter(function (className) {
        return className && className !== "home-loading";
      })
      .join(" ");

    document.body.className = nextClasses;

    syncBodyDataAttribute(nextBody, "data-disable-live2d");
    syncBodyDataAttribute(nextBody, "data-disable-mouse-firework");
  }

  function replaceMain(nextDoc) {
    var currentMain = document.getElementById("main");
    var nextMain = nextDoc.getElementById("main");
    if (!currentMain || !nextMain) return null;

    var imported = document.importNode
      ? document.importNode(nextMain, true)
      : nextMain.cloneNode(true);

    document.dispatchEvent(new CustomEvent("site:before-content-replace"));
    currentMain.parentNode.replaceChild(imported, currentMain);
    return imported;
  }

  function isRunnableScriptType(typeValue) {
    var value = (typeValue || "").trim().toLowerCase();
    if (!value) return true;

    return (
      value === "text/javascript" ||
      value === "application/javascript" ||
      value === "text/ecmascript" ||
      value === "application/ecmascript" ||
      value === "module"
    );
  }

  function executeScripts(container) {
    if (!container) return;

    var scripts = container.querySelectorAll("script");
    Array.prototype.forEach.call(scripts, function (oldScript) {
      if (!isRunnableScriptType(oldScript.getAttribute("type"))) return;

      var script = document.createElement("script");
      Array.prototype.forEach.call(oldScript.attributes, function (attr) {
        script.setAttribute(attr.name, attr.value);
      });

      if (!oldScript.src) {
        var typeValue = (oldScript.getAttribute("type") || "")
          .trim()
          .toLowerCase();
        var source = oldScript.textContent || "";
        script.textContent =
          typeValue === "module"
            ? source
            : "(function () {\n" + source + "\n})();";
      }

      oldScript.parentNode.replaceChild(script, oldScript);
    });
  }

  function dispatchContentUpdated(url) {
    var detail = { url: url.href };
    var event;

    if (typeof window.CustomEvent === "function") {
      event = new CustomEvent("site:content-updated", { detail: detail });
    } else {
      event = document.createEvent("CustomEvent");
      event.initCustomEvent("site:content-updated", false, false, detail);
    }

    document.dispatchEvent(event);
  }

  function runPostSwapHooks(url) {
    dispatchContentUpdated(url);
  }

  function anchorTarget(url) {
    if (!url.hash) return null;
    var id = url.hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch (e) {
      // Malformed fragments may still be literal IDs; never break navigation.
    }
    return document.getElementById(id);
  }

  function historyState(url) {
    var current = window.history.state || renderedEntry;
    return {
      __siteSoftNav: true,
      __siteEntryIndex: current && Number.isSafeInteger(current.__siteEntryIndex)
        ? current.__siteEntryIndex + 1 : 0,
      __siteScrollKey: Date.now().toString(36) + ":" + entrySequence++,
      url: url.href,
    };
  }

  function ensureHistoryEntry(url) {
    var state = window.history.state;
    if (!state || !state.__siteScrollKey || !Number.isSafeInteger(state.__siteEntryIndex)) {
      var entry = historyState(url);
      if (state && state.__siteScrollKey) entry.__siteScrollKey = state.__siteScrollKey;
      state = Object.assign({}, state, entry);
      window.history.replaceState(state, "", url.href);
    }
    return state;
  }

  function visibleAnchor(target) {
    if (!target || target.getAttribute("aria-hidden") !== "true") return target;
    // Some section URLs use an invisible marker just before the visible heading.
    var heading = target.nextElementSibling;
    return heading && heading.matches("h1,h2,h3,h4,h5,h6") ? heading : null;
  }

  function focusAnchor(target) {
    if (!target) return;
    var temporaryTabindex = !target.hasAttribute("tabindex");
    if (temporaryTabindex) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    if (temporaryTabindex) {
      target.addEventListener("blur", function cleanup() {
        if (target.getAttribute("tabindex") === "-1")
          target.removeAttribute("tabindex");
      }, { once: true });
    }
  }

  function navigateToAnchor(url, target) {
    rememberScroll();
    cancelNavigation();
    if (url.href !== window.location.href)
      window.history.pushState(historyState(url), "", url.href);
    renderedUrl = url;
    renderedEntry = ensureHistoryEntry(url);
    document.dispatchEvent(new Event("site:anchor-navigated"));
    var behavior = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth";
    if (target) {
      focusAnchor(visibleAnchor(target));
      target.scrollIntoView({ behavior: behavior, block: "start" });
    } else if (!url.hash) {
      window.scrollTo({ left: 0, top: 0, behavior: behavior });
    }
  }

  function scrollAfterNavigation(url, position) {
    if (position) {
      window.scrollTo({ left: position.x, top: position.y, behavior: "instant" });
      return;
    }
    var target = anchorTarget(url);
    if (target) {
      target.scrollIntoView({ behavior: "instant", block: "start" });
      return;
    }

    window.scrollTo({ left: 0, top: 0, behavior: "instant" });
  }

  function animateDocument(main, backward, target) {
    if (!matchMedia("screen and (prefers-reduced-motion: no-preference)").matches) return;
    // Gallery nests its persistent dock in the article, beside the document.
    var panel = main.querySelector("article.classic-document, article .classic-document");
    if (!panel) return;
    var title = target && panel.contains(target) && target.matches("h1,h2,h3,h4,h5,h6")
      ? target : panel.querySelector("h1,h2");
    if (title) title.classList.add("document-entry-heading");
    panel.dataset.documentEntry = backward ? "back" : "forward";

    function finish(event) {
      if (event.target !== panel || event.animationName !== "classic-document-enter") return;
      delete panel.dataset.documentEntry;
      if (title) title.classList.remove("document-entry-heading");
      panel.removeEventListener("animationend", finish);
      panel.removeEventListener("animationcancel", finish);
    }
    panel.addEventListener("animationend", finish);
    panel.addEventListener("animationcancel", finish);
  }

  function softNavigate(url, options, request) {
    return fetch(url.href, {
      credentials: "same-origin",
      signal: request.controller ? request.controller.signal : undefined,
      headers: {
        "X-Requested-With": "site-page-transition",
      },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to fetch page: " + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        // A slow response must never overwrite a more recent click or Back.
        if (request !== activeNavigation) return;
        var parser = new DOMParser();
        var nextDoc = parser.parseFromString(html, "text/html");

        // A standalone app has its own shell; never transplant it into the homepage.
        if (
          nextDoc.body.dataset.playgroundStandalone !==
          document.body.dataset.playgroundStandalone
        ) {
          throw new Error("Page shell changed");
        }
        if (!nextDoc.getElementById("main")) {
          throw new Error("Missing #main in target page");
        }
        updateDocumentMeta(nextDoc);
        applyBodyClass(nextDoc.body);

        var insertedMain = replaceMain(nextDoc);
        if (!insertedMain) {
          throw new Error("Missing #main in target page");
        }

        executeScripts(insertedMain);

        if (!options || !options.skipHistory) {
          if (
            window.history &&
            typeof window.history.pushState === "function"
          ) {
            window.history.pushState(
              historyState(url),
              "",
              url.href
            );
          }
        }

        runPostSwapHooks(url);
        renderedUrl = url;
        renderedEntry = ensureHistoryEntry(url);
        insertedMain.setAttribute("aria-busy", "false");
        // Focus and scroll commit immediately, independent of visual motion.
        var target = options && options.skipHistory ? null : visibleAnchor(anchorTarget(url));
        animateDocument(insertedMain, options && options.backward, target);
        focusAnchor(target || insertedMain);
        scrollAfterNavigation(url, options && options.position);
      });
  }

  function clearNavigation(request) {
    if (!request) return;
    clearTimeout(request.timeout);
    if (activeNavigation !== request) return;
    activeNavigation = null;
    document.documentElement.removeAttribute("data-navigation-pending");
    var main = document.getElementById("main");
    if (main) main.setAttribute("aria-busy", "false");
  }

  function cancelNavigation() {
    var request = activeNavigation;
    clearNavigation(request);
    if (request && request.controller) request.controller.abort();
  }

  function rememberScroll() {
    scrollPositions.set(renderedEntry ? renderedEntry.__siteScrollKey : renderedUrl.href, {
      x: window.scrollX,
      y: window.scrollY,
    });
    // Bound the cache for long-lived gallery/radio sessions.
    if (scrollPositions.size > 40)
      scrollPositions.delete(scrollPositions.keys().next().value);
  }

  function navigateWithTransition(url, options) {
    var targetUrl;
    try {
      targetUrl = new URL(url, window.location.href);
    } catch (e) {
      hardNavigate(url);
      return;
    }
    rememberScroll();
    cancelNavigation();
    var request = {
      controller: window.AbortController ? new AbortController() : null,
      timeout: 0,
    };
    activeNavigation = request;
    document.documentElement.setAttribute("data-navigation-pending", "true");
    var main = document.getElementById("main");
    if (main) main.setAttribute("aria-busy", "true");

    function fallbackToHardNavigation() {
      if (request !== activeNavigation) return;
      clearNavigation(request);
      if (request.controller) request.controller.abort();
      hardNavigate(targetUrl.href);
    }

    function startSwap() {
      if (!canSoftNavigate()) {
        fallbackToHardNavigation();
        return;
      }

      request.timeout = setTimeout(fallbackToHardNavigation, 12000);
      softNavigate(targetUrl, options, request)
        .then(function () {
          clearNavigation(request);
        })
        .catch(fallbackToHardNavigation);
    }

    startSwap();
  }

  function bindNavigationTransition() {
    if (boundNavigation) return;
    boundNavigation = true;

    document.addEventListener(
      "click",
      function (event) {
        var anchor = event.target.closest("a[href]");
        if (!anchor) return;
        var url = internalPageUrl(anchor, event);
        if (!url) return;
        event.preventDefault();
        // Removing a fragment or revisiting the current tab only moves the
        // reading position. Keep the mounted widgets, gallery order and filters.
        if (isSameDocument(url, renderedUrl)) navigateToAnchor(url, anchorTarget(url));
        else navigateWithTransition(url.href);
      },
      true
    );

    window.addEventListener("popstate", function () {
      var url = new URL(window.location.href);
      var entry = ensureHistoryEntry(url);
      var position = scrollPositions.get(entry.__siteScrollKey);
      rememberScroll();
      cancelNavigation();
      if (
        url.pathname === renderedUrl.pathname &&
        url.search === renderedUrl.search
      ) {
        renderedUrl = url;
        renderedEntry = entry;
        scrollAfterNavigation(url, position);
        if (position) {
          // An interrupted smooth anchor can still deliver a compositor scroll
          // in the next frame, even after an instant scroll to the same pixel.
          requestAnimationFrame(function () {
            if (!activeNavigation && renderedEntry.__siteScrollKey === entry.__siteScrollKey &&
              (window.scrollX !== position.x || window.scrollY !== position.y)) {
              scrollAfterNavigation(url, position);
            }
          });
        }
        return;
      }
      navigateWithTransition(url.href, {
        skipHistory: true,
        backward: !!renderedEntry && entry.__siteEntryIndex < renderedEntry.__siteEntryIndex,
        position: position,
      });
    });
    window.addEventListener("hashchange", function () {
      var url = new URL(window.location.href);
      if (
        url.pathname === renderedUrl.pathname &&
        url.search === renderedUrl.search
      ) {
        renderedUrl = url;
        renderedEntry = ensureHistoryEntry(url);
      }
    });
  }

  function init() {
    if (canSoftNavigate() && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    var url = new URL(window.location.href);
    // History may already have moved again while a fallback reload was parsing.
    // The navigation timing entry identifies the HTML actually on screen.
    var loaded = window.performance && performance.getEntriesByType
      ? performance.getEntriesByType("navigation")[0] : null;
    renderedUrl = loaded ? new URL(loaded.name) : renderedUrl;
    if (window.history && typeof window.history.replaceState === "function") {
      try {
        renderedEntry = ensureHistoryEntry(url);
      } catch (e) {
        // Ignore history errors.
      }
    }

    bindNavigationTransition();
    if (isSameDocument(url, renderedUrl)) renderedUrl = url;
    else navigateWithTransition(url.href, { skipHistory: true });
  }

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) cancelNavigation();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
