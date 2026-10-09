const assert = require("node:assert/strict");
require("../assets/js/data/companion-dialogues.js");
require("../assets/js/data/companion-readings.js");
const d = globalThis.CompanionStories;
function checkActing(line) {
  assert(globalThis.CompanionReadings[line.text], "Every line needs a reviewed kana reading");
  assert.match(
    line.expressionMotionId,
    /^0[1-8]$/,
    "Every line needs an explicit expression"
  );
  assert.match(
    line.poseId,
    /^[1-5]$/,
    "Every line needs an explicit supported body pose"
  );
}
let lines = 0;
for (const [id, c] of Object.entries(d.characters)) {
  assert.equal(new Set(c.greetings.map((l) => l.text)).size, 4);
  for (const topic of ["today", "rest", "craft", "weather"]) {
    for (const affection of [0, 24, 25, 49, 50, 74, 75, 100]) {
      const story = d.story(id, topic, affection, {
        date: new Date(2026, 9, 8, 12),
        weather: { phase: "rain" },
      });
      assert(story.lines.length);
      story.lines.forEach((l) => {
        assert(l.text && /[ぁ-んァ-ヶ]/.test(l.text));
        assert(!l.translation, "Dialogue is Japanese only");
      });
    }
  }
  c.choices.forEach((ch) => {
    assert.equal(new Set(ch.responses.map((l) => l.text)).size, 4);
    assert(ch.delta >= 1 && ch.delta <= 2);
  });
  const holidays = [
    [0, 1, "newyear"],
    [0, 3, "newyear"],
    [1, 14, "valentine"],
    [2, 3, "hinamatsuri"],
    [6, 7, "tanabata"],
    [9, 31, "halloween"],
    [11, 24, "christmas"],
    [11, 25, "christmas"],
    [11, 31, "yearend"],
  ];
  for (const [month, day, name] of holidays) {
    const story = d.story(id, "today", 90, {
      date: new Date(2026, month, day, 12),
    });
    assert.equal(story.special, name);
    assert.equal(story.lines[0], c.holidays[name]);
  }
  assert.equal(d.holiday(new Date(2026, 0, 4)), "");
  assert.equal(
    d.story(id, "today", 0, { date: new Date(2026, 9, 8, 2) }).lines[0],
    c.night
  );
  assert.equal(d.story(id, "weather", 0, {}).lines[0], c.weather.unknown);
  function count(o) {
    if (!o || typeof o !== "object") return;
    if (o.text) {
      lines++;
      checkActing(o);
    }
    Object.values(o).forEach(count);
  }
  count(c);
}
assert.equal(d.tier(-10), 0);
assert.equal(d.tier(100), 3);
console.log(
  "PASS: " +
    lines +
    " original Japanese lines; all 4 affinity tiers, branches, day/night and 7 holiday groups"
);

require("../assets/js/data/companion-remarks.js");
let remarks = 0;
const people = new Set();
for (const [speaker, entries] of Object.entries(globalThis.CompanionRemarks)) {
  assert(d.characters[speaker]);
  assert.equal(new Set(entries.map((e) => e.id)).size, entries.length);
  entries.forEach((e) => {
    assert(e.id !== speaker && e.name && /[ぁ-んァ-ヶ]/.test(e.text));
    assert(!/[<>]/.test(e.text));
    checkActing(e);
    people.add(e.id);
    remarks++;
  });
}
console.log(
  `PASS: ${remarks} Japanese remarks covering ${people.size} characters/groups`
);

const loader = require("node:fs").readFileSync(
  require("node:path").join(__dirname, "../assets/js/core/live2d-loader.js"),
  "utf8"
);
const originals = require("node:vm").runInNewContext(
  "(" +
    loader
      .split("var CHARACTER_INTERACTIONS = ")[1]
      .split(";\n  var preferenceStorageKey")[0] +
    ")"
);
for (const [id, entries] of Object.entries(originals)) {
  assert.equal(entries.length, 6);
  entries.forEach(checkActing);
}
assert.equal(lines + remarks + 18, 135);
console.log(
  "PASS: all 135 dialogue lines have explicit expression and pose direction"
);
