(function () {
  if (window.__siteProfileInteractionsBootstrapped) return;
  window.__siteProfileInteractionsBootstrapped = true;

  var revealObserver = null;
  var reducedMotionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  var finePointerQuery = window.matchMedia
    ? window.matchMedia("(hover: hover) and (pointer: fine)")
    : null;

  function prefersReducedMotion() {
    return Boolean(reducedMotionQuery && reducedMotionQuery.matches);
  }

  function supportsFinePointer() {
    return Boolean(finePointerQuery && finePointerQuery.matches);
  }

  function resetTilt(frame) {
    frame.style.setProperty("--avatar-rotate-x", "0deg");
    frame.style.setProperty("--avatar-rotate-y", "0deg");
    frame.style.setProperty("--avatar-shine-x", "50%");
    frame.style.setProperty("--avatar-shine-y", "42%");
  }

  function initProfileTilt(root) {
    var frames = (root || document).querySelectorAll("[data-profile-tilt]");

    Array.prototype.forEach.call(frames, function (frame) {
      if (frame.getAttribute("data-profile-tilt-ready") === "true") return;
      frame.setAttribute("data-profile-tilt-ready", "true");
      resetTilt(frame);

      frame.addEventListener("pointermove", function (event) {
        if (prefersReducedMotion() || !supportsFinePointer()) return;

        var bounds = frame.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;

        var x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        var y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));

        frame.style.setProperty("--avatar-rotate-x", ((0.5 - y) * 5).toFixed(2) + "deg");
        frame.style.setProperty("--avatar-rotate-y", ((x - 0.5) * 6).toFixed(2) + "deg");
        frame.style.setProperty("--avatar-shine-x", (x * 100).toFixed(1) + "%");
        frame.style.setProperty("--avatar-shine-y", (y * 100).toFixed(1) + "%");
      });

      frame.addEventListener("pointerleave", function () {
        resetTilt(frame);
      });

      frame.addEventListener("blur", function () {
        resetTilt(frame);
      }, true);
    });
  }

  function revealImmediately(elements) {
    Array.prototype.forEach.call(elements, function (element) {
      element.classList.add("is-visible");
    });
  }

  function initScrollReveal(root) {
    if (!document.body || !document.body.classList.contains("home-page")) return;

    var scope = root || document;
    var candidates = scope.querySelectorAll([
      ".page__content > h1",
      ".page__content > p",
      ".page__content > ul",
      ".page__content > blockquote",
      ".publication-item",
      ".music-player"
    ].join(","));

    Array.prototype.forEach.call(candidates, function (element, index) {
      if (element.classList.contains("motion-reveal")) return;
      element.classList.add("motion-reveal");
      element.style.setProperty("--reveal-delay", Math.min(index % 4, 3) * 42 + "ms");
    });

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      revealImmediately(candidates);
      document.body.classList.add("reveal-motion-ready");
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      }, {
        rootMargin: "0px 0px -9% 0px",
        threshold: 0.08
      });
    }

    Array.prototype.forEach.call(candidates, function (element) {
      if (element.classList.contains("is-visible")) return;
      revealObserver.observe(element);
    });

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (document.body) document.body.classList.add("reveal-motion-ready");
      });
    });
  }

  function initialise() {
    initProfileTilt(document);
    initScrollReveal(document);
  }

  document.addEventListener("site:content-updated", initialise);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
