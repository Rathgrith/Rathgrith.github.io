(function () {
  var tickTimer = null;

  function pad2(value) {
    var n = Math.max(0, Math.floor(Number(value) || 0));
    return n < 10 ? "0" + n : String(n);
  }

  function formatDuration(totalSeconds) {
    var seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    var days = Math.floor(seconds / 86400);
    var hours = Math.floor((seconds % 86400) / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs = seconds % 60;

    return {
      text: days + "d " + pad2(hours) + "h " + pad2(minutes) + "m " + pad2(secs) + "s",
      iso: "P" + days + "DT" + hours + "H" + minutes + "M" + secs + "S"
    };
  }

  function formatSince(date) {
    try {
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return date.toISOString();
    }
  }

  function mountRuntimeTimer() {
    var root = document.querySelector("[data-site-runtime]");
    if (!root) return;

    var startedRaw = (root.getAttribute("data-site-start") || "").trim();
    if (!startedRaw) return;

    var startedAt = new Date(startedRaw);
    if (!Number.isFinite(startedAt.getTime())) return;

    var elapsedNode = root.querySelector("[data-site-runtime-elapsed]");
    var sinceNode = root.querySelector("[data-site-runtime-since]");

    if (!elapsedNode || !sinceNode) return;

    sinceNode.textContent = formatSince(startedAt);
    sinceNode.setAttribute("datetime", startedAt.toISOString());

    function update() {
      var elapsedSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      var formatted = formatDuration(elapsedSeconds);
      elapsedNode.textContent = formatted.text;
      elapsedNode.setAttribute("datetime", formatted.iso);
    }

    update();

    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }

    tickTimer = setInterval(update, 1000);
  }

  function boot() {
    mountRuntimeTimer();
  }

  document.addEventListener("site:content-updated", mountRuntimeTimer);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
