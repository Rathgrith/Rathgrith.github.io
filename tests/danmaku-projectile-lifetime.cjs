/* Slow Shanghai ribbons must leave the arena before retirement. Focus changes
 * neither their lifetime nor their trajectory; gameplay cancellation and the
 * France split genealogy must continue to remove their original projectiles.
 */
const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");

const frame = 1 / 60;
const track = engine.score.getTrack("alice");
const phrase = track.phrases[4];
const outside = (b) =>
  b.x < -28 || b.x > engine.width + 28 || b.y < -60 || b.y > engine.height + 20;
const visible = (b) =>
  b.x >= 0 && b.x <= engine.width && b.y >= 0 && b.y <= engine.height;

function create(player, start = phrase.start) {
  const game = engine.create(player, "alice", 1977);
  game.state.countdown = 0;
  game.state.intro = null;
  game.state.time = start;
  return game;
}

function isolate(game, focus = false) {
  const s = game.state;
  s.player.invulnerable = Infinity;
  s.enemySpell.hp = Infinity;
  s.shots = [];
  s.items = [];
  game.step(frame, { focus });
}

const reports = [];
for (const player of ["alice", "marisa", "patchouli"]) {
  const baseline = create(player);
  const switched = create(player);
  const s = baseline.state;
  const longLived = new Set();
  let naturallyRetired = 0,
    frames = 0,
    peak = 0,
    switches = 0,
    lastFocus = false;

  // Use the recording's full phrase and variable beat map, including the real
  // declaration and nonspell boundary. A stationary player isolates the switch
  // from changed aim positions, misses, bombs and damage-induced clears.
  while (s.time + frame < phrase.end) {
    const previous = s.bullets.slice();
    const wasSpell = s.enemySpell.id === "shanghai" && !s.enemySpell.nonspell;
    const focus =
      wasSpell &&
      ((s.enemySpell.age >= 10 && s.enemySpell.age < 20) ||
        s.enemySpell.age >= 28);
    if (focus !== lastFocus) switches++;
    lastFocus = focus;
    isolate(baseline);
    isolate(switched, focus);

    assert.deepEqual(
      s.bullets,
      switched.state.bullets,
      `${player}: focus must not alter Shanghai projectiles at ${s.time}`
    );
    assert.deepEqual(s.lasers, switched.state.lasers);
    assert.equal(s.enemySpell.clears, 0, "Isolation prevents pressure clears");

    const stillSpell = s.enemySpell.id === "shanghai" && !s.enemySpell.nonspell;
    if (wasSpell && stillSpell) {
      const live = new Set(s.bullets);
      for (const b of previous) {
        if (live.has(b)) continue;
        assert(
          outside(b),
          `${player}: unhit, uncancelled Shanghai ${b.shape} disappeared ` +
            `inside the arena at (${b.x.toFixed(2)}, ${b.y.toFixed(2)}), ` +
            `bullet age ${b.age.toFixed(5)}, spell age ${s.enemySpell.age.toFixed(3)}`
        );
        if (longLived.has(b)) naturallyRetired++;
      }
      for (const b of s.bullets) if (visible(b) && b.age > 12) longLived.add(b);
      peak = Math.max(peak, s.bullets.length);
    }
    frames++;
  }
  assert(switches >= 3, "Exercise both entering and leaving focus");
  assert(
    longLived.size > 0,
    "Observe actual slow ribbons beyond twelve seconds"
  );
  assert(
    naturallyRetired > 0,
    "Long-lived ribbons are reclaimed after exiting"
  );
  assert(
    peak < 720,
    "Keeping slow ribbons must not saturate the projectile pool"
  );
  reports.push({
    player,
    frames,
    longLived: longLived.size,
    naturallyRetired,
    peak,
  });
}

function liveShanghai() {
  const game = create("alice");
  for (let f = 0; f < 300 && game.state.bullets.length < 10; f++) isolate(game);
  assert(game.state.bullets.length >= 10, "Enter the actual Shanghai pattern");
  return game;
}

// These are genuine game operations, not a synthetic expiry replacement. The
// lifetime fix must preserve cancellation even for already old projectiles.
for (const kind of ["pressure", "bomb", "timeout"]) {
  const game = liveShanghai();
  const s = game.state;
  const old = s.bullets[0];
  old.age = 20;
  old.vx = old.vy = old.curve = 0;
  old.motion = null;
  old.x = 110;
  old.y = 280;
  const before = s.bullets.slice();
  if (kind === "pressure") {
    s.enemySpell.hp = 1;
    s.shots = [{ x: s.boss.x, y: s.boss.y, vx: 0, vy: 0, damage: 2 }];
    game.step(frame);
    assert.equal(
      s.enemySpell.clears,
      1,
      "A hit triggers a legitimate pressure clear"
    );
    assert(
      !s.enemySpell.nonspell,
      "Pressure clear keeps the time-attack spell"
    );
  } else if (kind === "bomb") {
    assert(game.bomb(), "A real bomb is accepted");
    assert.equal(s.cancelPulse.kind, "bomb");
  } else {
    s.time = phrase.spellEnd - frame / 2;
    isolate(game);
    assert(s.enemySpell.nonspell, "Recording deadline ends the spell");
  }
  assert(
    before.every((b) => !s.bullets.includes(b)),
    `${kind} still cancels live bullets`
  );
  assert(s.cancelFlashes.length > 0, `${kind} preserves cancellation feedback`);
  assert(s.scoreItems.length > 0, `${kind} preserves score conversion`);
}

// Follow a real France seed through both splits in the engine. Removing the
// generic age limit must not make a split parent linger alongside its children.
const france = create("alice", 0);
for (let f = 0; f < 300 && !france.state.bullets.length; f++) isolate(france);
const parent = france.state.bullets.reduce((a, b) => (a.y > b.y ? a : b));
assert(parent.motion?.split, "Use a genuine France split seed");
france.state.bullets = [parent];
france.state.attackReadyAt = Infinity;
for (let f = 0; f < 90 && france.state.bullets.includes(parent); f++)
  isolate(france);
assert(!france.state.bullets.includes(parent), "Split consumes its parent");
assert.equal(
  france.state.bullets.length,
  7,
  "First split replaces one seed with seven"
);
const intermediate = france.state.bullets.slice();
for (
  let f = 0;
  f < 90 && intermediate.some((b) => france.state.bullets.includes(b));
  f++
)
  isolate(france);
assert(intermediate.every((b) => !france.state.bullets.includes(b)));
assert.equal(
  france.state.bullets.length,
  49,
  "Second split preserves the 1→7→49 genealogy"
);

console.table(reports);
console.log(
  "PASS: Shanghai lifetime/focus, offscreen retirement, pressure/bomb/timeout cancellation, France split replacement."
);
