(function () {
  function updateNavigation() {
    var path = window.location.pathname;
    var active =
      path.indexOf("/gallery") !== -1
        ? "gallery"
        : path.indexOf("/notes") !== -1
          ? "notes"
          : path.indexOf("/thoughts") !== -1
            ? "thoughts"
            : "home";
    document.querySelectorAll("[data-classic-page]").forEach(function (link) {
      if (link.getAttribute("data-classic-page") === active)
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }
  // Reuse the same index after the article on compact screens, above the companion.
  function placePageIndex() {
    var rail = document.querySelector(".classic-profile-rail");
    var footer = document.querySelector("[data-mobile-page-index]");
    var index = document.querySelector(".classic-page-index");
    if (!rail || !footer || !index) return;
    var parent = window.innerWidth < 1000 ? footer : rail;
    if (parent === rail) {
      var dock = rail.querySelector("[data-companion-dock]");
      if (index.parentNode !== rail || index.nextElementSibling !== dock)
        rail.insertBefore(index, dock);
    } else if (index.parentNode !== parent) parent.appendChild(index);
  }
  matchMedia("(max-width: 999px)").addEventListener("change", placePageIndex);
  document.addEventListener("site:content-updated", placePageIndex);
  document.addEventListener("DOMContentLoaded", placePageIndex);
  placePageIndex();
  // A tall rail must reveal its bottom before it sticks. On reversal, let it
  // travel back to the top edge rather than jumping between the two positions.
  // Native sticky containment prevents it from covering the document footer.
  var stickyRail = null;
  var railObserver = null;
  var railTop = 16;
  var railMinimumTop = 16;
  var railPreviousScroll = window.scrollY;
  function updateRailPosition() {
    var scroll = window.scrollY;
    if (stickyRail && window.innerWidth >= 1000) {
      var next = Math.max(
        railMinimumTop,
        Math.min(16, railTop - (scroll - railPreviousScroll))
      );
      if (next !== railTop) {
        railTop = next;
        stickyRail.style.setProperty("--classic-rail-top", railTop + "px");
      }
    }
    railPreviousScroll = scroll;
  }
  function measureRail() {
    if (!stickyRail) return;
    if (window.innerWidth < 1000) {
      stickyRail.style.removeProperty("--classic-rail-top");
      railTop = 16;
    } else {
      railMinimumTop = Math.min(16, window.innerHeight - stickyRail.offsetHeight - 16);
      railTop = Math.max(railMinimumTop, Math.min(16, railTop));
      stickyRail.style.setProperty("--classic-rail-top", railTop + "px");
    }
    railPreviousScroll = window.scrollY;
  }
  function bindStickyRail() {
    if (railObserver) railObserver.disconnect();
    stickyRail = document.querySelector(".classic-home-grid > .classic-profile-rail");
    railTop = 16;
    measureRail();
    if (stickyRail && "ResizeObserver" in window) {
      // Also handles the Playground being minimized, detached, closed or resized.
      railObserver = new ResizeObserver(measureRail);
      railObserver.observe(stickyRail);
    }
  }
  window.addEventListener("resize", measureRail);
  document.addEventListener("DOMContentLoaded", bindStickyRail);
  document.addEventListener("site:content-updated", bindStickyRail);
  bindStickyRail();
  // Each page index tracks its own current section after scroll or soft navigation.
  var sectionGroups = [];
  var scrollPending = false;
  function updateArchive() {
    var atBottom =
      window.scrollY > 0 &&
      window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
    sectionGroups.forEach(function (links) {
      var active = links[0];
      links.forEach(function (link) {
        var section = document.getElementById(
          decodeURIComponent(link.hash.slice(1))
        );
        if (section && section.getBoundingClientRect().top <= 80) active = link;
      });
      // Short final sections cannot always reach the top of the viewport.
      if (atBottom) active = links[links.length - 1];
      links.forEach(function (link) {
        if (link === active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    });
  }
  function bindArchive() {
    sectionGroups = Array.from(
      document.querySelectorAll(".classic-year-navigation, .classic-page-index")
    ).map(function (nav) {
      return Array.from(nav.querySelectorAll("a[href]")).filter(
        function (link) {
          return (
            link.hash &&
            document.getElementById(decodeURIComponent(link.hash.slice(1)))
          );
        }
      );
    });
    updateArchive();
  }
  window.addEventListener(
    "scroll",
    function () {
      if (scrollPending) return;
      scrollPending = true;
      requestAnimationFrame(function () {
        updateRailPosition();
        updateArchive();
        scrollPending = false;
      });
    },
    { passive: true }
  );
  window.addEventListener("hashchange", updateArchive);
  window.addEventListener("resize", updateArchive);
  document.addEventListener("DOMContentLoaded", bindArchive);
  document.addEventListener("site:content-updated", bindArchive);
  document.addEventListener("DOMContentLoaded", updateNavigation);
  document.addEventListener("site:content-updated", updateNavigation);
  updateNavigation();
  bindArchive();
})();
