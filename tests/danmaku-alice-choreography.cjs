const assert = require("node:assert/strict");
const {
  scene,
  pulse,
  patterns,
  stepShot,
} = require("./helpers/danmaku-pattern-trace.cjs");
for (const rank of [1, 25]) {
  const s = scene("alice", "skipstitch", rank),
    dolls = patterns.emitters(s),
    openings = [],
    seams = [];
  for (let tick = 0; tick < 24; tick++) {
    const { shots } = pulse(s, tick);
    if (tick % 4) {
      assert.equal(shots.length, 0);
      continue;
    }
    const empty = dolls
      .map((d, i) => (shots.some((b) => b[0] === d.x) ? -1 : i))
      .filter((i) => i >= 0);
    assert.equal(empty.length, 1);
    openings.push(empty[0]);
    const sewing = dolls.find((d,i) => i !== empty[0]);
    const angles = shots.filter((b) => b[0] === sewing.x).map((b) => b[2]);
    const middle = (Math.min(...angles) + Math.max(...angles)) / 2;
    const displacement = (300 - sewing.y) / Math.tan(middle);
    seams.push(displacement);
    const resting = dolls[empty[0]];
    const safeX = resting.x + (300 - resting.y) / Math.tan(middle);
    assert(shots.every(([x, y, angle]) => Math.abs(x + (300 - y) / Math.tan(angle) - safeX) > 16),
      "the resting needle projects a body-width opening in the player area");
  }
  assert.deepEqual(
    openings,
    [0, 1, 2, 1, 0, 1],
    "rank cannot fill the single missed stitch"
  );
  assert(Math.max(...seams) - Math.min(...seams) > 32,
    "neighbouring seams sweep across the permanent resting points between dolls");
  const curtain = scene("alice", "curtaincall", rank);
  const { beams, shots } = pulse(curtain, 0);
  assert.equal(beams.length, 2);
  assert.equal(beams[1][0] - beams[0][0], 80);
  assert(
    shots.every((b) => b[0] !== 60),
    "the cue lights flank a truly clear lane"
  );
}
const s = scene("alice", "pleats"),
  pins = pulse(s, 0).shots;
const times = [...new Set(pins.map((p) => p[6].release.at))].sort(
  (a, b) => a - b
);
assert.equal(times.length, 5);
assert(times.at(-1) - times[0] >= 0.55, "the step unfolds in sequence");
console.log(
  "PASS: skip-stitch route, delayed folds, and curtain boundaries at both ranks."
);

// The tracing remembers a safe opening. Moving after the first needle cannot
// retarget the second hem. At player height the cloth carries that opening along.
for (const rank of [1, 25]) {
  const s = scene("alice", "basting", rank);
  Object.assign(s.rhythm, {sectionStart:0, spellEnd:60});
  s.time = 50; s.player.x = 80;
  const left = pulse(s, 0).shots;
  s.player.x = 180;
  const right = pulse(s, 3).shots;
  assert.equal(s.enemySpell.seam.x, 80);
  assert(left.length >= 10 && right.length === left.length);
  for (const row of [175, 245, 315]) {
    const edgeX = shot => {
      const h = shot[6].hem;
      const age = .75 + (row - h.y - h.drop) / h.speed;
      return stepShot(shot, age).b.x;
    };
    const l = Math.max(...left.map(edgeX)), r = Math.min(...right.map(edgeX));
    assert(r - l >= 47, "one traversable cut connects both hems");
    if (row === 175) assert(Math.abs((l + r) / 2 - 80) < 3);
    if (row === 315) assert(Math.abs((l + r) / 2 - 129) < 2);
  }
}

// Alice latches one mark before the needles depart; a moved boss still aims at
// that mark. Strands of the trailing tassel have independent deterministic jitter.
function shuttle(seed, xAfter, pointBlank = false) {
  const s = scene("alice", "shuttle", 25);
  s.patternSeed = seed;
  Object.assign(s.rhythm, {sectionStart:0, spellEnd:90});
  s.time = 45; Object.assign(s.player, {x:102, y:286});
  pulse(s, 0);
  assert.equal(s.enemySpell.sight.x, 102);
  s.boss.x += 6;
  Object.assign(s.player, pointBlank ? s.boss : {x:xAfter, y:286});
  const bossShots = (tick, t) => {
    s.time = 45 + t;
    return pulse(s, tick).shots.filter(([x,y]) => x === s.boss.x && y === s.boss.y);
  };
  assert.equal(bossShots(2, .42).length, 0);
  const needle = [3,4,5].map((tick, i) => bossShots(tick, .55 + .18 * i));
  const tail = [7,9].flatMap((tick,i) => bossShots(tick, 1.25 + .38*i));
  return {needle, tail};
}
const woven = shuttle(213, 88);
assert.deepEqual(woven, shuttle(213, 169));
assert.deepEqual(woven.needle, shuttle(214, 169).needle);
assert.notDeepEqual(woven.tail, shuttle(214, 169).tail);
for (const volley of woven.needle) {
  assert.equal(volley.filter(shot => shot[7] === "saber").length, 1);
  const [x,y,a,v] = volley.find(shot => shot[7] === "saber");
  assert(Math.abs(x + (286-y) / Math.tan(a) - 102) < .001);
  assert(v >= 173);
}
assert(woven.tail.length >= 12 && woven.tail.every(shot => shot[3] < 132));
assert(shuttle(213, 102, true).needle.every(volley => !volley.length));

