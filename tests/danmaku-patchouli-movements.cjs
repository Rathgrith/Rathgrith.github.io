// Follow real trajectories through formation, suspension and release.
const assert = require("node:assert/strict");
const {scene, pulse, stepShot, patterns} = require("./helpers/danmaku-pattern-trace.cjs");
const shapes = new Set();
for (const {id} of patterns.cards.patchouli) {
  for (const rank of [1, 25]) {
    for (const part of [1, 2]) {
      const s = scene("patchouli", id, rank);
      const rhythm = s.rhythm;
      s.time = rhythm.sectionStart + (part + .2) / 3 * (rhythm.spellEnd - rhythm.sectionStart);
      assert.equal(patterns.difficulty(s).part, part);
      const seal = pulse(s, 0).shots;
      assert(seal.length >= 8 && seal.every(b => !b[6] || b[6].inscription), id + " opens with a visible parametric seal");
      const voices = [];
      for (let tick = 8; tick < 16; tick++) {
        const shots = pulse(s, tick).shots.filter(shot => shot[6]?.decelerate);
        if (shots.length) voices.push(shots);
      }
      assert.equal(voices.length, 2, id + " has a lead and a distinct answering cast");
      const sources = group => [...new Set(group.map(b => b[0].toFixed(1)))];
      assert.notDeepEqual(sources(voices[0]), sources(voices[1]));
      const glyphs = new Set(voices.flat().map(shot => shot[7]));
      const lettering = {
        bookmark:["folio", "rice", "crystal"], marginalia:["seal", "quill", "smallorb"],
        erratum:["saber", "quill", "scale"], concordance:["folio", "crystal", "quill"],
        footnote:["seal", "largeorb"], palimpsest:["scale", "seal", "crystal"],
      };
      for (const nib of lettering[id]) assert(glyphs.has(nib), id + " missing stroke " + nib);
      const points = voices.flat().map(shot => {
        const m = shot[6];
        const stopped = stepShot(shot, m.decelerate.to + .04).b;
        const cast = stepShot(shot, m.release.at + .10);
        assert(Math.hypot(stopped.vx, stopped.vy) < .01);
        if (id === "footnote") {
          assert.equal(shot[5], "bubble");
          assert(stepShot(shot, m.split.at - .04).alive);
          assert(!cast.alive && cast.children.length === 2);
          assert.deepEqual(cast.children.map(child => child[7]), ["smallorb", "quill"]);
          const crossing = cast.children.map(([x, y, angle, speed, , shape]) => {
            assert.equal(shape, "rice");
            assert(speed > 40 && y < 170);
            assert(Math.hypot(x - stopped.x, y - stopped.y) < 1);
            return x + (282 - y) / Math.tan(angle);
          });
          assert(Math.min(...crossing) < stopped.x && Math.max(...crossing) > stopped.x);
          return {x:stopped.x, y:stopped.y, crossing};
        }
        let fall = cast.b;
        if (id === "erratum") {
          assert(Math.abs(fall.vy) < .01 && Math.abs(fall.vx) > 2, "the red pen strikes across");
          const hinge = stepShot(shot, m.redirect.at - .03).b;
          assert(Math.abs(hinge.y - stopped.y) < 1);
          fall = stepShot(shot, m.redirect.at + .07).b;
        }
        assert(fall.vy > 27, id + " reaches the lower field");
        return {x:stopped.x, y:stopped.y,
          crossing:[fall.x + (282 - fall.y) * fall.vx / fall.vy]};
      });
      const gutter = id === "footnote" ? 120 + 18 * Math.sin(.65) :
        120 + 30 * Math.sin(.62 + patterns.difficulty(s).stage * .7);
      const left = points.filter(p => p.x < gutter), right = points.filter(p => p.x >= gutter);
      assert(left.length >= 7 && right.length >= 7);
      // Translating pages actually exchange sides. In the other cards the left
      // family lands to the left of the opening, including both footnote children.
      const [west, east] = id === "concordance" ? [right, left] : [left, right];
      assert(Math.max(...west.flatMap(p => p.crossing)) <= gutter - 10);
      assert(Math.min(...east.flatMap(p => p.crossing)) >= gutter + 10);
      assert(Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)) > 39);
      if (rank === 1) {
        const bins = [...new Set(points.map(p => Math.round(p.x / 6) + "," + Math.round(p.y / 5)))];
        shapes.add(bins.sort().join("/"));
      }
    }
  }
}
assert.equal(shapes.size, 12, "Each of the twelve facing-page editions traces a different outline");
console.log("PASS: 12 page contours at two ranks; crossing translations, real footnote forks, strike-through turns and shared lower-field passages.");

