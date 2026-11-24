const assert = require("node:assert/strict");
const { scene, pulse, stepShot } = require("./helpers/danmaku-pattern-trace.cjs");
const engine = require("../assets/js/games/danmaku-engine.js");

function prepare(id, rank, part, seed = 19) {
  const s = scene("marisa", id, rank);
  s.patternSeed = seed;
  Object.assign(s.rhythm, {sectionStart: 0, spellEnd: 90});
  s.time = 5 + part * 30;
  return s;
}
function burst(seed, dodge) {
  const s = prepare("exposure", 25, 2, seed);
  s.player.x = 83; s.player.y = 292;
  const held = {x:s.player.x, y:s.player.y}, initial = s.time;
  const lead = [], tail = [];
  for (let tick = 0; tick < 7; tick++) {
    s.time = initial + tick * .2;
    if (tick === 1 && dodge) s.player.x = 174;
    const shots = pulse(s, tick).shots.filter(b => b[0] === s.boss.x && b[1] === s.boss.y);
    if (tick < 3) assert.equal(shots.length, 0, "the real emitter waits for the lock to develop");
    if (tick === 3) lead.push(...shots);
    if (tick === 4 || tick === 5) tail.push(...shots);
  }
  assert.deepEqual([s.enemySpell.sight.x, s.enemySpell.sight.y], [held.x, held.y]);
  return {lead, tail, held};
}
const a = burst(58, false), b = burst(58, true), c = burst(233, false);
assert.deepEqual(a,b, "sidestepping the lock baits the burst and its tail");
assert.deepEqual(a.lead, c.lead);
assert.notDeepEqual(a.tail, c.tail);
assert.equal(a.lead.length, 18);
assert.equal(new Set(a.lead.map(shot => shot[2])).size, 3, "three straight optical rails");
assert.equal(Math.max(...a.lead.map(s => s[3])), 203);
assert(a.lead.some(([x,y,angle]) => Math.abs(x + (a.held.y - y)/Math.tan(angle) - a.held.x) < .001));
assert.equal(a.tail.length, 18);
assert(a.tail.every(s => s[3] >= 87 && s[3] <= 127 && s[3] < Math.min(...a.lead.map(s=>s[3]))));

// Walk across an actual, moving spoke at the measured radial notch. Check the
// entire fan, including neighbouring spokes. Filling its hole must stop the walk.
function crossing(group, all, dir) {
  const ordered = group.slice().sort((a,b)=>a[3]-b[3]);
  const split = ordered.findIndex((b,i)=>i && b[3] - ordered[i-1][3] > 10);
  assert(split > 0, "each line consists of two occupied radial intervals");
  const before = ordered[split-1], after = ordered[split];
  assert.equal(before[7], "saber"); assert.equal(after[7], "saber");
  const [sx,sy,bearing] = before, time = 2.05;
  const v = (before[3] + after[3])/2;
  const x = sx + Math.cos(bearing)*v*time, y = sy + Math.sin(bearing)*v*time;
  let clearance = Infinity;
  for (let frame=-12; frame<=12; frame++) {
    const dt = frame/60, age = time + dt;
    const pilotX = x + dir*95*dt;
    for (const shot of all) {
      const bx = shot[0] + Math.cos(shot[2])*shot[3]*age;
      const by = shot[1] + Math.sin(shot[2])*shot[3]*age;
      const r = 2.2 + engine.projectileRadius(shot[7], 1.9);
      clearance = Math.min(clearance, Math.hypot(pilotX-bx, y-by)-r);
    }
  }
  assert(clearance > 2, "full pilot crosses on either heading, with a margin");
  const filler = [sx,sy,bearing,v,before[4],"smallstar"];
  const filled = stepShot(filler,time).b;
  assert(Math.hypot(filled.x-x,filled.y-y) < .001);
  assert(x >= 0 && x <= 240 && y >= 215 && y <= 310);
}
for (const rank of [1,25]) for (const part of [1,2]) {
  const s=prepare("shutter",rank,part), replies=[];
  for (let tick=0;tick<=8;tick++) {
    const shots=pulse(s,tick).shots;
    const fromLens=shots.filter(b => b[4] === "#98ecd5" || b[4] === "#ffd57c");
    if (!fromLens.length) continue;
    replies.push(fromLens[0][0]);
    const rays = new Map();
    for (const shot of fromLens) {
      if (!rays.has(shot[2])) rays.set(shot[2], []);
      rays.get(shot[2]).push(shot);
    }
    assert.equal(rays.size,part===2?4:3);
    for(const group of rays.values()){
      crossing(group,fromLens,-1);
      crossing(group,fromLens,1);
    }
  }
  assert.equal(replies.length,2);
  assert.notEqual(replies[0],replies[1], "a different visible lens supplies the reply");
}
console.log("PASS: fast locked photographic bursts, seed-dependent trailing grain, and traversable twin-lens shutter files in both directions at two ranks.");

