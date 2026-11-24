// Deliberate brushwork, beat-accurate release, and first-frame collision safety.
const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");
const {scene, pulse, stepShot, patterns} = require("./helpers/danmaku-pattern-trace.cjs");
const delayed = new Set(["buttonhole","basting","spectrograph","shutter","erratum","palimpsest"]);
let sample;
for (const [enemy, cards] of Object.entries(patterns.cards)) {
  const track = engine.score.getTrack(enemy);
  cards.forEach(({id}, index) => {
    const s = scene(enemy, id);
    const phrase = track.phrases[index];
    s.time = track.duration + phrase.start + (phrase.spellEnd - phrase.start) * .5;
    s.rhythm = engine.score.at(enemy, s.time);
    s.enemySpell.age = s.time - s.rhythm.sectionStart;
    let cast = [];
    for (let tick=0; tick<50 && !cast.length; tick++)
      cast = pulse(s,tick).shots.filter(b=>b[6]?.inscription);
    if (!delayed.has(id)) {
      assert.equal(cast.length,0, id + " keeps its own immediate or authored trajectory");
      return;
    }
    assert(cast.length > 6, id + " exposes a real group of inscribed game bullets");
    const first = Math.min(...cast.map(b=>b[6].inscription.launch));
    assert(first >= .89 && first <= 1.97, id + " has enough preparation and a bounded wait");
    const onsets = new Set(cast.map(b=>b[6].inscription.delay));
    assert(onsets.size > 4, id + " draws progressively");
    for (const args of cast) {
      const spec = args[6].inscription, absolute = spec.created + spec.launch;
      const beat = track.beats.findIndex(t=>Math.abs(t + track.duration - absolute)<1e-7);
      assert(beat >= 0, id + " begins flight exactly on a recorded onset in round two");
      if (spec.launch === first) assert.equal(beat % 2,0,"the primary release uses an accented beat");
      const settled = stepShot(args,spec.windup + .035).b, poised = stepShot(args,spec.launch - .04).b;
      assert(settled.inscribing && poised.inscribing && settled.vx === 0 && settled.vy === 0);
      assert(Math.hypot(settled.x-poised.x,settled.y-poised.y)<0.001);
      const live = stepShot(args,spec.launch + .10).b;
      assert(live.released && !live.inscribing && Math.hypot(live.vx,live.vy)>20);
      assert(Math.hypot(live.x-spec.lockX,live.y-spec.lockY)>1);
    }
    if(id==="erratum") sample=cast.find(b=>b[6].inscription.lockX>12 && b[6].inscription.lockY>30);
  });
}
function encounter() {
  const game=engine.create("alice","patchouli",41), s=game.state;
  const spec=sample[6].inscription;
  s.time=spec.created-1/60;
  s.countdown=0; s.intro=null; s.run.nextWave=Infinity;
  s.player.x=spec.lockX; s.player.y=spec.lockY;
  game.step(1/60);
  s.enemySpell.hp=Infinity;
  s.attackReadyAt=Infinity;
  s.player.invulnerable=0;
  const grain={x:sample[0],y:sample[1],vx:0,vy:0,radius:2.4,age:0,color:"#ffd",shape:"rice",
    motion:sample[6],inscribing:true};
  s.bullets=[grain];
  return {game,s,grain,spec};
}
const {game,s,spec}=encounter(), start=s.time;
game.pause();
for(let i=0;i<90;i++)game.step(1/60);
assert.equal(s.time,start);
game.resume();
while(s.countdown>0)game.step(1/60);
while(s.time+1/60 < spec.created+spec.launch)game.step(1/60);
assert.equal(s.grazes,0);
assert.equal(s.lives,3,"standing inside the drawn ink is harmless until the cue");
game.step(1/60);
assert.equal(s.lives,2,"the same particle has collision on its first active frame");
for(const cancel of ["bomb","miss"]) {
  const {game,s,spec,grain}=encounter();
  if(cancel==="bomb")assert(game.bomb());
  else {
    s.bullets.push({x:s.player.x,y:s.player.y,vx:0,vy:0,radius:2.4,age:0});
    game.step(1/60);
  }
  assert(!s.bullets.includes(grain));
  while(s.time < spec.created+spec.launch+.5)game.step(1/60);
  assert(!s.bullets.some(b=>b.motion===grain.motion),"cleared writing never produces delayed hits");
}
// Freeze pilot travel to isolate what the planner predicts at the release point.
const pilot = require("../assets/js/games/danmaku-pilot.js");
const pilotOptions = {
  player:{x:120,y:200,radius:2.2,invulnerable:0}, goal:{x:120,y:200},
  speed:0, slowSpeed:0, top:25, foes:[], lasers:[], laserPose:engine.laserPose,
};
function forecast(launch) {
  const b = {x:10,y:10,vx:0,vy:0,radius:2,age:0,inscribing:true,
    motion:{inscription:{launch,lockX:120,lockY:200,vx:0,vy:80}}};
  return pilot.steer({...pilotOptions,bullets:[b]}).impact;
}
assert.equal(forecast(2), Infinity, "A dormant figure outside the planning horizon is harmless");
assert.equal(forecast(.16), .16, "The planner sees where the coming beat will release the bullet");
console.log("PASS: six drawn patterns, twelve independent attacks, phased assembly, recorded accents, pause, graze, collision and full-field cancellation.");
