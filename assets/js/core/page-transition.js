(function () {
  if (document.body.dataset.playgroundStandalone === "true") return;
  if (window.__sitePageTransitionBootstrapped) return;
  window.__sitePageTransitionBootstrapped = true;

  var activeNavigation = null;
  var renderedUrl = new URL(window.location.href);
  var renderedEntryKey = null;
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

  function isSamePageUrl(url) {
    var current = new URL(window.location.href);
    return (
      url.origin === current.origin &&
      url.pathname === current.pathname &&
      url.search === current.search &&
      url.hash === current.hash
    );
  }

  function isInternalPageLink(anchor, event) {
    if (isModifiedClick(event)) return false;
    if (
      anchor.hasAttribute("download") ||
      anchor.hasAttribute("data-full-navigation")
    )
      return false;

    var target = (anchor.getAttribute("target") || "").toLowerCase();
    if (target && target !== "_self") return false;

    var rawHref = anchor.getAttribute("href");
    if (
      !rawHref ||
      rawHref.indexOf("mailto:") === 0 ||
      rawHref.indexOf("tel:") === 0 ||
      rawHref.indexOf("javascript:") === 0
    ) {
      return false;
    }

    var url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch (e) {
      return false;
    }

    if (url.origin !== window.location.origin) return false;
    if (isSamePageUrl(url) && !activeNavigation) return false;
    if (hasNonHtmlExtension(url)) return false;

    return true;
  }

  function canSoftNavigate() {
    return Boolean(
      window.fetch && window.DOMParser && document.getElementById("main")
    );
  }

  function hardNavigate(url) {
    window.location.assign(url);
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
    return {
      __siteSoftNav: true,
      __siteScrollKey: Date.now().toString(36) + ":" + entrySequence++,
      url: url.href,
    };
  }

  function ensureHistoryEntry(url) {
    var state = window.history.state;
    if (!state || !state.__siteScrollKey) {
      state = Object.assign({}, state, historyState(url));
      window.history.replaceState(state, "", url.href);
    }
    return state.__siteScrollKey;
  }

  function focusAnchor(target) {
    // Some section URLs point at an invisible marker just before their heading.
    if (target.getAttribute("aria-hidden") === "true") {
      var heading = target.nextElementSibling;
      if (!heading || !heading.matches("h1, h2, h3, h4, h5, h6")) return;
      target = heading;
    }
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
    renderedEntryKey = ensureHistoryEntry(url);
    var behavior = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth";
    if (target) {
      focusAnchor(target);
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
        renderedEntryKey = ensureHistoryEntry(url);
        insertedMain.setAttribute("aria-busy", "false");
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          insertedMain.classList.add("is-content-entering");
          insertedMain.addEventListener("animationend", function finish(event) {
            if (event.animationName !== "classic-content-enter") return;
            insertedMain.classList.remove("is-content-entering");
            insertedMain.removeEventListener("animationend", finish);
          });
        }
        // Focus follows replaced content, while the persistent radio/model remain alive.
        insertedMain.focus({ preventScroll: true });
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
    scrollPositions.set(renderedEntryKey || renderedUrl.href, {
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
    var wasPending = Boolean(activeNavigation);
    cancelNavigation();
    if (wasPending && targetUrl.href === renderedUrl.href) {
      scrollAfterNavigation(targetUrl);
      return;
    }
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
        // Resolve same-document links before ordinary page navigation. Let
        // downloads, modified clicks and targets keep their browser semantics.
        if (
          !isModifiedClick(event) &&
          !anchor.hasAttribute("download") &&
          !anchor.hasAttribute("data-full-navigation") &&
          (!anchor.target || anchor.target.toLowerCase() === "_self")
        ) {
          var url;
          try {
            url = new URL(anchor.href, window.location.href);
          } catch (e) {
            return;
          }
          if (isSameDocument(url, renderedUrl) && anchor.href.indexOf("#") !== -1) {
            event.preventDefault();
            // Missing targets update the fragment without scrolling, just as
            // native links do; an empty fragment scrolls to the page top.
            navigateToAnchor(url, anchorTarget(url));
            return;
          }
        }
        if (!isInternalPageLink(anchor, event)) return;

        event.preventDefault();
        navigateWithTransition(anchor.href);
      },
      true
    );

    window.addEventListener("popstate", function () {
      var url = new URL(window.location.href);
      var entryKey = ensureHistoryEntry(url);
      var position = scrollPositions.get(entryKey);
      rememberScroll();
      cancelNavigation();
      if (
        url.pathname === renderedUrl.pathname &&
        url.search === renderedUrl.search
      ) {
        renderedUrl = url;
        renderedEntryKey = entryKey;
        scrollAfterNavigation(url, position);
        return;
      }
      navigateWithTransition(url.href, {
        skipHistory: true,
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
        renderedEntryKey = ensureHistoryEntry(url);
      }
    });
  }

  function init() {
    if (canSoftNavigate() && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    if (window.history && typeof window.history.replaceState === "function") {
      try {
        renderedEntryKey = ensureHistoryEntry(renderedUrl);
      } catch (e) {
        // Ignore history errors.
      }
    }

    bindNavigationTransition();
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