// A real pilot can change lanes through the aperture and the separated colour
// bands. Sample successive physical frames as each outline falls past the pilot.
function imageAt(shot, age) {
  return {x:shot[0] + Math.cos(shot[2]) * shot[3] * age,
    y:shot[1] + Math.sin(shot[2]) * shot[3] * age};
}
function passThrough(shots, focus, pilot, frames) {
  let clearance = Infinity;
  for (let frame = -frames; frame <= frames; frame++) {
    const dt = frame / 60, p = pilot(dt);
    for (const shot of shots) {
      const b = imageAt(shot, focus + dt);
      const radius = engine.projectileRadius(shot[7], 1.9);
      clearance = Math.min(clearance, Math.hypot(p.x - b.x, p.y - b.y) - radius - 2.2);
    }
  }
  assert(clearance > 1, "the marked crossing admits the complete moving hitbox");
}
for (const rank of [1, 25]) {
  const camera = prepare("exposure", rank, 0);
  camera.player.x = 46;
  pulse(camera, 0);
  camera.player.x = 190;
  const blades = pulse(camera, 1).shots;
  const corners = blades.filter(shot => shot[7] === "prism").map(shot => imageAt(shot, 2.16));
  assert.equal(corners.length, 2);
  assert(Math.abs(corners[0].x - 73) < .01 && Math.abs(corners[1].x - 115) < .01,
    "the two live lenses bracket the slit beside the held negative");
  assert.equal(new Set(blades.map(shot => shot[0])).size, 2);
  assert(blades.some(shot => shot[7] === "smallorb"), "the blade carries an inner bevel");
  passThrough(blades, 2.16, dt => ({x:94, y:251 - 64*dt}), 12);

  for (let part = 0; part <= 2; part++) {
    const prism = prepare("spectrograph", rank, part);
    pulse(prism, 0);
    const channels = pulse(prism, 2).shots, flight = [2.24,2.08,1.96][part];
    assert.equal(new Set(channels.map(shot => shot[4])).size, 3);
    const outline = channels.map(shot => imageAt(shot, flight));
    assert(outline.every(p => Math.abs(p.x - 51) >= 18 - 1e-6));
    const tips = outline.filter(p => Math.abs(p.x - 51) < 34);
    assert(tips.length >= 4);
    const y = tips.reduce((sum, p) => sum + p.y, 0) / tips.length;
    passThrough(channels, flight, dt => ({x:51, y:y - 55*dt}), 8);
    const echo = pulse(prism, 18).shots.map(shot => imageAt(shot, flight));
    assert(echo.every(p => Math.abs(p.x - 95) >= 18 - 1e-6));
    assert(echo.some(p => Math.abs(p.x - 51) < 10), "the previous opening closes on the next spectrum");

    const night = prepare("parallax", rank, part);
    pulse(night, 0);
    const crescent = pulse(night, 6).shots, arcTime = [2.16,1.98,2.08][part];
    const hand = part % 2 ? -1 : 1;
    assert.equal(new Set(crescent.map(shot => shot[0])).size, 1);
    const limb = crescent.filter(shot => shot[7] === "smallorb");
    const points = limb.map(shot => imageAt(shot, arcTime));
    assert(points.some(p => p.y < 222) && points.some(p => p.y > 272));
    assert(points.every(p => Math.abs(p.y - 247) > 23), "the unlit limb is broken at its equator");
    for (const direction of [-1, 1]) {
      passThrough(crescent, arcTime, dt => ({x:60 + hand*(18 + direction*76*dt), y:247}), 7);
    }
  }
}
console.log("PASS: two-lens aperture, moving three-colour caustic and open eclipse with real hitbox crossings at both ranks.");
// The second camera loses the bowl behind the eclipsed limb. Without that
// rest the old second exposure and the incoming crescent can trap the pilot.
for (let part = 0; part <= 2; part++) {
  const state = prepare("parallax", 25, part);
  const [left, right] = [42,198];
  const lensShots = tick => pulse(state, tick).shots.filter(([x]) => x === left || x === right);
  const reply = [3,5,2][part];
  const first = lensShots(0);
  assert.equal(lensShots(reply).length, first.length, "the first image teaches the entire chart");
  lensShots(8);
  assert.equal(lensShots(8 + reply).length, part === 2 ? first.length * 3/7 : first.length);
  assert.equal(lensShots(14).length, 0, "the lens admits light between eclipse passages");
  lensShots(16);
  assert.equal(lensShots(16 + reply).length, first.length * 3/7);
  assert(lensShots(22).some(shot => shot[7] === "smallorb"));
}

