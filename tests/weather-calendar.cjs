const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const calendar = require("../assets/js/components/weather-calendar.js");
const rows = require("../assets/js/data/kyureki-years.js");
const DAY = 86400000;
process.env.TZ = "Europe/London";
const atCivil = (date) => {
  const [year, month, day] = date.split("-").map(Number);
  return calendar.format(new Date(year, month - 1, day, 12));
};
const parts = (date) => {
  const value = atCivil(date).kyureki;
  return [value.year, value.month, value.day, value.isLeapMonth];
};
const ordinal = (text) => {
  const [year, month, day] = text.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY;
};

// Calendar rollover follows the browser's local date, including DST offsets.
for (const [zone, midnight, newYear] of [
  ["Asia/Tokyo", "2026-10-10T15:00:00Z", "2026-12-31T15:00:00Z"],
  ["Europe/London", "2026-10-10T23:00:00Z", "2027-01-01T00:00:00Z"],
  ["America/Los_Angeles", "2026-10-11T07:00:00Z", "2027-01-01T08:00:00Z"],
]) {
  process.env.TZ = zone;
  const before = calendar.format(new Date(Date.parse(midnight) - 1));
  const after = calendar.format(new Date(midnight));
  assert.equal(
    before.isoDate,
    "2026-10-10",
    `${zone} day before local midnight`
  );
  assert.equal(after.isoDate, "2026-10-11", `${zone} local midnight`);
  assert.equal(before.kyureki.day, 30);
  assert.equal(after.kyureki.day, 1);
  assert.equal(after.timeZone, zone);
  assert.equal(
    calendar.format(new Date(Date.parse(newYear) - 1)).gensokyo.seasonNumber,
    141
  );
  assert.equal(calendar.format(new Date(newYear)).gensokyo.seasonNumber, 142);
}
process.env.TZ = "Europe/London";
assert.equal(calendar.format("2026-03-29T00:59:59Z").isoDate, "2026-03-29");
assert.equal(calendar.format("2026-03-29T01:00:00Z").isoDate, "2026-03-29");

// Every month has a valid length; every encoded year closes exactly at the next.
rows.forEach((row, index) => {
  assert.match(row[0], /^\d{4}-\d{2}-\d{2}$/);
  assert.match(row[2], /^[01]{12,13}$/);
  assert.equal(row[2].length, row[1] === -1 ? 12 : 13);
  assert.ok(row[1] >= -1 && row[1] <= 11);
  if (index < rows.length - 1) {
    assert.equal(
      ordinal(rows[index + 1][0]) - ordinal(row[0]),
      [...row[2]].reduce((sum, bit) => sum + 29 + Number(bit), 0)
    );
  }
});

assert.equal(atCivil("2026-10-10").gregorian.text, "2026年10月10日（土）");
assert.equal(atCivil("2026-10-10").timeZone, "Europe/London");
assert.deepEqual(parts("2026-10-10"), [2026, 8, 30, false]);
assert.deepEqual(parts("2026-10-11"), [2026, 9, 1, false]);
assert.equal(atCivil("2026-10-11").kyureki.monthName, "長月");
assert.equal(atCivil("2026-10-10").kyureki.shortText, "八月三十日");
assert.equal(atCivil("2026-10-11").kyureki.shortText, "九月一日");

// A real Japanese/Chinese calendar divergence: the 2027 new moon is 00:56 JST.
assert.deepEqual(parts("2027-02-06"), [2026, 12, 30, false]);
assert.deepEqual(parts("2027-02-07"), [2027, 1, 1, false]);
assert.deepEqual(parts("2025-07-25"), [2025, 6, 1, true]);
assert.deepEqual(parts("2025-08-23"), [2025, 7, 1, false]);
assert.equal(atCivil("2025-07-25").kyureki.monthName, "閏水無月");
assert.match(atCivil("2025-07-25").kyureki.text, /閏六月一日/);
assert.equal(atCivil("2025-07-25").kyureki.shortText, "閏六月一日");
assert.deepEqual(parts("2033-12-22"), [2033, 11, 1, true]);
assert.deepEqual(parts("2034-01-20"), [2033, 12, 1, false]);
assert.deepEqual(parts("2034-02-19"), [2034, 1, 1, false]);

assert.equal(atCivil("1885-01-01").gensokyo.seasonText, "第零季");
assert.equal(atCivil("1884-12-31").gensokyo.supported, false);
assert.equal(
  atCivil("2005-06-01").gensokyo.text,
  "第百二十季 · 日と春と土の年"
);
assert.equal(
  atCivil("2026-10-10").gensokyo.text,
  "第百四十一季 · 日と夏と火の年"
);
assert.equal(atCivil("1931-02-16").kyureki.supported, false);
assert.equal(atCivil("1931-02-16").kyureki.shortText, "換算範囲外");
assert.deepEqual(parts("1931-02-17"), [1931, 1, 1, false]);
assert.deepEqual(parts("2100-02-08"), [2099, 12, 30, false]);
assert.equal(atCivil("2100-02-09").kyureki.supported, false);
assert.equal(atCivil("2100-02-09").gregorian.text, "2100年2月9日（火）");
assert.throws(() => calendar.format("invalid"), RangeError);
assert.throws(() => calendar.format(new Date(NaN)), RangeError);

// Browser UMD exports work offline without Intl (Chinese or otherwise), and a
// missing optional data script cannot break the Gregorian/Gensokyo display.
const dataCode = fs.readFileSync(
  path.join(root, "assets/js/data/kyureki-years.js"),
  "utf8"
);
const code = fs.readFileSync(
  path.join(root, "assets/js/components/weather-calendar.js"),
  "utf8"
);
const browser = vm.createContext({ Date, Intl: undefined });
vm.runInContext(dataCode, browser);
vm.runInContext(code, browser);
assert.equal(
  browser.SiteWeatherCalendar.format("2027-02-07T03:00:00Z").kyureki.day,
  1
);
const missingTable = vm.createContext({ Date, Intl: undefined });
vm.runInContext(code, missingTable);
assert.equal(
  missingTable.SiteWeatherCalendar.format("2026-10-10T03:00:00Z").kyureki
    .supported,
  false
);
assert.equal(
  missingTable.SiteWeatherCalendar.format("2026-10-10T03:00:00Z").gensokyo
    .seasonNumber,
  141
);
const now = new Date();
assert.equal(
  calendar.format().isoDate,
  [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-")
);
assert.equal(missingTable.SiteWeatherCalendar.format().timeZone, "local");

console.log(
  `weather-calendar: ${rows.length} year boundaries; local time zones, leap months, canonical season anchors and fallback checks passed`
);
