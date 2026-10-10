(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../data/kyureki-years.js"));
  } else {
    root.SiteWeatherCalendar = factory(root.SiteKyurekiYears);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (yearRows) {
  "use strict";

  var DAY = 86400000;
  var MONTH_NAMES = [
    "睦月",
    "如月",
    "弥生",
    "卯月",
    "皐月",
    "水無月",
    "文月",
    "葉月",
    "長月",
    "神無月",
    "霜月",
    "師走",
  ];
  var WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
  var LIGHTS = ["日", "月", "星"];
  var SEASONS = ["春", "夏", "秋", "冬"];
  var ELEMENTS = ["土", "火", "水", "木", "金"];
  var DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

  function kanjiNumber(value) {
    if (value === 0) return DIGITS[0];
    if (value >= 10000) return String(value);
    var text = "";
    [
      [1000, "千"],
      [100, "百"],
      [10, "十"],
      [1, ""],
    ].forEach(function (place) {
      var count = Math.floor(value / place[0]);
      if (count)
        text += (count === 1 && place[0] !== 1 ? "" : DIGITS[count]) + place[1];
      value %= place[0];
    });
    return text;
  }

  function civilDay(isoDate) {
    var parts = isoDate.split("-").map(Number);
    return Date.UTC(parts[0], parts[1] - 1, parts[2]) / DAY;
  }

  var years = (yearRows || []).map(function (row) {
    var lengths = row[2].split("").map(function (bit) {
      return 29 + Number(bit);
    });
    return {
      year: Number(row[0].slice(0, 4)),
      start: civilDay(row[0]),
      leapMonth: row[1],
      lengths: lengths,
      length: lengths.reduce(function (total, length) {
        return total + length;
      }, 0),
    };
  });

  function kyureki(day) {
    var unsupported = {
      supported: false,
      year: null,
      month: null,
      day: null,
      isLeapMonth: false,
      monthName: "",
      shortText: "換算範囲外",
      text: "換算範囲外",
    };
    // Locate the preceding year boundary; unsupported civil dates stay explicit.
    var low = 0,
      high = years.length - 1,
      index = -1;
    while (low <= high) {
      var middle = Math.floor((low + high) / 2);
      if (years[middle].start <= day) {
        index = middle;
        low = middle + 1;
      } else high = middle - 1;
    }
    if (index < 0) return unsupported;
    var year = years[index];
    var offset = day - year.start;
    if (offset >= year.length) return unsupported;
    var chronologicalMonth = 0;
    while (offset >= year.lengths[chronologicalMonth]) {
      offset -= year.lengths[chronologicalMonth++];
    }
    var isLeapMonth =
      year.leapMonth >= 0 && chronologicalMonth === year.leapMonth + 1;
    var month =
      chronologicalMonth +
      1 -
      (year.leapMonth >= 0 && chronologicalMonth > year.leapMonth ? 1 : 0);
    var date = offset + 1;
    var monthName = (isLeapMonth ? "閏" : "") + MONTH_NAMES[month - 1];
    var shortText =
      (isLeapMonth ? "閏" : "") +
      kanjiNumber(month) +
      "月" +
      kanjiNumber(date) +
      "日";
    return {
      supported: true,
      year: year.year,
      month: month,
      day: date,
      isLeapMonth: isLeapMonth,
      monthName: monthName,
      shortText: shortText,
      text: year.year + "年 " + shortText + "（" + monthName + "）",
    };
  }

  function gensokyo(year) {
    // This is a CE-to-season convention, not an exact youkai calendar.
    // Canon does not supply an unambiguous new-year boundary or daily conversion.
    var season = year - 1885;
    if (season < 0)
      return {
        supported: false,
        seasonNumber: null,
        seasonText: "換算範囲外",
        attributes: "",
        text: "換算範囲外",
      };
    var seasonText = "第" + kanjiNumber(season) + "季";
    var attributes =
      LIGHTS[season % 3] +
      "と" +
      SEASONS[season % 4] +
      "と" +
      ELEMENTS[season % 5] +
      "の年";
    return {
      supported: true,
      seasonNumber: season,
      seasonText: seasonText,
      attributes: attributes,
      text: seasonText + " · " + attributes,
    };
  }

  function format(date) {
    var instant = date === undefined ? new Date() : new Date(date);
    if (!Number.isFinite(instant.getTime()))
      throw new RangeError("Invalid weather calendar date");
    // All three readings use the visitor's local civil date, independently of
    // the station's time zone and age of the last weather observation. Use the
    // civil fields for table lookup so DST never adds or removes a calendar day.
    var year = instant.getFullYear(),
      month = instant.getMonth() + 1,
      day = instant.getDate();
    var isoDate = [
      String(year).padStart(4, "0"),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");
    var weekday = WEEKDAYS[instant.getDay()];
    var timeZone = "local";
    try {
      if (typeof Intl !== "undefined")
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || timeZone;
    } catch (error) {
      /* Local Date fields remain usable without Intl. */
    }
    return {
      timeZone: timeZone,
      isoDate: isoDate,
      gregorian: {
        year: year,
        month: month,
        day: day,
        weekday: weekday,
        text: year + "年" + month + "月" + day + "日（" + weekday + "）",
      },
      kyureki: kyureki(civilDay(isoDate)),
      gensokyo: gensokyo(year),
    };
  }

  return Object.freeze({ format: format });
});
