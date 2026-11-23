/* Decorative motion is progressive: no pending class ever conceals content. */
(function () {
  "use strict";
  if (window.__siteClassicMotionBound) return;
  window.__siteClassicMotionBound = true;

  var preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  var headingSelector = ".page__content h1, .classic-archive-year > h2, .notes-heading, .thought-detail__content > h2";
  var selector = [
    headingSelector,
    ".classic-research",
    ".classic-education > li",
    ".publication-item",
    ".misc-showcase",
    ".classic-photo",
    ".thought-card",
    ".notes-index > ul > li",
    ".notes-projects > .project",
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
    var image = element.classList.contains("classic-photo") ? element.querySelector("img") : null;
    if (image && !image.complete) {
      // A lazy thumbnail may arrive after the user has scrolled past it.
      if (observer) observer.observe(element);
      return;
    }
    seen.add(element);
    if (observer) observer.unobserve(element);
    cancel(element);
    if (typeof element.animate !== "function") return;
    var target = element;
    var keyframes;
    var options = {
      duration: 220,
      delay: Math.min(index, 3) * 24,
      easing: "steps(6, end)",
      fill: "backwards",
    };
    if (element.matches(headingSelector)) {
      // Only the heading's ornamental rule reads this inherited property.
      keyframes = [{ "--reading-rule-end": "100%" }, { "--reading-rule-end": "0%" }];
      options.duration = 320;
      options.easing = "steps(14, end)";
      options.delay = 0;
    } else if (image) {
      // Let colour develop inside the print. Its caption and link never move.
      if (!image.naturalWidth) return;
      target = image;
      keyframes = [
        { opacity: 0.72, filter: "saturate(0.38)" },
        { opacity: 1, filter: "saturate(1)" },
      ];
      options.duration = 260;
      options.easing = "steps(8, end)";
    } else if (element.classList.contains("misc-showcase")) {
      // A transform here would detach fixed photo previews from the viewport.
      keyframes = [{ opacity: 0.8 }, { opacity: 1 }];
    } else {
      keyframes = [
        { opacity: 0.75, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" },
      ];
    }
    var animation;
    try {
      animation = target.animate(keyframes, options);
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
          { rootMargin: "0px 0px -32px 0px", threshold: 0 }
        );
      }
      var stagger = 0;
      article.querySelectorAll(selector).forEach(function (element) {
        if (element.hidden) return;
        var bounds = element.getBoundingClientRect();
        if (bounds.bottom <= 0) {
          seen.add(element);
        } else if (bounds.top < window.innerHeight) {
          // The page transition owns a soft-navigation entrance; the
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
  document.addEventListener("load", function (event) {
    if (!article || event.target.tagName !== "IMG") return;
    var photo = event.target.closest(".classic-photo");
    if (!photo || seen.has(photo) || !belongs(photo)) return;
    var bounds = photo.getBoundingClientRect();
    if (bounds.bottom > 0 && bounds.top < window.innerHeight - 32) reveal(photo, 0);
  }, true);
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
