(function () {
  function updateNavigation() {
    var path = window.location.pathname;
    var active = path.indexOf('/gallery') !== -1 ? 'gallery' : path.indexOf('/notes') !== -1 ? 'notes' : path.indexOf('/thoughts') !== -1 ? 'thoughts' : 'home';
    document.querySelectorAll('[data-classic-page]').forEach(function (link) {
      if (link.getAttribute('data-classic-page') === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  // Each page index tracks its own current section after scroll or soft navigation.
  var sectionGroups = [];
  var scrollPending = false;
  function updateArchive() {
    var atBottom = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    sectionGroups.forEach(function (links) {
      var active = links[0];
      links.forEach(function (link) {
        var section = document.getElementById(decodeURIComponent(link.hash.slice(1)));
        if (section && section.getBoundingClientRect().top <= 80) active = link;
      });
      // Short final sections cannot always reach the top of the viewport.
      if (atBottom) active = links[links.length - 1];
      links.forEach(function (link) {
        if (link === active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }
  function bindArchive() {
    sectionGroups = Array.from(document.querySelectorAll('.classic-year-navigation, .classic-page-index')).map(function (nav) {
      return Array.from(nav.querySelectorAll('a[href]')).filter(function (link) {
        return link.hash && document.getElementById(decodeURIComponent(link.hash.slice(1)));
      });
    });
    updateArchive();
  }
  window.addEventListener('scroll', function () {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(function () { updateArchive(); scrollPending = false; });
  }, { passive: true });
  window.addEventListener('hashchange', updateArchive);
  window.addEventListener('resize', updateArchive);
  document.addEventListener('DOMContentLoaded', bindArchive);
  document.addEventListener('site:content-updated', bindArchive);
  document.addEventListener('DOMContentLoaded', updateNavigation);
  document.addEventListener('site:content-updated', updateNavigation);
  updateNavigation();
  bindArchive();
})();