// Cross and turn back through each actual moving thread at ordinary pilot
// speed. Test the entire volley, including the other wing, at both ranks.
for (const rank of [1,25]) {
  for (const part of [1,2]) {
    const s = scene("alice", "curtaincall", rank);
    Object.assign(s.rhythm, {sectionStart:0, spellEnd:90});
    s.time = part * 30 + 8;
    pulse(s,0);
    for (const tick of [17,25]) {
      const cast = pulse(s,tick).shots.filter(shot => shot[0] === 20 || shot[0] === 220);
      const rays = new Map();
      for (const shot of cast) {
        const key = shot.slice(0,3).join();
        if (!rays.has(key)) rays.set(key, []);
        rays.get(key).push(shot);
      }
      assert.equal(rays.size, part === 1 ? 4 : 6);
      for (const ray of rays.values()) {
        const edges = ray.filter(shot => shot[7] === "bobbin");
        assert.equal(edges.length, 2, "both ends of a real missing length have a bobbin");
        const [lower,upper] = edges.map(shot => stepShot(shot,1.98).b);
        const gate = {x:(lower.x+upper.x)/2, y:(lower.y+upper.y)/2};
        assert(upper.y-lower.y >= 30);
        for (let step = 0; step <= 32; step++) {
          const t = 1.98 + (step-16)/120;
          const px = gate.x + 6 - .75*Math.abs(step-16);
          for (const [x,y,a,v,,,,style] of cast) {
            const dx = x + Math.cos(a)*v*t - px, dy = y + Math.sin(a)*v*t - gate.y;
            const radius = style === "saber" ? 2.3 : style === "smallorb" ? 1.7 : 2.1;
            assert(Math.hypot(dx,dy) > radius + 2.2, "the pilot can cross a thread in both directions");
          }
        }
      }
    }
  }
}
console.log("PASS: latched fast shuttle, seeded loose ends, close-range grace and two-way radial openings.");

// The first two working needles each stitch a hollow feather. In a real frame
// its two flanks surround open space, with different bodies on the tip and tail.
for (const rank of [1, 25]) {
  const s = scene("alice", "skipstitch", rank), first = pulse(s, 0).shots;
  const grains = first.filter(shot => shot[0] === 120);
  const bodies = grains.map(shot => ({b:stepShot(shot, 2.4).b, style:shot[7]}));
  const tip = bodies.find(p => p.style === "saber").b, heel = bodies.find(p => p.style === "bobbin").b;
  const pearls = bodies.filter(p => p.style === "smallorb").map(p => p.b);
  assert(tip.y - heel.y > 65 && Math.abs(tip.x - heel.x) < 1);
  assert(Math.min(...pearls.map(p => p.x)) < 90 && Math.max(...pearls.map(p => p.x)) > 150);
  const midY = (tip.y + heel.y) / 2;
  assert(bodies.every(({b}) => Math.hypot(b.x - 120, b.y - midY) > 20));
}

for (const rank of [1, 25]) for (const part of [0, 1, 2]) {
  const s = scene("alice", "buttonhole", rank);
  Object.assign(s.rhythm, {sectionStart:0, spellEnd:90});
  s.time = 9 + 30 * part;
  pulse(s,0);
  for (const row of [0, 1, 2, 3]) {
    const gateX = [65,115,169,117][row], lace = pulse(s, row*16 + 5).shots;
    const from = patterns.emitters(s).filter(d => !d.relay);
    // Ignore replies from the balcony. Both real dressmakers contribute a
    // strand whose crests alternate above and below the other strand.
    const threads = from.map(d => lace.filter(a => a[0] === d.x && a[1] === d.y));
    const endpoints = threads.map(thread => thread.map(a => stepShot(a,2.28).b));
    assert.equal(endpoints[0].length,endpoints[1].length);
    const diffs = endpoints[0].map((a,i) => {
      const b = endpoints[1][i];
      assert(Math.abs(a.x-b.x)<1);
      assert(Math.abs(a.x-gateX)>17);
      return a.y-b.y;
    });
    assert(diffs.filter((v,i) => i && v*diffs[i-1] < 0).length >= 3);
    assert(threads.every(thread => thread.filter(a => a[7] === "spool").length === 2));
    // Move up through both descending threads at focused keyboard speed.
    for (let frame=-12; frame<=12; frame++) {
      const t=2.28+frame/60, y=273-frame*56/60;
      for (const [x0,y0,a,v] of threads.flat())
        assert(Math.hypot(gateX - x0 - Math.cos(a)*v*t, y - y0 - Math.sin(a)*v*t) > 5);
    }
  }

  const pleats = scene("alice", "pleats", rank);
  Object.assign(pleats.rhythm, {sectionStart:0, spellEnd:90});
  pleats.time = 8 + 30 * part;
  const pins = pulse(pleats,0).shots;
  let lastSlope;
  for (let i=0;i<6;i++) {
    if (i === 1 || (part === 2 && i === 4)) { lastSlope=undefined; continue; }
    const strip = pins.filter(a => a[0] === 20 + 40*i);
    assert(strip.every(a => Math.abs(stepShot(a,.35).b.x - a[0]) < .1));
    const ends = strip.map(a => stepShot(a, a[6].release.at + 2.53 - .12*part).b);
    const first=ends[0], last=ends.at(-1), slope=last.y-first.y;
    assert(last.x-first.x>27 && Math.abs(slope)>34);
    if (lastSlope !== undefined) assert(lastSlope*slope<0, "Neighbouring pleats face opposite ways");
    assert(ends.every(p => Math.abs(p.x-60)>16 && (part!==2 || Math.abs(p.x-180)>16)));
    lastSlope=slope;
  }
}
console.log("PASS: hollow feather stitching, two synchronized lace edges with traversable eyelets, and alternating accordion folds at ranks 1 and 25.");

