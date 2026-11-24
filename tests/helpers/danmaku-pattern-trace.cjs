const engine = require("../../assets/js/games/danmaku-engine.js");
const patterns = require("../../assets/js/games/danmaku-patterns.js");

function scene(enemy, id, rank = 1) {
  const state = engine.create("alice", enemy, 1977).state;
  const card = patterns.cards[enemy].find((card) => card.id === id);
  if (!card) throw Error("Unknown spell " + id);
  Object.assign(state.enemySpell, card, { age: 4 });
  Object.assign(state.boss, { x: 120, y: 55 });
  state.level = rank;
  return state;
}

function pulse(state, tick) {
  const shots = [],
    beams = [];
  patterns.emit(state, tick, {
    bullet: (...args) => shots.push(args),
    laser: (...args) => beams.push(args),
  });
  return { shots, beams };
}

function stepShot(args, seconds) {
  const [x, y, angle, speed, color, shape, motion] = args;
  const b = {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    heading: angle,
    color,
    shape,
    motion,
    curve: motion?.turn || 0,
    curveDecay: motion?.decay || 0,
  };
  const children = [];
  let alive = true;
  for (let i = 0; i < Math.round(seconds * 120) && alive; i++)
    alive = patterns.advanceBullet(b, 1 / 120, (...args) =>
      children.push(args)
    );
  return { b, children, alive };
}

module.exports = { scene, pulse, stepShot, patterns };
