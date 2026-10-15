/* Decorative motion is progressive: no pending class ever conceals content. */
(function () {
  "use strict";
  if (window.__siteClassicMotionBound) return;
  window.__siteClassicMotionBound = true;

  var preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  var selector = [
    ".classic-research",
    ".classic-education > li",
    ".publication-item",
    ".misc-showcase",
    ".classic-photo",
    ".thought-card",
    ".classic-blog-entry",
  ].join(", ");
  var article = null;
  var observer = null;
  var frame = 0;
  var seen = new WeakSet();
  var playing = new Map();

  function cancel(element) {
    var animation = playing.get(element);
    if (!animation) return;
    playing.delete(element);
    animation.cancel();
  }

  function cleanup() {
    if (observer) observer.disconnect();
    observer = null;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    playing.forEach(function (animation) {
      animation.cancel();
    });
    playing.clear();
    seen = new WeakSet();
    article = null;
  }

  function belongs(element) {
    return article && article.contains(element) && !element.hidden;
  }

  function reveal(element, index) {
    if (preference.matches || !belongs(element)) return;
    seen.add(element);
    if (observer) observer.unobserve(element);
    cancel(element);
    if (typeof element.animate !== "function") return;
    // Integer-pixel steps suit the desktop artwork. No fill or inline style is
    // retained, so completion, cancellation and unsupported APIs are all safe.
    var animation;
    var keyframes = [{ opacity: 0.65 }, { opacity: 1 }];
    // Fixed hover previews use viewport coordinates. Transforming their parent
    // would give them a new containing block until the entry has finished.
    if (!element.classList.contains("misc-showcase")) {
      keyframes[0].transform = "translateY(4px)";
      keyframes[1].transform = "translateY(0)";
    }
    try {
      animation = element.animate(
        keyframes,
        {
          duration: 240,
          delay: Math.min(index, 4) * 28,
          easing: "steps(4, end)",
          fill: "none",
        }
      );
    } catch (error) {
      return;
    }
    playing.set(element, animation);
    function release() {
      if (playing.get(element) === animation) playing.delete(element);
    }
    animation.finished.then(release, release);
  }

  function initialise(softNavigation) {
    cleanup();
    if (preference.matches) return;
    // The navigation hook fires before scroll restoration. Measure on the next
    // frame, after the final scroll position and gallery order have settled.
    frame = window.requestAnimationFrame(function () {
      frame = 0;
      article = document.querySelector("#main > article");
      if (!article || preference.matches) return;
      if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver(
          function (entries) {
            var stagger = 0;
            entries.forEach(function (entry) {
              if (
                !entry.isIntersecting ||
                seen.has(entry.target) ||
                !belongs(entry.target)
              )
                return;
              reveal(entry.target, stagger++);
            });
          },
          { rootMargin: "0px 0px -16px 0px", threshold: 0 }
        );
      }
      var stagger = 0;
      article.querySelectorAll(selector).forEach(function (element) {
        if (element.hidden) return;
        var bounds = element.getBoundingClientRect();
        if (bounds.bottom <= 0) {
          seen.add(element);
        } else if (bounds.top < window.innerHeight) {
          // The article's existing fade owns a soft-navigation entrance; the
          // prayer loader owns the first home entrance. Do not stack effects.
          if (softNavigation || document.body.classList.contains("home-loading"))
            seen.add(element);
          else reveal(element, stagger++);
        } else if (observer) {
          observer.observe(element);
        }
      });
    });
  }

  document.addEventListener("site:before-content-replace", cleanup);
  window.addEventListener("beforeprint", cleanup);
  window.addEventListener("afterprint", function () {
    initialise(true);
  });
  document.addEventListener("site:content-updated", function () {
    initialise(true);
  });
  document.addEventListener("site:publications-filtered", function (event) {
    if (preference.matches || !event.detail) return;
    playing.forEach(function (animation, element) {
      if (element.hidden) cancel(element);
    });
    (event.detail.revealed || []).forEach(function (element, index) {
      if (!belongs(element)) return;
      var bounds = element.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < window.innerHeight) {
        reveal(element, index);
      } else if (observer) {
        seen.delete(element);
        observer.observe(element);
      }
    });
  });
  document.addEventListener("focusin", function (event) {
    var element = event.target.closest(selector);
    if (!belongs(element)) return;
    seen.add(element);
    if (observer) observer.unobserve(element);
    cancel(element);
  });
  function preferenceChanged() {
    if (preference.matches) cleanup();
    else initialise(true);
  }
  if (preference.addEventListener)
    preference.addEventListener("change", preferenceChanged);
  else if (preference.addListener) preference.addListener(preferenceChanged);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialise(false);
    }, { once: true });
  } else initialise(false);
})();
