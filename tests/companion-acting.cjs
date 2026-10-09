const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { create } = require('../assets/js/core/companion-performance.js');
globalThis.CompanionSpeech = require('../assets/js/core/companion-speech.js');
require('../assets/js/data/companion-readings.js');
function setup(character) {
  const values = {}, attributes = {}, frames = [];
  const internal = new EventEmitter();
  const blink = { sdk: true };
  internal.eyeBlink = blink;
  internal.coreModel = {
    setParameterValueById(id, value) { values[id] = value; },
    addParameterValueById(id, value) { values[id] = (values[id] || 0) + value; },
  };
  const model = { elapsedTime: 0, internalModel: internal };
  const widget = {
    getAttribute: key => attributes[key],
    setAttribute: (key, value) => attributes[key] = String(value),
    removeAttribute: key => delete attributes[key],
  };
  let reduced = false;
  const act = create(model, character, widget, {
    '01': { ParamMouthForm: 0, ParamEyeOpen: 0, ParamBrowLY: 0, ParamBrowRY: 0 },
    '05': { ParamMouthForm: -1, ParamEyeOpen: -0.26, ParamBrowLY: -0.64, ParamBrowRY: -0.64 },
    '07': { ParamMouthForm: 1, ParamEyeOpen: -0.43, ParamBrowLY: 0.1, ParamBrowRY: 0.1 },
  }, { random: () => 0.5, reducedMotion: () => reduced });
  function tick(seconds, talking) {
    const result = [];
    for (let i = 0; i < seconds * 60; i++) {
      // Cubism restores the body baseline before each overlay.
      Object.keys(values).forEach(k => delete values[k]);
      model.elapsedTime += 1000 / 60;
      if (talking && i % 6 === 0) act.speak('あ', 100, ['a']);
      internal.emit('beforeModelUpdate');
      const frame = { ...values };
      result.push(frame); frames.push(frame);
    }
    return result;
  }
  return { act, internal, blink, attributes, values, frames, tick, reduce: () => reduced = true };
}
const peaks = {};
for (const character of ['alice', 'marisa', 'patchouli']) {
  const t = setup(character);
  assert.equal(t.internal.eyeBlink, undefined, 'SDK must not advance the blink a second time');
  t.act.perform({ expressionMotionId: '07' });
  const spoken = t.tick(2, true);
  peaks[character] = Math.max(...spoken.map(f => f.ParamMouthOpenY));
  assert(peaks[character] > 0.25 && peaks[character] < 1);
  assert(spoken.some(f => f.ParamBrowLY > 0.11));
  assert(spoken.some(f => Math.abs(f.ParamAngleY) > 0.3));
  t.act.speak('？', 38);
  const pause = t.tick(0.5);
  assert(pause.at(-1).ParamMouthOpenY < 0.005, 'Punctuation must close the mouth');
  assert.equal(t.attributes['data-live2d-speaking'], undefined);
  t.act.perform({ expressionMotionId: '05' });
  t.tick(1.5);
  const before = t.tick(8);
  assert(before.every(f => f.ParamMouthForm < -0.99), 'Reading must keep the directed emotion');
  assert(before.every(f => Math.abs(f.ParamEyeOpen + 0.26) < 0.001), 'Blink must preserve authored eyelid shape');
  assert(before.some(f => f.ParamEyeLOpen < 0.05) && before.some(f => f.ParamEyeLOpen > 0.99));
  assert(before.every(f => Math.abs(f.ParamAngleY) < 4), 'Offsets must not accumulate');
  // A paused model's clock never advances: repeated render callbacks cannot
  // fast-forward a gesture or blink just because wall time has passed.
  t.act.speak('あ', 65);
  t.tick(0.1);
  const last = { ...t.values };
  for (let i = 0; i < 40; i++) {
    Object.keys(t.values).forEach(k => delete t.values[k]);
    t.internal.emit('beforeModelUpdate');
  }
  assert.deepEqual(t.values, last);
  t.reduce();
  const still = t.tick(1, true);
  assert(still.every(f => f.ParamMouthOpenY === 0 && f.ParamAngleX === 0 && f.ParamAngleY === 0 && f.ParamAngleZ === 0 && f.ParamEyeLOpen === 1));
  assert.equal(still.at(-1).ParamMouthForm, -1);
  t.act.destroy();
  assert.equal(t.internal.listenerCount('beforeModelUpdate'), 0);
  assert.equal(t.internal.eyeBlink, t.blink);
}
assert(peaks.marisa > peaks.alice && peaks.alice > peaks.patchouli);
const speech = CompanionSpeech;
assert.deepEqual(speech.morae('あいうえおんっ'), ['a','i','u','e','o','n','cl']);
assert.deepEqual(speech.morae('きゃきゅきょコーヒー'), ['a','u','o','o','o','i','i']);
assert.equal(Object.keys(CompanionReadings).length, 135);
for (const [text, tokens] of Object.entries(CompanionReadings)) {
  assert.equal(tokens.map(t => t[0]).join(''), text);
  assert(tokens.every(t => !/[一-龯]/.test(t[1])), 'Every kanji token needs its actual reading');
  const plan = speech.plan(text);
  assert.equal(plan.chars.length, plan.units.length);
  assert(plan.units.flat().some(p => p !== 'rest'));
  const marisa = tokens.find(t => t[0] === '魔理沙');
  if (marisa) assert.equal(marisa[1], 'まりさ');
}
const mouthShapes = {};
for (const phone of ['a','i','u','e','o','n','cl']) {
  const t = setup('alice');
  t.act.speak('声', 400, [phone]);
  const frames = t.tick(0.25);
  mouthShapes[phone] = { jaw: Math.max(...frames.map(f=>f.ParamMouthOpenY)), form: frames.at(-1).ParamMouthForm };
  t.act.destroy();
}
assert(mouthShapes.a.jaw > mouthShapes.i.jaw * 2);
assert(mouthShapes.i.form > 0 && mouthShapes.u.form < 0 && mouthShapes.o.form < 0);
assert.equal(mouthShapes.n.jaw, 0);
assert.equal(mouthShapes.cl.jaw, 0);
console.log('PASS: differentiated acting, punctuation articulation, held emotion, independent blinks, no drift, paused clock, reduced motion and cleanup');
console.log('PASS: 135 aligned Japanese readings, contracted/long vowels, distinct A/I/U/E/O shapes and closed nasal/geminate sounds');
