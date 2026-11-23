/* Validate the page and network before activating the map provider. */
(async function () {
  var mount = document.querySelector("[data-visitor-map-mount]");
  var embed = document.getElementById("visitor-map-embed");
  if (!mount || !embed || mount.dataset.visitorMapState) return;
  var status = document.querySelector("[data-visitor-map-status]");
  function fallback(state, message) {
    mount.dataset.visitorMapState = state;
    status.textContent = message;
    status.hidden = false;
  }
  if (location.hostname !== mount.dataset.visitorMapHost) {
    fallback("preview", "Preview · visits are not counted.");
    return;
  }

  function canonicalIP(value) {
    if (typeof value === "string") {
      var ip = value.trim();
      if (ip.includes(":") && /^[a-f0-9:.]+$/i.test(ip)) {
        return new URL("http://[" + ip + "]").hostname.slice(1, -1);
      }
      // Reject ambiguous octal/abbreviated forms accepted by the URL parser.
      var parts = ip.split(".");
      if (parts.length === 4 && parts.every(function (part) {
        return /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255;
      })) return ip;
    }
    throw new Error("Invalid IP address");
  }
  function cityKey(country, city) {
    var code = typeof country === "string" ? country.trim().toUpperCase() : "";
    var name = typeof city === "string" ? city.trim().toLowerCase() : "";
    if (!/^[A-Z]{2}$/.test(code) || ["XX", "ZZ"].includes(code) ||
        ["", "unknown", "n/a"].includes(name)) {
      throw new Error("Missing city or country");
    }
    return code + "/" + name;
  }
  async function currentNetwork() {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 5000);
    try {
      var response = await fetch("https://get.geojs.io/v1/ip/geo.json", {
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("IP lookup failed");
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
  async function ipDigest(ip) {
    var bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
    return "sha256:" + Array.from(new Uint8Array(bytes), function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  mount.dataset.visitorMapState = "checking";
  try {
    var rules = JSON.parse(mount.dataset.visitorMapExcludedIps);
    var cityRules = JSON.parse(mount.dataset.visitorMapExcludedCities);
    if (!Array.isArray(rules) || !Array.isArray(cityRules)) throw new Error("Expected exclusion lists");
    var cities = new Set(cityRules.map(function (rule) {
      return cityKey(rule.country, rule.city);
    }));
    var addresses = new Set();
    var digests = new Set();
    rules.forEach(function (rule) {
      if (typeof rule === "string" && /^sha256:[a-f0-9]{64}$/i.test(rule.trim())) {
        digests.add(rule.trim().toLowerCase());
      } else {
        addresses.add(canonicalIP(rule));
      }
    });
    if (rules.length || cities.size) {
      var network = await currentNetwork();
      var address = canonicalIP(network.ip);
      if (addresses.has(address) ||
          (digests.size && digests.has(await ipDigest(address))) ||
          (cities.size && cities.has(cityKey(network.country_code, network.city)))) {
        fallback("excluded", "This network is excluded from the visitor count.");
        return;
      }
    }
    var widget = document.importNode(embed.content, true);
    widget.querySelector("script[src]").addEventListener("error", function () {
      fallback("unavailable", "Live map unavailable.");
    });
    mount.dataset.visitorMapState = "allowed";
    mount.appendChild(widget);
  } catch (_) {
    fallback("unavailable", "Network check unavailable · visit not counted.");
  }
})();
