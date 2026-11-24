(function () {
  function updateNavigation() {
    // Compare resolved URLs so subpath deployments and secondary documents
    // do not accidentally select Home. Fragments designate sections of a page.
    var tabs = Array.from(document.querySelectorAll(".classic-navigation a[href]"));
    var path = window.location.pathname.replace(/\/index\.html$/, "/");
    var matching = tabs.filter(function (link) {
      return link.origin === location.origin && link.pathname === path;
    });
    var active = matching.find(function (link) { return link.hash && link.hash === location.hash; }) ||
      matching.find(function (link) { return !link.hash; });
    tabs.forEach(function (link) {
      if (link === active) link.setAttribute("aria-current", link.hash ? "location" : "page");
      else link.removeAttribute("aria-current");
    });
  }
  // Reuse the same index in the compact sticky slot before the article.
  function placePageIndex() {
    var rail = document.querySelector(".classic-profile-tools");
    var footer = document.querySelector("[data-mobile-page-index]");
    var index = document.querySelector(".classic-page-index");
    if (!rail || !footer || !index) return;
    var parent = window.innerWidth < 1000 ? footer : rail;
    var focused = index.contains(document.activeElement) ? document.activeElement : null;
    if (parent === rail) {
      var dock = rail.querySelector("[data-companion-dock]");
      if (index.parentNode !== rail || index.nextElementSibling !== dock)
        rail.insertBefore(index, dock);
    } else if (index.parentNode !== parent) parent.appendChild(index);
    if (focused && focused !== document.activeElement) focused.focus({ preventScroll: true });
  }
  matchMedia("(max-width: 999px)").addEventListener("change", placePageIndex);
  document.addEventListener("site:content-updated", placePageIndex);
  document.addEventListener("DOMContentLoaded", placePageIndex);
  placePageIndex();
  // Each page index tracks its own current section after scroll or soft navigation.
  var sectionGroups = [];
  var scrollPending = false;
  function sectionThreshold(nav) {
    if (window.innerWidth >= 1000) return 80;
    var compactIndex = nav.closest("[data-mobile-page-index], .classic-index-rail");
    if (compactIndex && getComputedStyle(compactIndex).position !== "sticky") compactIndex = null;
    var style = getComputedStyle(nav);
    if (!compactIndex && style.position === "sticky" && style.flexDirection === "row") compactIndex = nav;
    if (!compactIndex) return 80;
    var inset = parseFloat(getComputedStyle(compactIndex).top) || 8;
    return Math.max(96, inset + compactIndex.getBoundingClientRect().height + 16);
  }
  function revealActiveLink(group, active) {
    if (!active || group.active === active) return;
    group.active = active;
    var nav = group.nav;
    var item = active.link.getBoundingClientRect();
    var bounds = nav.getBoundingClientRect();
    var dx = 0, dy = 0;
    if (nav.scrollWidth > nav.clientWidth) {
      if (item.left < bounds.left) dx = item.left - bounds.left - 8;
      else if (item.right > bounds.right) dx = item.right - bounds.right + 8;
    }
    if (nav.scrollHeight > nav.clientHeight) {
      if (item.top < bounds.top) dy = item.top - bounds.top - 6;
      else if (item.bottom > bounds.bottom) dy = item.bottom - bounds.bottom + 6;
    }
    // Move only the index, preserving the document's reading position.
    if (dx || dy) nav.scrollBy({ left: dx, top: dy, behavior: "instant" });
  }
  function updateArchive() {
    var remaining = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    var atBottom = window.scrollY > 0 && remaining <= 2;
    sectionGroups.forEach(function (group) {
      var threshold = sectionThreshold(group.nav);
      var items = group.items;
      if (!items.length) return;
      var tops = items.map(function (item) { return item.target.getBoundingClientRect().top; });
      var index = 0;
      tops.forEach(function (top, i) { if (top <= threshold) index = i; });
      if (atBottom) index = items.length - 1;
      var active = items[index];
      if (group.active !== active) {
        items.forEach(function (item) {
          if (item === active) item.link.setAttribute("aria-current", "location");
          else item.link.removeAttribute("aria-current");
        });
        revealActiveLink(group, active);
      }
      // The final section can end at the bottom of the document before its
      // heading reaches the sticky index. Fill its strip over the reachable span.
      var end = index + 1 < tops.length ? tops[index + 1] : threshold + remaining;
      var fraction = (threshold - tops[index]) / Math.max(1, end - tops[index]);
      var percent = atBottom ? 100 : Math.round(Math.max(0, Math.min(1, fraction)) * 100);
      if (group.progress !== percent) {
        group.nav.style.setProperty("--section-read", percent + "%");
        group.progress = percent;
      }
    });
  }
  function bindArchive() {
    sectionGroups = Array.from(
      document.querySelectorAll(".classic-year-navigation, .classic-page-index")
    ).map(function (nav) {
      var items = [];
      nav.querySelectorAll("a[href]").forEach(function (link) {
        link.removeAttribute("aria-current");
        var url;
        try {
          url = new URL(link.href, window.location.href);
        } catch (e) {
          return;
        }
        if (
          url.origin !== window.location.origin ||
          url.pathname !== window.location.pathname ||
          url.search !== window.location.search ||
          !url.hash
        ) return;
        var id = url.hash.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch (e) {
          // A malformed fragment must not disable the rest of the index.
        }
        var target = document.getElementById(id);
        if (target) items.push({ link: link, target: target });
      });
      return { nav: nav, items: items, active: null };
    });
    updateArchive();
  }
  window.addEventListener(
    "scroll",
    function () {
      if (scrollPending) return;
      scrollPending = true;
      requestAnimationFrame(function () {
        updateArchive();
        scrollPending = false;
      });
    },
    { passive: true }
  );
  window.addEventListener("hashchange", updateArchive);
  window.addEventListener("hashchange", updateNavigation);
  document.addEventListener("site:anchor-navigated", updateNavigation);
  document.addEventListener("site:publications-filtered", updateArchive);
  window.addEventListener("resize", function () {
    sectionGroups.forEach(function (group) { group.active = null; });
    updateArchive();
  });
  document.addEventListener("DOMContentLoaded", bindArchive);
  document.addEventListener("site:content-updated", bindArchive);
  document.addEventListener("DOMContentLoaded", updateNavigation);
  document.addEventListener("site:content-updated", updateNavigation);
  updateNavigation();
  bindArchive();
})();
