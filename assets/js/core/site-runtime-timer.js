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

  function formatSince(startedRaw, date) {
    var fixedMatch = String(startedRaw || "").match(
      /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/
    );

    if (fixedMatch) {
      var timezone = fixedMatch[6] || "Z";
      if (timezone === "Z") {
        timezone = "+00:00";
      } else if (/^[+-]\d{4}$/.test(timezone)) {
        timezone = timezone.slice(0, 3) + ":" + timezone.slice(3);
      }

      return fixedMatch[1] + "-" + fixedMatch[2] + "-" + fixedMatch[3] + " " + fixedMatch[4] + ":" + fixedMatch[5] + " UTC" + timezone;
    }

    return [
      date.getFullYear(),
      "-",
      pad2(date.getMonth() + 1),
      "-",
      pad2(date.getDate()),
      " ",
      pad2(date.getHours()),
      ":",
      pad2(date.getMinutes()),
      " UTC",
      formatTimezoneOffset(date)
    ].join("");
  }

  function formatTimezoneOffset(date) {
    var offsetMinutes = -date.getTimezoneOffset();
    var sign = offsetMinutes >= 0 ? "+" : "-";
    var absoluteMinutes = Math.abs(offsetMinutes);
    var hours = Math.floor(absoluteMinutes / 60);
    var minutes = absoluteMinutes % 60;

    return sign + pad2(hours) + ":" + pad2(minutes);
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

    sinceNode.textContent = formatSince(startedRaw, startedAt);
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
