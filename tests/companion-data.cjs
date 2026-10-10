const assert = require("node:assert/strict");
require("../assets/js/data/companion-dialogues.js");
require("../assets/js/data/companion-readings.js");
const d = globalThis.CompanionStories;
const effectTypes = require('../assets/js/core/companion-reactions.js').types;
const effects = {};
const corpus = new Set();
function checkActing(line) {
  assert(!corpus.has(line.text), 'Authored variants should be distinct across the corpus');
  corpus.add(line.text);
  assert(line.effect === 'none' || effectTypes.includes(line.effect), 'Every line needs explicit, supported effect direction');
  effects[line.effect] = (effects[line.effect] || 0) + 1;
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
    assert.equal(ch.responseVariations.length, 4);
    ch.responseVariations.forEach((pool, tier) => {
      assert(pool.length >= 1);
      assert.equal(new Set([ch.responses[tier], ...pool].map(line => line.text)).size, pool.length + 1);
    });
  });
  assert.equal(c.variations.greetings.length, 4);
  c.variations.greetings.forEach(pool => assert(pool.length >= 2));
  for (const topic of ['craft', 'rest']) {
    assert(c.variations[topic].length >= 2);
    c.variations[topic].forEach(sequence => assert.equal(sequence.length, 2));
  }
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
    assert.equal(d.story(id, 'today', 90, {
      date: new Date(2026, month, day, 2), pick: (_, pool) => pool.at(-1),
    }).lines[0], c.variations.holidays[name].at(-1), 'Holiday alternatives still take priority over night dialogue');
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
    assert(e.variants.length >= 2);
    e.variants.forEach(variant => {
      assert(/[ぁ-んァ-ヶ]/.test(variant.text) && !/[<>]/.test(variant.text));
      checkActing(variant);
    });
    people.add(e.id);
    remarks += 1 + e.variants.length;
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
require("../assets/js/data/companion-branches.js");
let branchLines = 0;
function checkBranchLines(value) {
  if (!value || typeof value !== 'object') return;
  if (value.text) { branchLines++; checkActing(value); }
  Object.values(value).forEach(checkBranchLines);
}
checkBranchLines(CompanionBranches);
const total = lines + remarks + branchLines + 18;
assert(total >= 300, 'The expanded corpus must remain substantially larger than the original 135 lines');
assert.equal(corpus.size, total);
assert.deepEqual(new Set(Object.keys(CompanionReadings)), corpus, 'Pronunciation coverage must exactly match the current dialogue corpus');
assert(effects.sparkle < total * 0.1, 'Stars are a rare accent, never a default for friendly speech');
assert(effects.none >= total / 3, 'Ordinary conversation leaves room for the model acting');
assert.equal(d.characters.alice.greetings[1].effect, 'none');
assert.equal(d.characters.marisa.morning.effect, 'sweat', 'Her embarrassed excuse uses sweat despite the confident face');
assert.equal(globalThis.CompanionRemarks.marisa.find(l => l.id === 'patchouli').effect, 'sweat');
assert.equal(globalThis.CompanionRemarks.patchouli.find(l => l.id === 'marisa').effect, 'anger');
console.log(
  `PASS: all ${total} lines have expression, pose, kana and contextual effects (${effects.sparkle} stars / ${effects.none} quiet)`
);

// Each bag covers its pool, stays independent of other contexts, and avoids a
// repeated line across the reshuffle boundary even with adversarial randomness.
for (const random of [() => 0, () => 0.999999]) {
  const pick = d.createPicker(random), pool = ['one', 'two', 'three'];
  let previous;
  for (let cycle = 0; cycle < 5; cycle++) {
    const seen = new Set();
    for (let n = 0; n < pool.length; n++) {
      const chosen = pick('alice:topic', pool.slice());
      assert.notEqual(chosen, previous);
      assert(!seen.has(chosen));
      seen.add(chosen); previous = chosen;
      assert.equal(pick('marisa:topic', ['solo']), 'solo');
    }
    assert.deepEqual(seen, new Set(pool));
  }
  assert.equal(pick('alice:topic', ['changed']), 'changed', 'A changed pool invalidates its bag');
}
for (const [id, c] of Object.entries(d.characters)) {
  const visited = new Set(), pick = d.createPicker(() => 0.6);
  const record = story => story.lines.forEach(line => visited.add(line));
  // Sweep date, weather and affinity contexts to prove all added story lines
  // are reachable through the actual story builder, including every sequence.
  for (let tier = 0; tier < 4; tier++) {
    for (let month = 0; month < 12; month++) {
      for (let day of [1, 3, 7, 14, 24, 25, 31]) {
        for (let hour of [2, 8, 15]) {
          for (let repeat = 0; repeat < 3; repeat++) record(d.story(id, 'today', tier * 25, { date: new Date(2026, month, day, hour), pick }));
        }
      }
    }
    for (const topic of ['craft', 'rest']) for (let repeat = 0; repeat < 3; repeat++) record(d.story(id, topic, tier * 25, {pick}));
  }
  for (const phase of [undefined, 'rain', 'snow', 'clear']) for (let repeat = 0; repeat < 3; repeat++) record(d.story(id, 'weather', 35, {weather: {phase}, pick}));
  function reachable(value) {
    if (!value || typeof value !== 'object') return;
    if (value.text) assert(visited.has(value), `${id}: unreachable story variant: ${value.text}`);
    Object.values(value).forEach(reachable);
  }
  reachable(c.variations);
}
console.log('PASS: complete non-repeating shuffle cycles, independent contexts, reachable seasonal/holiday/weather/affinity variants and intact two-line branches');
