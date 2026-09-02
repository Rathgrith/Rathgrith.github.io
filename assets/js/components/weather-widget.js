(function () {
  var API_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
  var CACHE_LIFETIME_MS = 10 * 60 * 1000;
  var REFRESH_INTERVAL_MS = 15 * 60 * 1000;
  var REQUEST_TIMEOUT_MS = 9000;
  var VISIBILITY_STORAGE_KEY = "site-weather-visible";
  var MOBILE_MEDIA_QUERY = "(max-width: 36em)";
  var visibilityMedia = window.matchMedia
    ? window.matchMedia(MOBILE_MEDIA_QUERY)
    : null;
  var visibilityMediaBound = false;

  var NEEDLE_ANGLES = {
    clear: -32,
    calm: -8,
    cloud: 32,
    mist: 68,
    rain: 112,
    storm: 158,
    snow: 204,
    heat: 244,
    aurora: 286,
  };

  // Weather effect subtitles are retained in Japanese from the game tables:
  // https://zh.wikipedia.org/wiki/%E6%9D%B1%E6%96%B9%E7%B7%8B%E6%83%B3%E5%A4%A9_%EF%BD%9E_Scarlet_Weather_Rhapsody.
  // https://zh.wikipedia.org/wiki/%E4%B8%9C%E6%96%B9%E9%9D%9E%E6%83%B3%E5%A4%A9%E5%88%99_%EF%BD%9E_%E8%BF%BD%E5%AF%BB%E7%89%B9%E5%A4%A7%E5%9E%8B%E4%BA%BA%E5%81%B6%E4%B9%8B%E8%B0%9C
  var WEATHER_DETAILS = {
    快晴: { icon: "clear", description: "空を飛ぶ程度の天気" },
    霧雨: { icon: "drizzle", description: "スペルはパワー程度の天気" },
    曇天: { icon: "cloud", description: "符を器用に使える程度の天気" },
    蒼天: { icon: "blue-sky", description: "連係が鋭くなる程度の天気" },
    雹: { icon: "hail", description: "霊力が強まる程度の天気" },
    花曇: { icon: "flower-cloud", description: "打撃が使えない程度の天気" },
    濃霧: { icon: "fog", description: "吸血鬼っぽくなる程度の天気" },
    雪: { icon: "snow", description: "幽霊っぽくなる程度の天気" },
    天気雨: { icon: "sun-rain", description: "防御が怪しくなる程度の天気" },
    疎雨: { icon: "shower", description: "必殺技全開になる程度の天気" },
    風雨: { icon: "wind-rain", description: "空中戦に強くなる程度の天気" },
    晴嵐: { icon: "squall", description: "符が見えなくなる程度の天気" },
    川霧: { icon: "river-fog", description: "距離が変になる程度の天気" },
    台風: { icon: "typhoon", description: "勝負が荒れる程度の天気" },
    極光: { icon: "aurora", description: "何が起こるか不明程度の天気" },
    凪: { icon: "calm", description: "傷が癒える程度の天気" },
    钻石尘: {
      icon: "diamond",
      description: "眠ったら死ぬ程度の天気",
    },
    黄砂: { icon: "sand", description: "カウンターヒット程度の天気" },
    烈日: { icon: "blaze", description: "全てを焼き尽くす程度の天気" },
    梅雨: { icon: "plum-rain", description: "大地に弾かれる程度の天気" },
  };

  var DEFAULT_WEATHER_DETAILS = {
    icon: "observe",
    description: "空模様を観測しています",
  };

  function readVisibilityPreference() {
    try {
      var stored = window.localStorage.getItem(VISIBILITY_STORAGE_KEY);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (error) {
      // Storage is optional; the responsive default remains available.
    }
    return null;
  }

  function defaultVisibility() {
    return !(visibilityMedia && visibilityMedia.matches);
  }

  function isMobileViewport() {
    return Boolean(visibilityMedia && visibilityMedia.matches);
  }

  function currentVisibility() {
    if (isMobileViewport()) return false;
    var preference = readVisibilityPreference();
    return preference === null ? defaultVisibility() : preference;
  }

  function persistVisibility(isVisible) {
    try {
      window.localStorage.setItem(
        VISIBILITY_STORAGE_KEY,
        isVisible ? "true" : "false"
      );
    } catch (error) {
      // A blocked preference store should not disable the control.
    }
  }

  function renderVisibilityButton(button, isVisible) {
    if (!button) return;
    if (isMobileViewport()) {
      button.hidden = true;
      return;
    }

    var label = isVisible ? "Hide weather" : "Show weather";
    var icon = isVisible ? "fa-cloud-sun" : "fa-cloud";

    button.hidden = false;
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-pressed", isVisible ? "true" : "false");
    button.innerHTML = [
      '<span class="site-options-fab__action-icon" aria-hidden="true"><i class="fas ',
      icon,
      '"></i></span>',
      '<span class="site-options-fab__action-label">',
      label,
      "</span>",
    ].join("");
  }

  function applyVisibility(isVisible) {
    var resolvedVisibility = !isMobileViewport() && Boolean(isVisible);
    document.documentElement.setAttribute(
      "data-weather-visible",
      resolvedVisibility ? "true" : "false"
    );

    var widgets = document.querySelectorAll("[data-weather-widget]");
    for (var index = 0; index < widgets.length; index += 1) {
      widgets[index].hidden = !resolvedVisibility;
    }

    var button = document.querySelector("[data-weather-toggle]");
    if (widgets.length && !isMobileViewport()) {
      renderVisibilityButton(button, resolvedVisibility);
    } else if (button) {
      button.hidden = true;
    }
  }

  function initVisibilityControl() {
    var button = document.querySelector("[data-weather-toggle]");
    if (!button) return;

    applyVisibility(currentVisibility());
    if (button.getAttribute("data-weather-toggle-bound") === "true") return;

    button.setAttribute("data-weather-toggle-bound", "true");
    button.addEventListener("click", function (event) {
      event.preventDefault();
      if (isMobileViewport()) {
        applyVisibility(false);
        return;
      }

      var isVisible =
        document.documentElement.getAttribute("data-weather-visible") ===
        "true";
      persistVisibility(!isVisible);
      applyVisibility(!isVisible);
    });

    if (visibilityMedia && !visibilityMediaBound) {
      var syncResponsiveVisibility = function () {
        applyVisibility(currentVisibility());
      };

      if (typeof visibilityMedia.addEventListener === "function") {
        visibilityMedia.addEventListener("change", syncResponsiveVisibility);
      } else if (typeof visibilityMedia.addListener === "function") {
        visibilityMedia.addListener(syncResponsiveVisibility);
      }
      visibilityMediaBound = true;
    }
  }

  function toNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function includesCode(code, codes) {
    return codes.indexOf(code) !== -1;
  }

  function classifyWeather(current) {
    var code = Math.round(toNumber(current.weather_code, 0));
    var temperature = toNumber(current.temperature_2m, 0);
    var apparent = toNumber(current.apparent_temperature, temperature);
    var humidity = toNumber(current.relative_humidity_2m, 0);
    var cloud = toNumber(current.cloud_cover, 0);
    var precipitation = toNumber(current.precipitation, 0);
    var snowfall = toNumber(current.snowfall, 0);
    var wind = toNumber(current.wind_speed_10m, 0);
    var gust = toNumber(current.wind_gusts_10m, wind);
    var isDay = toNumber(current.is_day, 1) === 1;

    if (includesCode(code, [96, 99])) {
      return { name: "雹", phase: "storm" };
    }

    if (includesCode(code, [30, 31, 32, 33, 34, 35])) {
      return { name: "黄砂", phase: "mist" };
    }

    if (wind >= 55 || gust >= 75) {
      return { name: "台風", phase: "storm" };
    }

    if (code >= 95) {
      return { name: "晴嵐", phase: "storm" };
    }

    if (
      includesCode(code, [56, 57, 66, 67]) ||
      (snowfall > 0 && temperature <= -4)
    ) {
      return { name: "钻石尘", phase: "snow" };
    }

    if ((code >= 71 && code <= 86) || snowfall > 0) {
      return { name: "雪", phase: "snow" };
    }

    if (includesCode(code, [45, 48])) {
      if (humidity >= 97 && wind < 8) {
        return { name: "川霧", phase: "mist" };
      }
      return { name: "濃霧", phase: "mist" };
    }

    if (
      includesCode(code, [65, 67, 82]) ||
      (precipitation >= 4 && wind >= 18)
    ) {
      return { name: "風雨", phase: "storm" };
    }

    if (code >= 51 && code <= 57) {
      if (humidity >= 94 && temperature > 12 && wind < 18) {
        return { name: "梅雨", phase: "rain" };
      }
      return { name: "霧雨", phase: "rain" };
    }

    if (
      (code >= 61 && code <= 67) ||
      (code >= 80 && code <= 82) ||
      precipitation > 0
    ) {
      if (isDay && cloud < 55) {
        return { name: "天気雨", phase: "rain" };
      }
      if (humidity >= 94 && temperature > 12 && wind < 18) {
        return { name: "梅雨", phase: "rain" };
      }
      return { name: "疎雨", phase: "rain" };
    }

    if (code === 3 || cloud >= 86) {
      return { name: "曇天", phase: "cloud" };
    }

    if (cloud >= 60) {
      return { name: "花曇", phase: "cloud" };
    }

    if (isDay && (temperature >= 28 || apparent >= 30)) {
      return { name: "烈日", phase: "heat" };
    }

    if (wind <= 3 && cloud < 50) {
      return { name: "凪", phase: "calm" };
    }

    if (!isDay && cloud < 35) {
      return { name: "極光", phase: "aurora" };
    }

    if (code === 2 || cloud >= 28) {
      return { name: "蒼天", phase: "clear" };
    }

    return { name: "快晴", phase: "clear" };
  }

  function cacheKey(latitude, longitude) {
    return "site-weather:" + latitude.toFixed(2) + ":" + longitude.toFixed(2);
  }

  function readCachedWeather(key) {
    try {
      var raw = window.sessionStorage.getItem(key);
      if (!raw) return null;

      var cached = JSON.parse(raw);
      if (!cached || Date.now() - cached.savedAt > CACHE_LIFETIME_MS) {
        window.sessionStorage.removeItem(key);
        return null;
      }
      return cached.payload || null;
    } catch (error) {
      return null;
    }
  }

  function cacheWeather(key, payload) {
    try {
      window.sessionStorage.setItem(
        key,
        JSON.stringify({ savedAt: Date.now(), payload: payload })
      );
    } catch (error) {
      // Private browsing and strict storage policies should not block weather.
    }
  }

  function buildForecastUrl(latitude, longitude) {
    var url = new URL(API_ENDPOINT);
    url.searchParams.set("latitude", latitude.toFixed(4));
    url.searchParams.set("longitude", longitude.toFixed(4));
    url.searchParams.set(
      "current",
      [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "rain",
        "showers",
        "snowfall",
        "weather_code",
        "cloud_cover",
        "surface_pressure",
        "wind_speed_10m",
        "wind_gusts_10m",
      ].join(",")
    );
    url.searchParams.set(
      "daily",
      [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
      ].join(",")
    );
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "1");
    return url.toString();
  }

  function localClock(value, abbreviation) {
    var parts = String(value || "").split("T");
    var time = parts.length > 1 ? parts[1].slice(0, 5) : "--:--";
    return abbreviation ? time + " " + abbreviation : time;
  }

  function initWeatherWidget(root) {
    if (!root || root.getAttribute("data-weather-bound") === "true") return;
    root.setAttribute("data-weather-bound", "true");

    var nameNode = root.querySelector("[data-weather-name]");
    var timeNode = root.querySelector("[data-weather-time]");
    var temperatureNode = root.querySelector("[data-weather-temperature]");
    var descriptionNode = root.querySelector("[data-weather-description]");
    var iconUseNode = root.querySelector("[data-weather-icon-use]");
    var humidityNode = root.querySelector("[data-weather-humidity]");
    var windNode = root.querySelector("[data-weather-wind]");
    var rangeNode = root.querySelector("[data-weather-range]");
    var locationNode = root.querySelector("[data-weather-location]");
    var statusNode = root.querySelector("[data-weather-status]");
    var refreshButton = root.querySelector('[data-weather-action="refresh"]');
    var locateButton = root.querySelector('[data-weather-action="locate"]');

    var defaultLatitude = toNumber(
      root.getAttribute("data-weather-default-latitude"),
      52.4862
    );
    var defaultLongitude = toNumber(
      root.getAttribute("data-weather-default-longitude"),
      -1.8904
    );
    var defaultLocation =
      root.getAttribute("data-weather-default-location") || "West Midlands";
    var activeLocation = {
      latitude: defaultLatitude,
      longitude: defaultLongitude,
      label: defaultLocation,
    };
    var requestController = null;
    var lastUpdatedAt = 0;

    function setBusy(isBusy) {
      root.setAttribute("aria-busy", isBusy ? "true" : "false");
      if (refreshButton) refreshButton.disabled = isBusy;
      if (locateButton) locateButton.disabled = isBusy;
    }

    function setStatus(message) {
      if (!statusNode) return;
      statusNode.textContent = message || "";
      statusNode.hidden = !message;
    }

    function renderWeather(payload, locationLabel) {
      if (!payload || !payload.current) {
        throw new Error(
          "Forecast response did not include current conditions."
        );
      }

      var current = payload.current;
      var daily = payload.daily || {};
      var weather = classifyWeather(current);
      var details = WEATHER_DETAILS[weather.name] || DEFAULT_WEATHER_DETAILS;
      var temperature = Math.round(toNumber(current.temperature_2m, 0));
      var humidity = Math.round(toNumber(current.relative_humidity_2m, 0));
      var wind = Math.round(toNumber(current.wind_speed_10m, 0));
      var high = Array.isArray(daily.temperature_2m_max)
        ? Math.round(toNumber(daily.temperature_2m_max[0], temperature))
        : temperature;
      var low = Array.isArray(daily.temperature_2m_min)
        ? Math.round(toNumber(daily.temperature_2m_min[0], temperature))
        : temperature;

      nameNode.textContent = weather.name;
      descriptionNode.textContent = details.description;
      iconUseNode.setAttribute("href", "#weather-icon-" + details.icon);
      iconUseNode.setAttribute("xlink:href", "#weather-icon-" + details.icon);
      timeNode.textContent = localClock(
        current.time,
        payload.timezone_abbreviation
      );
      temperatureNode.textContent = temperature + "°";
      humidityNode.textContent = humidity + "%";
      windNode.textContent = wind + " km/h";
      rangeNode.textContent = high + "° / " + low + "°";
      locationNode.textContent = locationLabel;
      root.setAttribute("data-weather-phase", weather.phase);
      root.setAttribute("data-weather-icon", details.icon);
      root.style.setProperty(
        "--weather-needle-angle",
        (NEEDLE_ANGLES[weather.phase] || 0) + "deg"
      );
      root.setAttribute(
        "aria-label",
        locationLabel +
          ": " +
          weather.name +
          ", " +
          temperature +
          " degrees Celsius"
      );
      var weatherContext = {
        name: weather.name,
        phase: weather.phase,
        temperature: temperature,
        description: details.description,
        location: locationLabel,
        isDay: toNumber(current.is_day, 1) === 1,
      };
      window.__siteWeather = weatherContext;
      document.dispatchEvent(
        new CustomEvent("site:weather-updated", { detail: weatherContext })
      );
      setStatus("");
      lastUpdatedAt = Date.now();
    }

    async function loadWeather(options) {
      var settings = options || {};
      var latitude = activeLocation.latitude;
      var longitude = activeLocation.longitude;
      var key = cacheKey(latitude, longitude);
      var cached = settings.force ? null : readCachedWeather(key);

      if (cached) {
        renderWeather(cached, activeLocation.label);
        setBusy(false);
        return;
      }

      if (requestController) requestController.abort();
      var controller = new AbortController();
      requestController = controller;
      var timeoutId = window.setTimeout(function () {
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      setBusy(true);
      if (!settings.quiet) setStatus("Reading the local sky…");

      try {
        var response = await window.fetch(
          buildForecastUrl(latitude, longitude),
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          throw new Error("Weather service returned " + response.status + ".");
        }

        var payload = await response.json();
        cacheWeather(key, payload);
        renderWeather(payload, activeLocation.label);
      } catch (error) {
        if (controller !== requestController) return;
        if (error && error.name === "AbortError") {
          setStatus("The weather reading timed out. Try again shortly.");
        } else {
          setStatus("The weather dial could not update. Try again shortly.");
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (requestController === controller) {
          requestController = null;
          setBusy(false);
        }
      }
    }

    function locateVisitor() {
      if (!window.navigator.geolocation) {
        setStatus("Location is unavailable in this browser.");
        return;
      }

      setBusy(true);
      setStatus("Waiting for location permission…");
      window.navigator.geolocation.getCurrentPosition(
        function (position) {
          activeLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            label: "Current position",
          };
          loadWeather({ force: true });
        },
        function () {
          setBusy(false);
          setStatus(
            "Location was not changed. Showing " + defaultLocation + "."
          );
        },
        {
          enableHighAccuracy: false,
          maximumAge: 10 * 60 * 1000,
          timeout: REQUEST_TIMEOUT_MS,
        }
      );
    }

    if (refreshButton) {
      refreshButton.addEventListener("click", function () {
        loadWeather({ force: true });
      });
    }

    if (locateButton) {
      locateButton.addEventListener("click", locateVisitor);
    }

    window.setInterval(function () {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastUpdatedAt < REFRESH_INTERVAL_MS) return;
      loadWeather({ quiet: true });
    }, REFRESH_INTERVAL_MS);

    loadWeather();
  }

  function initAllWeatherWidgets() {
    initVisibilityControl();
    var widgets = document.querySelectorAll("[data-weather-widget]");
    for (var index = 0; index < widgets.length; index += 1) {
      initWeatherWidget(widgets[index]);
    }
  }

  if (visibilityMedia) {
    var syncResponsiveVisibility = function () {
      if (readVisibilityPreference() === null) {
        applyVisibility(defaultVisibility());
      }
    };
    if (typeof visibilityMedia.addEventListener === "function") {
      visibilityMedia.addEventListener("change", syncResponsiveVisibility);
    } else if (typeof visibilityMedia.addListener === "function") {
      visibilityMedia.addListener(syncResponsiveVisibility);
    }
  }

  window.__siteInitWeatherWidgets = initAllWeatherWidgets;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllWeatherWidgets);
  } else {
    initAllWeatherWidgets();
  }

  document.addEventListener("site:content-updated", initAllWeatherWidgets);
})();
