const assert = require("node:assert/strict");
const measure = require("../scripts/measure-danmaku-density.cjs");
const engine = require("../assets/js/games/danmaku-engine.js");
for (const cycle of [0, 1, 3, 6]) {
  const report = measure(cycle);
  for (const enemy of Object.keys(engine.cast)) {
    const rows = report.rows.filter((r) => r.enemy === enemy);
    assert.equal(rows.length, 6);
    rows.forEach((row, i) => {
      assert(
        row.samples >= 200 && row.peak < 700,
        "sustained samples without pool saturation"
      );
      if (i)
        assert(
          row.coverage >= rows[i - 1].coverage,
          `${enemy} round ${cycle + 1}: ${row.card} pressure falls from ${rows[i - 1].coverage} to ${row.coverage}`
        );
    });
    console.log(
      `round ${cycle + 1} ${enemy}: ${rows.map((r) => Math.round(r.coverage * 100)).join(" → ")}% lower-arena coverage`
    );
  }
}
console.log(
  "PASS: actual lower-arena hazard coverage increases across all six stages at opening, repeat, middle and capped difficulty."
);
