(function () {
  var API_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
  var CACHE_LIFETIME_MS = 10 * 60 * 1000;
  var REFRESH_INTERVAL_MS = 15 * 60 * 1000;
  var REQUEST_TIMEOUT_MS = 9000;

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

  function toNumber(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
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
    return (
      "site-weather-v2:" + latitude.toFixed(2) + ":" + longitude.toFixed(2)
    );
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
        "snowfall",
        "weather_code",
        "cloud_cover",
        "surface_pressure",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ].join(",")
    );
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("hourly", "temperature_2m,precipitation_probability");
    url.searchParams.set("forecast_days", "2");
    return url.toString();
  }

  // Forecast timestamps already use the station timezone returned by the API.
  function stationClock(value, abbreviation) {
    var parts = String(value || "").split("T");
    var time = parts.length > 1 ? parts[1].slice(0, 5) : "--:--";
    return abbreviation ? time + " " + abbreviation : time;
  }

  function renderForecast(root, payload) {
    var hourly = payload.hourly || {},
      times = hourly.time || [];
    var temperatures = hourly.temperature_2m || [],
      rain = hourly.precipitation_probability || [];
    var start = times.findIndex(function (time) {
      return time >= payload.current.time;
    });
    var points =
      start < 0
        ? []
        : times.slice(start, start + 24).map(function (time, index) {
            return {
              time: time,
              temperature: toNumber(temperatures[start + index], null),
              rain: toNumber(rain[start + index], null),
            };
          });
    var valid = points.filter(function (point) {
      return point.temperature !== null;
    });
    var chart = root.querySelector("[data-weather-chart]"),
      empty = root.querySelector("[data-weather-chart-empty]");
    chart.toggleAttribute("hidden", valid.length < 2);
    empty.hidden = valid.length >= 2;
    if (valid.length < 2) {
      empty.textContent = "時間別予報を取得できません";
      root.querySelector("[data-weather-chart-start]").textContent = "--:--";
      root.querySelector("[data-weather-chart-end]").textContent = "--:--";
      root.querySelector("[data-weather-chart-range]").textContent = "--";
      return;
    }
    var low = Math.floor(
      Math.min.apply(
        null,
        valid.map(function (p) {
          return p.temperature;
        })
      )
    );
    var high = Math.ceil(
      Math.max.apply(
        null,
        valid.map(function (p) {
          return p.temperature;
        })
      )
    );
    var span = Math.max(4, high - low),
      temperaturePath = "",
      rainPath = "",
      connected = false;
    points.forEach(function (point, index) {
      var x = 4 + (index * 352) / Math.max(1, points.length - 1);
      if (point.temperature !== null) {
        var y = 64 - ((point.temperature - low) / span) * 48;
        temperaturePath +=
          (connected ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
        connected = true;
      } else connected = false;
      if (point.rain !== null && point.rain > 0) {
        var bar = Math.max(0, Math.min(100, point.rain)) * 0.24;
        rainPath +=
          "M" +
          (x - 2.5).toFixed(1) +
          " 96v-" +
          bar.toFixed(1) +
          "h5v" +
          bar.toFixed(1) +
          "z";
      }
    });
    root
      .querySelector("[data-weather-chart-temperature]")
      .setAttribute("d", temperaturePath);
    root.querySelector("[data-weather-chart-rain]").setAttribute("d", rainPath);
    var first = stationClock(points[0].time),
      last = stationClock(points[points.length - 1].time);
    root.querySelector("[data-weather-chart-start]").textContent = first;
    root.querySelector("[data-weather-chart-end]").textContent = last;
    root.querySelector("[data-weather-chart-range]").textContent =
      low + "〜" + high + "°C";
    chart.setAttribute(
      "aria-label",
      "地点予報 " +
        first +
        "から" +
        last +
        "、気温" +
        low +
        "から" +
        high +
        "度。降水確率は棒グラフ。"
    );
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
      root.getAttribute("data-weather-default-location") ||
      "ウェスト・ミッドランズ";
    var activeLocation = {
      latitude: defaultLatitude,
      longitude: defaultLongitude,
      label: defaultLocation,
    };
    var requestController = null;
    var lastUpdatedAt = 0;
    var calendarDay = "";
    var clockNode = root.querySelector("[data-weather-calendar-time]");
    var gregorianNode = root.querySelector("[data-weather-calendar-gregorian]");
    var kyurekiNode = root.querySelector("[data-weather-calendar-kyureki]");
    var gensokyoNode = root.querySelector("[data-weather-calendar-gensokyo]");
    var attributesNode = root.querySelector(
      "[data-weather-calendar-attributes]"
    );

    function renderCalendar() {
      if (!window.SiteWeatherCalendar) return;
      var now = new Date();
      if (clockNode) {
        clockNode.textContent =
          String(now.getHours()).padStart(2, "0") +
          ":" +
          String(now.getMinutes()).padStart(2, "0");
        clockNode.setAttribute("datetime", now.toISOString());
      }
      // The local clock refreshes even when the three date readings are unchanged.
      var date = window.SiteWeatherCalendar.format(now);
      if (date.isoDate === calendarDay) return;
      calendarDay = date.isoDate;
      gregorianNode.textContent = date.isoDate.replace(/-/g, ".");
      kyurekiNode.textContent = date.kyureki.shortText;
      gensokyoNode.textContent = date.gensokyo.supported
        ? "第" + date.gensokyo.seasonNumber + "季"
        : date.gensokyo.seasonText;
      attributesNode.textContent = date.gensokyo.attributes
        .replace(/と/g, "／")
        .replace(/の年$/, "");
      [
        [gregorianNode, "新暦", date.gregorian.text],
        [kyurekiNode, "旧暦", date.kyureki.text],
        [gensokyoNode, "幻想郷", date.gensokyo.text],
      ].forEach(function (reading) {
        var cell = reading[0].closest("dd") || reading[0];
        cell.setAttribute("title", reading[2]);
        cell.setAttribute("aria-label", reading[1] + " " + reading[2]);
      });
    }

    function renderStation() {
      var lat = activeLocation.latitude,
        lon = activeLocation.longitude;
      root.querySelector("[data-weather-coordinates]").textContent =
        Math.abs(lat).toFixed(2) +
        "°" +
        (lat < 0 ? "S" : "N") +
        " / " +
        Math.abs(lon).toFixed(2) +
        "°" +
        (lon < 0 ? "W" : "E");
      var x = (lon + 180).toFixed(2),
        y = (90 - lat).toFixed(2);
      root
        .querySelector("[data-weather-map-marker]")
        .setAttribute("transform", "translate(" + x + " " + y + ")");
      root
        .querySelector("[data-weather-map-crosshair]")
        .setAttribute("d", "M" + x + " 0V180M0 " + y + "H360");
    }

    function setBusy(isBusy) {
      root.setAttribute("aria-busy", isBusy ? "true" : "false");
      if (refreshButton) refreshButton.disabled = isBusy;
      if (locateButton) locateButton.disabled = isBusy;
      root.querySelector("[data-weather-signal]").textContent = isBusy
        ? "受信中"
        : lastUpdatedAt
          ? "観測済"
          : "受信待機";
    }

    function setStatus(message) {
      if (!statusNode) return;
      statusNode.textContent = message || "";
      statusNode.hidden = !message;
      if (/タイムアウト|更新できません/.test(message || "")) {
        root.querySelector("[data-weather-signal]").textContent = "通信待機";
        if (!lastUpdatedAt)
          root.querySelector("[data-weather-chart-empty]").textContent =
            "予報を取得できません";
        document.dispatchEvent(new CustomEvent("site:weather-error"));
      }
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
      timeNode.textContent = stationClock(
        current.time,
        payload.timezone_abbreviation
      );
      timeNode.dateTime = current.time;
      temperatureNode.textContent = temperature + "°C";
      humidityNode.textContent = humidity + "%";
      windNode.textContent = wind + " km/h";
      rangeNode.textContent = high + "° / " + low + "°";
      locationNode.textContent = locationLabel;
      root.setAttribute("data-weather-phase", weather.phase);
      root.setAttribute("data-weather-icon", details.icon);
      var cloud = toNumber(current.cloud_cover, null),
        pressure = toNumber(current.surface_pressure, null);
      var direction = toNumber(current.wind_direction_10m, null);
      root.querySelector("[data-weather-cloud]").textContent =
        cloud === null ? "--%" : Math.round(cloud) + "%";
      root.querySelector("[data-weather-pressure]").textContent =
        pressure === null ? "--" : Math.round(pressure);
      root.querySelector("[data-weather-direction]").textContent =
        direction === null
          ? "--"
          : ["北", "北東", "東", "南東", "南", "南西", "西", "北西"][
              Math.round(direction / 45) % 8
            ] +
            " " +
            Math.round(direction) +
            "°";
      root.querySelector("[data-weather-daylight]").textContent =
        toNumber(current.is_day, 1) === 1 ? "昼間" : "夜間";
      ["humidity", "cloud"].forEach(function (key) {
        var value =
          key === "humidity"
            ? toNumber(current.relative_humidity_2m, null)
            : cloud;
        var meter = root.querySelector("[data-weather-" + key + "-meter]");
        meter.hidden = value === null;
        meter.value = value === null ? 0 : value;
      });
      renderStation();
      renderForecast(root, payload);
      root.setAttribute(
        "aria-label",
        locationLabel + ": " + weather.name + ", " + temperature + "度"
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
      lastUpdatedAt = Date.now();
      setStatus("");
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
      if (!settings.quiet) setStatus("天気を観測中…");

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
        if (controller !== requestController) return;
        cacheWeather(key, payload);
        renderWeather(payload, activeLocation.label);
      } catch (error) {
        if (controller !== requestController) return;
        if (error && error.name === "AbortError") {
          setStatus("接続がタイムアウトしました。");
        } else {
          setStatus("天気を更新できませんでした。");
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
        setStatus("現在地を取得できません。");
        return;
      }

      setBusy(true);
      setStatus("位置情報の許可を待っています…");
      window.navigator.geolocation.getCurrentPosition(
        function (position) {
          activeLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            label: "現在地",
          };
          loadWeather({ force: true });
        },
        function () {
          setBusy(false);
          setStatus(
            "現在地を取得できません。" + defaultLocation + "を表示しています。"
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

    renderCalendar();
    renderStation();
    window.setInterval(function () {
      if (!document.hidden && root.isConnected) renderCalendar();
    }, 30000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && root.isConnected) renderCalendar();
    });

    loadWeather();
  }

  function initAllWeatherWidgets() {
    var widgets = document.querySelectorAll("[data-weather-widget]");
    for (var index = 0; index < widgets.length; index += 1) {
      initWeatherWidget(widgets[index]);
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