// Read each new motif using its actual post-bank, stopped and returning bodies.
for (const rank of [1,25]) for (const part of [0,1,2]) {
  for (const bar of [0,1]) {
    const s = prepare("bankshot", rank, part);
    pulse(s, 0);
    const cue = pulse(s, 18*bar + 7).shots.find(shot => shot[7] === "largeorb");
    const rack = pulse(s, 18*bar + 9).shots.filter(shot => shot[6]?.banks);
    const cx = [81,156][bar];
    const lead = stepShot(cue, 1.82).b;
    assert(lead.banks === 1 && Math.hypot(lead.x-cx, lead.y-287) < .7);
    const developed = rack.map(shot => stepShot(shot,2.04).b);
    assert(developed.every(b => b.banks === 1), "every point reached the near cushion first");
    assert(developed.some(b => Math.hypot(b.x-cx,b.y-298) < .7), "the two rails meet at a single vertex");
    const base = developed.filter(b => Math.abs(b.y-246)<.5);
    assert(base.length >= 4 && base.every(b => Math.abs(b.x-cx) >= 17));
    for (let frame=-12; frame<=12; frame++) {
      const dt = frame/120;
      for (const shot of rack) {
        const b = stepShot(shot,2.04 + dt).b;
        const r = engine.projectileRadius(shot[7],3.1);
        assert(Math.hypot(b.x-cx, b.y-(246 - 48*dt)) > r+2.2,
          "the pilot can exit the reclining triangle through its missing base");
      }
    }
  }
  const orbit = prepare("slingshot", rank, part);
  pulse(orbit,0);
  for (const bar of [1,3]) {
    const pair = pulse(orbit,bar*8).shots.filter(shot => shot[6]?.decelerate);
    const heads = pair.filter(shot => shot[7] === "comet").sort((a,b)=>a[6].release.at-b[6].release.at);
    assert.equal(heads.length,2);
    assert(heads[1][6].release.at - heads[0][6].release.at > .5);
    assert.equal(heads[0][0],bar === 1 ? 83 : 157);
    assert(pair.every(shot => Math.hypot(stepShot(shot,1.02).b.vx,stepShot(shot,1.02).b.vy) === 0));
    const active = stepShot(heads[0],1.46).b, still = stepShot(heads[1],1.46).b;
    assert(active.vy > 90 && still.vx === 0 && still.vy === 0);
    const returned = stepShot(heads[1],2.03).b;
    assert(returned.vx * active.vx < 0 && returned.vy > 90);
  }

  const camera = prepare("shutter", rank, part);
  pulse(camera,0);
  for (const sheet of [0,1]) {
    const print = pulse(camera,24*sheet + 3).shots.filter(s => s[6]?.decelerate);
    const cx = sheet ? 165 : 58, cy = 298 + 7*part, hand = sheet ? -1 : 1;
    const still = print.map(shot => stepShot(shot,2.25).b);
    assert(still.every(b => b.vx === 0 && b.vy === 0));
    assert(still.some(b => Math.abs(b.x-(cx-hand*28))<1 && Math.abs(b.y-cy)<1));
    for (const shot of print) {
      const before = stepShot(shot,1.7).b, after = stepShot(shot,2.76).b;
      assert(before.vy > 0 && after.vy < 0 &&
        Math.abs(before.vx*after.vy - before.vy*after.vx)<1e-6, "the rewinding edge retraces its own ray");
      for (let frame=0; frame<=42; frame++) {
        const dt = frame/60, b = stepShot(shot,2.15 + dt).b;
        assert(Math.hypot(b.x-(cx + hand*80*dt), b.y-cy) >
          2.2 + engine.projectileRadius(shot[7],1.9), "exit the open side during the hold before rewind");
      }
    }
  }
}
console.log("PASS: reflected cue and broken rack, staggered twin-comet transfer, and held contact print with a traversable rewind.");