// Follow a solar reading after the pilot has moved. Each direct quote still
// crosses the original mark; changing only the run seed changes only the tail.
function solarReading(part, seed) {
  const s = scene("patchouli", "marginalia", 25);
  s.patternSeed = seed;
  Object.assign(s.rhythm, {sectionStart: 0, spellEnd: 300});
  s.time = part === 1 ? 150 : 250;
  Object.assign(s.player, {x: 73, y: 281});
  pulse(s, 0);
  pulse(s, 1);
  const mark = s.enemySpell.sight;
  assert.deepEqual([mark.x, mark.y], [73, 281]);
  assert(mark.ready - mark.at >= .48);
  s.player.x = 179;
  let tick = 2;
  function quote(elapsed) {
    s.time = mark.at + elapsed;
    s.boss.x += 1;
    return pulse(s, tick++).shots.filter(([x,y]) => x === s.boss.x && y === s.boss.y);
  }
  assert.equal(quote(.45).length, 0);
  const calls = part === 1 ? 2 : 3, rows = [];
  for (let i = 0; i < calls; i++) {
    const shots = quote(.51 + .20 * i);
    assert.equal(shots.length, 9);
    const solar = shots.find(shot => shot[7] === "solar");
    assert(solar && solar[3] >= 175);
    const time = Math.hypot(mark.x - solar[0], mark.y - solar[1]) / solar[3];
    const {b} = stepShot(solar, time);
    assert(Math.hypot(b.x - mark.x, b.y - mark.y) < 1);
    rows.push(shots);
  }
  const tail = quote(.51 + .20 * calls);
  assert.equal(tail.length, 9);
  const bearing = Math.atan2(mark.y - s.boss.y, mark.x - s.boss.x);
  assert(tail.every(q => Math.abs(q[2] - bearing) < .46 && q[3] >= 86 && q[3] < 120));
  assert.equal(quote(1.65).length, 0);
  return {rows, tail};
}
for (const part of [1, 2]) {
  const first = solarReading(part, 7);
  assert.deepEqual(first, solarReading(part, 7));
  const other = solarReading(part, 211);
  assert.deepEqual(other.rows, first.rows);
  assert.notDeepEqual(other.tail, first.tail);
}

