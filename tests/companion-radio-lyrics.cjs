"use strict";
const assert = require("node:assert/strict");
const { parse, indexAt } = require("../assets/js/core/companion-radio-lyrics.js");

// These are invented test labels, not song lyrics.
assert.deepEqual(parse("[ar:Example]\n[ti:Example]\n[00:01]\nuntimed text"), { lines: [], offset: 0 });
assert.deepEqual(parse("\uFEFF[00:10.5] テストA\r\n[00:02.05][00:20.005]テストB\r[1:03]テストC").lines, [
  { time: 2.05, text: "テストB" }, { time: 10.5, text: "テストA" },
  { time: 20.005, text: "テストB" }, { time: 63, text: "テストC" },
]);
assert.deepEqual(parse("[offset:+500]\n[00:01.000]テストA\n[offset:1000]\n[00:00.2]テストB"), {
  offset: 1000, lines: [{ time: 0, text: "テストB\nテストA" }],
});
assert.deepEqual(parse("[offset:-500]\n[00:01]テスト").lines, [{ time: 1.5, text: "テスト" }]);
assert.deepEqual(parse("[00:01]A\n[00:01]A\n[00:01]B").lines, [{ time: 1, text: "A\nB" }]);
assert.deepEqual(parse("[00:01]<img src=x onerror=alert(1)>\n[00:02]文字 & 記号").lines, [
  { time: 1, text: "<img src=x onerror=alert(1)>" }, { time: 2, text: "文字 & 記号" },
]);
assert.deepEqual(parse("[00:70]invalid\n[99:99]invalid\n[00:-1]invalid").lines, []);
assert.equal(parse("[10:15:25]A").lines[0].time, 615.25);
assert.throws(() => parse("あ".repeat(70000)), RangeError, "limit counts UTF-8 bytes, not JS code units");
assert.throws(() => parse(null), TypeError);

const timeline = parse("[00:01]A\n[00:02]B\n[00:03]C").lines;
for (const [time, expected] of [[0,-1],[.999,-1],[1,0],[1.999,0],[2,1],[3,2],[999,2]]) {
  assert.equal(indexAt(timeline, time), expected, `correct active line at ${time}`);
}
assert.equal(indexAt([], 5), -1);
assert.equal(indexAt(timeline, 2 - .5), 0, "positive manual delay postpones the next line");
assert.equal(indexAt(timeline, 1.5 - (-.5)), 1, "negative manual delay advances the next line");
console.log("PASS: LRC parsing, timestamps, offsets, sorting, duplicates, UTF-8 limits and playback lookup");
