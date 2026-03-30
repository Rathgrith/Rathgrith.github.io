(function () {
  if (window.__sitePageTransitionBootstrapped) return;
  window.__sitePageTransitionBootstrapped = true;

  var EXIT_CLASS = "page-transition-out";
  var ENTER_CLASS = "page-transition-enter";
  var ENABLED_CLASS = "page-transition-enabled";
  var EXIT_DURATION_MS = 180;
  var ENTER_DURATION_MS = 260;
  var navigating = false;
  var boundNavigation = false;
  var lastEnterStartedAt = 0;
  var reducedMotionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  function prefersReducedMotion() {
    return Boolean(reducedMotionQuery && reducedMotionQuery.matches);
  }

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

  function isSamePageAnchor(url) {
    var current = new URL(window.location.href);
    return (
      url.origin === current.origin &&
      url.pathname === current.pathname &&
      url.search === current.search &&
      Boolean(url.hash)
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
    if (anchor.hasAttribute("download")) return false;

    var target = (anchor.getAttribute("target") || "").toLowerCase();
    if (target && target !== "_self") return false;

    var rawHref = anchor.getAttribute("href");
    if (
      !rawHref ||
      rawHref[0] === "#" ||
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
    if (isSamePageAnchor(url)) return false;
    if (isSamePageUrl(url)) return false;
    if (hasNonHtmlExtension(url)) return false;

    return true;
  }

  function canSoftNavigate() {
    return Boolean(window.fetch && window.DOMParser && document.getElementById("main"));
  }

  function playEnterAnimation() {
    if (prefersReducedMotion()) return;
    if (!document.body) return;

    var now = Date.now();
    if (now - lastEnterStartedAt < ENTER_DURATION_MS) return;
    lastEnterStartedAt = now;

    document.body.classList.remove(EXIT_CLASS);
    document.body.classList.add(ENTER_CLASS);

    window.setTimeout(function () {
      if (!document.body) return;
      document.body.classList.remove(ENTER_CLASS);
    }, ENTER_DURATION_MS);
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
  }

  function applyBodyClass(nextBody) {
    if (!document.body || !nextBody) return;

    var preserved = {};
    if (document.body.classList.contains(ENABLED_CLASS)) preserved[ENABLED_CLASS] = true;
    if (document.body.classList.contains(ENTER_CLASS)) preserved[ENTER_CLASS] = true;
    if (document.body.classList.contains(EXIT_CLASS)) preserved[EXIT_CLASS] = true;

    document.body.className = (nextBody.getAttribute("class") || "").trim();

    Object.keys(preserved).forEach(function (className) {
      document.body.classList.add(className);
    });
  }

  function replaceMain(nextDoc) {
    var currentMain = document.getElementById("main");
    var nextMain = nextDoc.getElementById("main");
    if (!currentMain || !nextMain) return null;

    var imported = document.importNode
      ? document.importNode(nextMain, true)
      : nextMain.cloneNode(true);

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
        var typeValue = (oldScript.getAttribute("type") || "").trim().toLowerCase();
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

  function scrollAfterNavigation(url) {
    if (url.hash) {
      var id = decodeURIComponent(url.hash.slice(1));
      if (id) {
        var target = document.getElementById(id);
        if (target && typeof target.scrollIntoView === "function") {
          target.scrollIntoView();
          return;
        }
      }
    }

    window.scrollTo(0, 0);
  }

  function softNavigate(url, options) {
    return fetch(url.href, {
      credentials: "same-origin",
      headers: {
        "X-Requested-With": "site-page-transition"
      }
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to fetch page: " + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var nextDoc = parser.parseFromString(html, "text/html");

        updateDocumentMeta(nextDoc);
        applyBodyClass(nextDoc.body);

        var insertedMain = replaceMain(nextDoc);
        if (!insertedMain) {
          throw new Error("Missing #main in target page");
        }

        executeScripts(insertedMain);

        if (!options || !options.skipHistory) {
          if (window.history && typeof window.history.pushState === "function") {
            window.history.pushState(
              { __siteSoftNav: true, url: url.href },
              "",
              url.href
            );
          }
        }

        runPostSwapHooks(url);
        scrollAfterNavigation(url);
      });
  }

  function navigateWithTransition(url, options) {
    if (navigating) return;
    navigating = true;

    var targetUrl;
    try {
      targetUrl = new URL(url, window.location.href);
    } catch (e) {
      navigating = false;
      hardNavigate(url);
      return;
    }

    function finalizeSuccess() {
      navigating = false;
      if (!document.body) return;
      document.body.classList.remove(EXIT_CLASS);
      playEnterAnimation();
    }

    function fallbackToHardNavigation() {
      navigating = false;
      hardNavigate(targetUrl.href);
    }

    function startSwap() {
      if (!canSoftNavigate()) {
        fallbackToHardNavigation();
        return;
      }

      softNavigate(targetUrl, options)
        .then(finalizeSuccess)
        .catch(fallbackToHardNavigation);
    }

    if (prefersReducedMotion() || !document.body) {
      startSwap();
      return;
    }

    document.body.classList.add(EXIT_CLASS);
    window.setTimeout(startSwap, EXIT_DURATION_MS);
  }

  function bindNavigationTransition() {
    if (boundNavigation) return;
    boundNavigation = true;

    document.addEventListener(
      "click",
      function (event) {
        var anchor = event.target.closest("a[href]");
        if (!anchor) return;
        if (!isInternalPageLink(anchor, event)) return;

        event.preventDefault();
        navigateWithTransition(anchor.href);
      },
      true
    );

    window.addEventListener("popstate", function () {
      if (navigating) return;
      navigateWithTransition(window.location.href, { skipHistory: true });
    });
  }

  function init() {
    if (document.body) {
      document.body.classList.add(ENABLED_CLASS);
    }

    if (window.history && typeof window.history.replaceState === "function") {
      try {
        window.history.replaceState(
          { __siteSoftNav: true, url: window.location.href },
          "",
          window.location.href
        );
      } catch (e) {
        // Ignore history errors.
      }
    }

    playEnterAnimation();
    bindNavigationTransition();
  }

  window.addEventListener("pageshow", function (event) {
    navigating = false;
    if (event && event.persisted) {
      playEnterAnimation();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