// The shuttle holds its wooden hull together on the outward trip and crosses
// its old x again at a lower y on the return. Either hand can take the throw.
for (const rank of [1,25]) {
  const state = scene("alice","shuttle",rank);
  pulse(state,0);
  for (const [pass,hand] of [[0,1],[1,-1]]) {
    const hull = pulse(state,1 + 16*pass).shots.filter(a => a[6]?.redirect && a[6]?.release);
    const at = time => hull.map(a => stepShot(a,time).b);
    const axis = pts => pts.find((_,i) => hull[i][7] === "bobbin");
    const dock = at(1.2), outward = at(2.73), back = at(4.25);
    assert.equal(hull.filter(a => a[7] === "saber").length,1);
    assert(hull.some(a => a[7] === "spool") && hull.some(a => a[7] === "ribbon"));
    assert((axis(outward).x-axis(dock).x)*hand > 165);
    assert((axis(outward).x-axis(back).x)*hand > 145 && axis(back).y-axis(outward).y > 70);
    hull.forEach((_,i) => {
      assert(Math.abs((outward[i].x-axis(outward).x) - (back[i].x-axis(back).x)) < .2);
      assert(Math.abs((outward[i].y-axis(outward).y) - (back[i].y-axis(back).y)) < .2);
    });
  }

  const paper = scene("alice","basting",rank);
  paper.player.x = 89;
  pulse(paper,0);
  const scissors = pulse(paper,2).shots.filter(a => a[6]?.redirect?.at === 1.18);
  paper.player.x = 175;
  const ends = scissors.filter(a => a[7] === "saber");
  assert.equal(ends.length,2);
  assert.equal(scissors.filter(a => a[7] === "smallorb").length,16, "two distinct finger rings");
  assert(pulse(paper,3).shots.some(a => a[6]?.redirect?.at === .95));
  assert(!pulse(paper,6).shots.some(a => a[6]?.redirect?.at === .95),
    "the two initial chalk strokes leave a beat for the pilot to return");
  const tips = time => ends.map(a => stepShot(a,time).b.x);
  assert(tips(1.19)[0] < 46 && tips(1.19)[1] > 132);
  assert(tips(2.03).every(x => Math.abs(x-89) < 1.4), "the blades meet over the old chalk mark");
  assert(tips(2.65)[0] > 119 && tips(2.65)[1] < 59, "the blades pass and open on opposite sides");

  const stage = scene("alice","curtaincall",rank);
  pulse(stage,0);
  for (const bar of [0,1]) {
    const hinges = [2,5,9].map(cue => {
      const lamps = pulse(stage, 32*bar+cue).shots.filter(a => a[6]?.split);
      assert.equal(lamps.length,2);
      const broken = lamps.map(a => stepShot(a,1.49));
      assert(broken.every(shell => !shell.alive && shell.children.length >= 6));
      const children = broken.flatMap(shell => shell.children);
      const cx = (broken[0].b.x+broken[1].b.x)/2, cy = (broken[0].b.y+broken[1].b.y)/2;
      const edge = children.filter(a => a[7] === "saber");
      assert.equal(edge.length,4);
      assert(children.every(a => Math.sin(a[2]) > 0 && (a[0]-cx)*Math.cos(a[2]) > 0));
      // Walk up into the triangular vacancy immediately under the spent hinge.
      for (let frame=0;frame<36;frame++) {
        const t=.48+frame/60, py=cy+72-56*frame/60;
        assert(children.every(([x,y,a,v]) => Math.hypot(cx-x-Math.cos(a)*v*t,py-y-Math.sin(a)*v*t) > 6));
      }
      return cx;
    });
    assert.equal(Math.sign(hinges[2]-hinges[0]),bar ? -1 : 1);
    assert(Math.abs(hinges[1]-hinges[0]) > 50);
  }
}
console.log("PASS: returning shuttle hull, baited crossing shears, and successive footlights with traversable fan hinges.");
