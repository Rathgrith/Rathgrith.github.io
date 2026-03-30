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

  function navigateWithTransition(url) {
    if (navigating) return;
    navigating = true;

    if (prefersReducedMotion() || !document.body) {
      window.location.assign(url);
      return;
    }

    document.body.classList.add(EXIT_CLASS);
    window.setTimeout(function () {
      window.location.assign(url);
    }, EXIT_DURATION_MS);
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
  }

  function init() {
    if (document.body) {
      document.body.classList.add(ENABLED_CLASS);
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
