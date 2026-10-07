(function () {
  function updateNavigation() {
    var path = window.location.pathname;
    var active = path.indexOf('/gallery') !== -1 ? 'gallery' : path.indexOf('/notes') !== -1 ? 'notes' : path.indexOf('/thoughts') !== -1 ? 'thoughts' : 'home';
    document.querySelectorAll('[data-classic-page]').forEach(function (link) {
      if (link.getAttribute('data-classic-page') === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  // Rebind the template's archive navigation after the site's soft navigation.
  var archiveLinks = [];
  var scrollPending = false;
  function updateArchive() {
    var active = archiveLinks[0];
    archiveLinks.forEach(function (link) {
      var section = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (section && section.getBoundingClientRect().top <= 40) active = link;
    });
    archiveLinks.forEach(function (link) {
      if (link === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function bindArchive() {
    archiveLinks = Array.from(document.querySelectorAll('.classic-year-navigation a[href^="#"]'));
    updateArchive();
  }
  window.addEventListener('scroll', function () {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(function () { updateArchive(); scrollPending = false; });
  }, { passive: true });
  window.addEventListener('hashchange', updateArchive);
  document.addEventListener('DOMContentLoaded', bindArchive);
  document.addEventListener('site:content-updated', bindArchive);
  document.addEventListener('DOMContentLoaded', updateNavigation);
  document.addEventListener('site:content-updated', updateNavigation);
  updateNavigation();
  bindArchive();
})();