// Play the recording from the declaration, including all other live card
// volleys. Find the gap between every real pair of crescent tips. A pilot
// crosses the missing radial line and turns back at 100 px/s.
const engine = require("../assets/js/games/danmaku-engine.js");
for (const rank of [1, 25]) {
  const phrase = engine.score.getTrack("patchouli").phrases[3];
  const game = engine.create("alice", "patchouli", 1977), s = game.state;
  s.countdown = 0; s.intro = null; s.time = phrase.start; s.run.nextWave = Infinity;
  Object.defineProperty(s, "level", {get: () => rank, set() {}});
  let passages = [], completed = 0;
  while (s.time + 1 / 60 < phrase.spellEnd) {
    s.player.invulnerable = Infinity; s.enemySpell.hp = Infinity;
    game.step(1 / 60);
    const tips = s.bullets.filter(b => b.visualStyle === "lunar" && b.age <= 1 / 60 + 1e-6);
    if (tips.length) {
      assert.equal(tips.length, 12);
      const gates = [];
      for (let i = 0; i < tips.length; i += 2) {
        const a = tips[i], b = tips[i + 1], dt = 1.68 - a.age;
        assert(Math.abs(a.heading - b.heading) < 1e-7);
        const width = Math.hypot(a.x-b.x + dt*(a.vx-b.vx), a.y-b.y + dt*(a.vy-b.vy));
        assert(width >= 45 && width <= 48, "bracketed cut spans several absent beads");
        gates.push({x:(a.x+b.x + dt*(a.vx+b.vx))/2, y:(a.y+b.y + dt*(a.vy+b.vy))/2, clear:true});
      }
      assert(Math.max(...gates.map(g=>g.y)) - Math.min(...gates.map(g=>g.y)) < .01);
      passages.push({time:s.time - tips[0].age, gates, frames:0});
    }
    passages = passages.filter(p => {
      const t = s.time - p.time - 1.68;
      if (t > .14) {
        assert(p.frames >= 15);
        assert(p.gates.some(g => g.clear), "another live voice must leave at least one turnaround open");
        completed++;
        return false;
      }
      if (t >= -.14) {
        p.frames++;
        const dx = 7 - 100 * Math.abs(t);
        for (const g of p.gates) {
          if (s.bullets.some(b => !b.inscribing &&
              Math.hypot(b.x-g.x-dx, b.y-g.y) <= b.radius + s.player.radius)) g.clear = false;
        }
      }
      return true;
    });
  }
  assert(completed >= 3);
}
console.log("PASS: solar target commitment, seeded tail variation, and physical turnarounds through all six moon rays at both ranks.");

// Follow the new constellations as colliding bodies. The first ring's shelf,
// the copy editor's two strokes and the marginal dagger have different routes.
for (const rank of [1, 25]) {
  const index = scene("patchouli", "bookmark", rank);
  const ink = new Set(), shelves = [52, 94, 140, 184, 140, 94];
  pulse(index, 0);
  for (let page = 0; page < 7; page++) {
    const desk = patterns.emitters(index)[1], shelf = shelves[page % shelves.length];
    const orbit = pulse(index, 2 + 9 * page).shots.filter(q => q[0] === desk.x && q[1] === desk.y);
    assert(orbit.length >= 25);
    const positions = orbit.map(q => stepShot(q, 1.72).b);
    const extent = axis => Math.max(...positions.map(b => b[axis])) - Math.min(...positions.map(b => b[axis]));
    assert(extent("x") > 145 && extent("y") > 50, "the live ecliptic forms a full-sized inclined ellipse");
    for (const b of positions) {
      const arrival = (292 - b.y) / b.vy;
      assert(Math.abs(b.x + b.vx * arrival - shelf) >= 20.9, "both rims share the reading aisle");
    }
    const dateInks = new Set(orbit.map(q => q[4]).filter(color => color !== "#c7a4f0" && color !== "#f5dcad"));
    assert.equal(dateInks.size, 1);
    for (const color of dateInks) ink.add(color);
  }
  assert.equal(ink.size, 7, "each of the seven dates has its own ink");

  const erratum = scene("patchouli", "erratum", rank);
  pulse(erratum, 0);
  for (const tick of [2, 18]) {
    const [red, gold] = pulse(erratum, tick).beams;
    assert(red && gold && red[0] !== gold[0]);
    assert(red[4] >= 1.2 && gold[4] > red[4] + red[5]);
    assert(red[7] * gold[7] < 0);
    const crossing = beam => beam[0] + (282 - beam[1]) / Math.tan(beam[2]);
    assert(Math.abs(crossing(red) - crossing(gold)) < .01);
    const beam = {x:red[0], y:red[1], angle:red[2], width:red[3], warning:red[4], age:red[4], sweep:red[7]};
    const mark = {x:crossing(red), y:282};
    assert(engine.laserGap(mark,beam) < 0);
    assert(engine.laserGap(mark,beam,red[5]) > 12, "the red pen sweeps off the crossed-out column");
  }

  const notes = scene("patchouli", "footnote", rank), landings = [];
  pulse(notes, 0);
  for (let date = 0; date < 7; date++) {
    const dagger = pulse(notes, date * 8 + 5).shots.filter(q => q[6]?.redirect);
    const blade = dagger.find(q => q[7] === "saber"), hilt = dagger.filter(q => q[7] === "quill");
    assert(blade && hilt.length === 2 && dagger.length >= 20);
    assert.equal(dagger.filter(q => ["solar", "lunar"].includes(q[7])).length, 1);
    const arms = hilt.map(q => stepShot(q, 1.75).b), tip = stepShot(blade, 1.75).b;
    assert(arms[1].x - arms[0].x > 54 && tip.y - arms[0].y > 25);
    assert(dagger.every(q => Math.abs(stepShot(q, 1.1).b.vx - tip.vx) < .01));
    // The blade point sits 26px below the centre of its glyph.
    landings.push(tip.x + (290 + 26 - tip.y) * tip.vx / tip.vy);
  }
  assert(Math.max(...landings) - Math.min(...landings) > 135, "the falling glyph changes sides through the week");
}
console.log("PASS: seven orbit inks and moving shelves, crossed and staggered laser strokes, and travelling footnote daggers.");

