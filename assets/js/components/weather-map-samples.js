/* Shared worldwide current conditions. Only visible weather maps need this forecast. */
(function () {
  "use strict";

  var stations = [
    ["バンクーバー", 49.28, -123.12], ["メキシコシティ", 19.43, -99.13],
    ["レシフェ", -8.05, -34.88], ["ウシュアイア", -54.8, -68.3],
    ["レイキャビク", 64.15, -21.94], ["ナイロビ", -1.29, 36.82],
    ["デリー", 28.61, 77.21], ["ヤクーツク", 62.03, 129.73],
    ["東京", 35.68, 139.65], ["ホバート", -42.88, 147.33],
    ["昭和基地", -69.01, 39.59]
  ];
  var fields = ["weather_code", "temperature_2m", "relative_humidity_2m", "apparent_temperature",
    "is_day", "precipitation", "snowfall", "cloud_cover", "wind_speed_10m", "wind_gusts_10m"];
  var ttl = 15 * 60 * 1000;
  var key = "site-weather-map-samples-v1";
  var cache;
  var pending = false, retryAfter = 0, nextUpdate;
  var visible = new Set(), observed = new WeakSet();

  function readCache() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(key));
      if (saved && Number.isFinite(saved.at) && saved.at <= Date.now() &&
          Date.now() - saved.at < ttl && Array.isArray(saved.payload)) return saved;
    } catch (e) { /* Storage is optional. */ }
    return null;
  }

  function endpoint() {
    var url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", stations.map(function (s) { return s[1]; }).join(","));
    url.searchParams.set("longitude", stations.map(function (s) { return s[2]; }).join(","));
    url.searchParams.set("current", fields.join(","));
    url.searchParams.set("forecast_days", "1");
    return url;
  }

  function readings(payload) {
    if (!Array.isArray(payload)) return [];
    // Results identify the nearest forecast grid cell, which can differ slightly
    // from the requested station. The station order stays fixed across responses.
    return stations.flatMap(function (station) {
      var row = payload.find(function (item) {
        return item && Number.isFinite(item.latitude) && Number.isFinite(item.longitude) &&
          Math.abs(item.latitude - station[1]) <= 1 && Math.abs(item.longitude - station[2]) <= 1;
      });
      if (!row || !row.current || !fields.every(function (field) {
        return Number.isFinite(row.current[field]);
      })) return [];
      return [{ station: station, temperature: Math.round(row.current.temperature_2m),
        symbol: window.SiteWeatherSymbols.classify(row.current) }];
    });
  }

  function representatives(data) {
    var groups = new Map();
    data.forEach(function (reading) {
      var name = reading.symbol.name;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(reading);
    });
    var chosen = [];
    // Place conditions with fewer candidate stations first. Among duplicates,
    // spread the chosen anchors apart on this equirectangular map.
    Array.from(groups.values()).sort(function (a, b) { return a.length - b.length; })
      .forEach(function (group) {
        var best = group[0], bestDistance = -1;
        group.forEach(function (candidate) {
          var nearest = chosen.reduce(function (distance, other) {
            return Math.min(distance, Math.hypot(candidate.station[1] - other.station[1],
              candidate.station[2] - other.station[2]));
          }, Infinity);
          if (nearest > bestDistance) { best = candidate; bestDistance = nearest; }
        });
        chosen.push(best);
      });
    return chosen;
  }

  function svg(tag, attrs) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs).forEach(function (name) { node.setAttribute(name, attrs[name]); });
    return node;
  }

  // One short, condition-specific stroke accompanies the game-style weather crest.
  var accents = {
    clear: "M-7 -9l-2 -2M0 -10v-2M7 -9l2 -2",
    heat: "M-8 -8l-2 -2M-3 -10v-2M3 -10v-2M8 -8l2 -2",
    rain: "M-4 7l-2 4M1 8l-2 4M6 7l-2 4",
    snow: "M-3 7v5m-2 -4l4 3m0 -3l-4 3M5 7v2",
    storm: "M4 -12l-4 5h4L1 -2",
    cloud: "M-12 -4h6m-3 3h5M5 6h6",
    mist: "M-11 -2h7m-5 4h6m7 3h7",
    calm: "M-9 4q3 3 6 1m6 -10q3 -2 6 0",
    aurora: "M-9 -5q5 -5 8 -2t9 -3"
  };

  function marker(reading, index) {
    var station = reading.station, weather = reading.symbol;
    var shortName = weather.name === "ダイヤモンドダスト" ? "細氷" : weather.name;
    var fullLabel = station[0] + " · " + weather.name + " " + reading.temperature + "°C";
    var group = svg("g", { "data-weather-sample": "", "data-label": station[0],
      role: "img", lang: "ja", "aria-label": fullLabel,
      "data-latitude": station[1], "data-longitude": station[2], "data-phase": weather.phase,
      transform: "translate(" + (180 + station[2]).toFixed(2) + " " + (90 - station[1]).toFixed(2) + ")" });
    group.setAttribute("data-sample-name", weather.name);
    group.setAttribute("visibility", "hidden");
    var title = svg("title", {});
    title.textContent = fullLabel;

    var height = 17;
    var width = 21 + shortName.length * 12;
    var face = svg("g", { class: "weather-map__sample-face" });
    var leader = svg("path", { class: "weather-map__sample-leader" });
    var pin = svg("rect", { x: -1.5, y: -1.5, width: 3, height: 3, class: "weather-map__sample-pin" });
    var tag = svg("g", { class: "weather-map__sample-tag" });
    var badge = svg("rect", { class: "weather-map__sample-badge", width: width, height: height });
    var seal = svg("rect", { class: "weather-map__sample-seal", x: .5, y: .5, width: 16, height: height - 1 });
    var crest = svg("g", { transform: "translate(8.5 " + height / 2 + ")" });
    var icon = svg("use", { href: "#weather-icon-" + weather.icon, x: -7, y: -7, width: 14, height: 14 });
    var flourish = svg("path", { class: "weather-map__sample-flourish", d: accents[weather.phase] || accents.clear });
    var label = svg("text", { class: "weather-map__sample-name", lang: "ja", x: 19, y: 12.5 });
    label.textContent = shortName;
    crest.append(icon, flourish);
    tag.append(badge, seal, crest, label);
    face.append(leader, pin, tag);
    group.style.setProperty("--sample-delay", (index % 4 * 65) + "ms");
    group.append(title, face);
    return group;
  }

  function touches(a, b, gap) {
    return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap &&
      a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
  }

  // Lay out in screen pixels; the station pin remains at its projected coordinate.
  // Pan, zoom or a narrow terminal changes which complete, readable titles fit.
  function arrange(map) {
    var layer = map.querySelector("[data-weather-samples]");
    if (!layer.childElementCount) return;
    var frame = map.querySelector("[data-atlas-viewport]").getBoundingClientRect();
    if (!frame.width || !frame.height) return;
    var projection = layer.getScreenCTM();
    var blocked = [];
    var focal = map.querySelector("[data-atlas-focal]").getBoundingClientRect();
    blocked.push({ x: focal.left - frame.left - 1, y: focal.top - frame.top - 1, w: focal.width + 2, h: focal.height + 2 });

    var markers = Array.from(layer.children);
    if (frame.width < 230) markers.sort(function (a, b) {
      return a.querySelector("text").textContent.length - b.querySelector("text").textContent.length;
    });
    markers.forEach(function (group) {
      var coords = group.transform.baseVal.getItem(0).matrix;
      var station = new DOMPoint(coords.e, coords.f).matrixTransform(projection);
      var x = station.x - frame.left, y = station.y - frame.top;
      var badge = group.querySelector(".weather-map__sample-badge");
      var w = badge.width.baseVal.value, h = badge.height.baseVal.value;
      var pin = { x: x - 1, y: y - 1, w: 2, h: 2 };
      var inside = x >= 1 && y >= 1 && x <= frame.width - 1 && y <= frame.height - 1;
      var box;
      if (inside && frame.width >= w + 6 && frame.height >= h + 6 &&
          !blocked.slice(1).some(function (other) { return touches(pin, other, 0); })) {
        // Prefer a side caption, then use spaces above or below the pin.
        var gap = touches(pin, blocked[0], 2) ? Math.ceil(Math.max(focal.width, focal.height) / 2) + 5 : 5;
        var offsets = [[gap, -h / 2], [-w - gap, -h / 2], [-w / 2, gap], [-w / 2, -h - gap],
          [gap, gap], [-w - gap, gap], [gap, -h - gap], [-w - gap, -h - gap]];
        for (var offset of offsets) {
          var candidate = { x: Math.max(3, Math.min(frame.width - w - 3, Math.round(x + offset[0]))),
            y: Math.max(3, Math.min(frame.height - h - 3, Math.round(y + offset[1]))), w: w, h: h };
          if (!touches(candidate, pin, 1) && !blocked.some(function (other) { return touches(candidate, other, 2); })) {
            box = candidate;
            break;
          }
        }
      }
      group.setAttribute("visibility", box ? "visible" : "hidden");
      if (!box) return;
      blocked.push(box, pin);
      var dx = box.x - x, dy = box.y - y;
      group.querySelector(".weather-map__sample-face").setAttribute("transform", "scale(" + 1 / projection.a + " " + 1 / projection.d + ")");
      group.querySelector(".weather-map__sample-tag").setAttribute("transform", "translate(" + dx + " " + dy + ")");
      var edgeX = Math.max(dx, Math.min(0, dx + w)), edgeY = Math.max(dy, Math.min(0, dy + h));
      group.querySelector(".weather-map__sample-leader").setAttribute("d", "M0 0L" + edgeX + " " + edgeY);
    });
  }

  function draw(data, message) {
    var selected = representatives(data);
    document.querySelectorAll("[data-weather-samples]").forEach(function (layer) {
      var stamp = String((cache && cache.at) || message);
      if (layer.dataset.weatherSampleStamp === stamp) return;
      layer.dataset.weatherSampleStamp = stamp;
      layer.replaceChildren.apply(layer, selected.map(marker));
      var map = layer.closest(".weather-map");
      var status = map.querySelector("[data-weather-sample-status]");
      if (status) {
        status.textContent = message || data.length + "地点を観測 · " + selected.length + "種の天候";
        status.hidden = false;
      }
      arrange(map);
    });
  }

  async function refresh() {
    window.clearTimeout(nextUpdate);
    if (!visible.size || document.hidden || pending) return;
    var now = Date.now();
    if (cache && now >= cache.at && now - cache.at < ttl) {
      var cached = readings(cache.payload);
      if (cached.length) {
        draw(cached);
        nextUpdate = window.setTimeout(refresh, cache.at + ttl - now);
        return;
      }
    }
    if (now < retryAfter) {
      nextUpdate = window.setTimeout(refresh, retryAfter - now);
      return;
    }
    cache = null;
    pending = true;
    draw([], "各地の天気を受信中…");
    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 9000);
    try {
      var response = await fetch(endpoint(), { signal: controller.signal, credentials: "omit" });
      if (!response.ok) throw new Error("Forecast unavailable");
      var payload = await response.json();
      var data = readings(payload);
      if (!data.length) throw new Error("No usable sample readings");
      cache = { at: Date.now(), payload: payload };
      try { sessionStorage.setItem(key, JSON.stringify(cache)); } catch (e) { /* Private mode. */ }
      draw(data);
    } catch (error) {
      retryAfter = Date.now() + 60000;
      draw([], "各地の天気を取得できません");
    } finally {
      window.clearTimeout(timeout);
      pending = false;
      if (visible.size && !document.hidden) {
        nextUpdate = window.setTimeout(refresh, Math.max(1, (cache ? cache.at + ttl : retryAfter) - Date.now()));
      }
    }
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && entry.intersectionRect.width && entry.intersectionRect.height) visible.add(entry.target);
      else visible.delete(entry.target);
      if (!entry.target.isConnected) observer.unobserve(entry.target);
    });
    refresh();
  });

  function init() {
    document.querySelectorAll(".weather-map:has([data-weather-samples])").forEach(function (map) {
      if (observed.has(map)) return;
      observed.add(map);
      var frame;
      function scheduleLayout() {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          frame = 0;
          arrange(map);
        });
      }
      var changes = new MutationObserver(scheduleLayout);
      changes.observe(map.querySelector("[data-atlas-layer]"), { attributes: true, attributeFilter: ["style"] });
      changes.observe(map.querySelector("[data-weather-map-marker]"), { attributes: true, attributeFilter: ["transform"] });
      new ResizeObserver(scheduleLayout).observe(map.querySelector("[data-atlas-viewport]"));
      observer.observe(map);
    });
  }
  cache = readCache();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  document.addEventListener("site:content-updated", init);
  document.addEventListener("visibilitychange", refresh);
})();
