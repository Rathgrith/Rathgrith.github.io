(function () {
  function initialiseFilter(list) {
    if (!list || list.getAttribute("data-publication-filter-bound") === "true") return;

    var filter = list.previousElementSibling;
    if (!filter || !filter.classList.contains("publication-filter")) return;

    var items = Array.prototype.slice.call(list.querySelectorAll("[data-publication-selected]"));
    var buttons = Array.prototype.slice.call(filter.querySelectorAll("[data-publication-filter]"));
    var count = filter.querySelector("[data-publication-count]");

    function applyMode(mode) {
      var showAll = mode === "all";
      var visibleCount = 0;

      items.forEach(function (item) {
        var visible = showAll || item.getAttribute("data-publication-selected") === "true";
        item.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      buttons.forEach(function (button) {
        var active = button.getAttribute("data-publication-filter") === mode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });

      list.setAttribute("data-publication-mode", mode);
      if (count) count.textContent = String(visibleCount);
    }

    filter.addEventListener("click", function (event) {
      var button = event.target.closest("[data-publication-filter]");
      if (!button || !filter.contains(button)) return;
      applyMode(button.getAttribute("data-publication-filter") === "all" ? "all" : "selected");
    });

    list.setAttribute("data-publication-filter-bound", "true");
    applyMode(list.getAttribute("data-publication-mode") === "all" ? "all" : "selected");
  }

  function init() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-publication-list]"),
      initialiseFilter
    );
  }

  document.addEventListener("site:content-updated", init);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