// A falling drop has a real splash at its impact point. Its centre opens as
// the two groups of nibs curl up and out, then descend on separate tracks.
for (const rank of [1,25]) {
  const s = scene("patchouli","marginalia",rank);
  pulse(s,0);
  const drop = pulse(s,2).shots.find(q => q[7] === "largeorb" && q[6]?.split);
  assert(drop && stepShot(drop,1.45).alive);
  const splash = stepShot(drop,1.55);
  assert(!splash.alive && splash.children.length >= 8);
  const origin = splash.children[0];
  assert(origin[1] > 220 && origin[1] < 275);
  for (const grain of splash.children) {
    const rising = stepShot(grain,.35).b, descending = stepShot(grain,1.14).b;
    assert(rising.vy < -20 && descending.vy > 80);
    assert(Math.abs(descending.x-origin[0]) > 20, "the former impact centre becomes passable");
  }

  const c = scene("patchouli","concordance",rank);
  pulse(c,0);
  const crescents = [8,14,32].map(tick => {
    const scroll = pulse(c,tick).shots.filter(q => q[6]?.redirect?.at === 1.66);
    const horns = scroll.filter(q => q[7] === "crystal");
    const tips = horns.map(q => stepShot(q,2.02).b);
    assert.equal(tips.length,2);
    assert(Math.abs(tips[0].x - tips[1].x) < 2 && tips[1].y-tips[0].y > 54);
    const phase = scroll.map(q => stepShot(q,2.02).b);
    assert(phase.every(b => Math.abs(b.vy) < .01 && Math.abs(b.vx) === 90));
    const span = Math.max(...phase.map(b => b.x)) - Math.min(...phase.map(b => b.x));
    assert(span > 19 && span < 25, "the live horns and inner rim describe a crescent");
    return {height:(tips[0].y+tips[1].y)/2, dir:Math.sign(tips[0].vx)};
  });
  assert(crescents[1].height-crescents[0].height > 59);
  assert.equal(crescents[0].dir,-crescents[1].dir);
  assert.equal(crescents[2].dir,-crescents[0].dir);

  const p = scene("patchouli","palimpsest",rank);
  pulse(p,0);
  for (const tick of [3,23]) {
    const line = pulse(p,tick).shots.filter(q => q[6]?.redirect && q[6]?.release);
    const glyphs = line.map(q => ({q, posted:stepShot(q,1.55).b})).sort((a,b)=>a.posted.x-b.posted.x);
    assert(glyphs.length >= 32 && glyphs.every(g=>g.posted.vy === 86));
    const head = tick===3 ? glyphs[0] : glyphs.at(-1), tail = tick===3 ? glyphs.at(-1) : glyphs[0];
    assert(Math.abs(head.posted.x-tail.posted.x) > 210);
    assert(stepShot(head.q,2.62).b.vy < -95 && stepShot(tail.q,2.62).b.vy === 86,
      "the first letters roll up while the opposite margin is still falling");
    assert(stepShot(tail.q,3.34).b.vy < -95);
  }
}
console.log("PASS: splitting ink jets, horizontal counter-readings at two heights, and reversible lines erased from alternating margins.");
