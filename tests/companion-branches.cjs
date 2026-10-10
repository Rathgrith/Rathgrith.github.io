const assert = require('node:assert/strict');
require('../assets/js/data/companion-branches.js');
require('../assets/js/data/companion-readings.js');
const effects = new Set(['none', ...require('../assets/js/core/companion-reactions.js').types]);
const branches = globalThis.CompanionBranches;
const corpus = new Set();
let topics = 0, choices = 0, leaves = 0, affinityLeaves = 0;

assert.deepEqual(Object.keys(branches).sort(), ['alice', 'marisa', 'patchouli']);

function directed(line, where) {
  assert(line && typeof line.text === 'string' && /[ぁ-んァ-ヶ]/.test(line.text), `${where}: Japanese dialogue`);
  assert(!/[<>]/.test(line.text) && !line.translation, `${where}: dialogue is plain Japanese text`);
  assert(!corpus.has(line.text), `${where}: branches need distinct authored responses`);
  corpus.add(line.text);
  assert.match(line.expressionMotionId, /^0[1-8]$/, `${where}: explicit supported expression`);
  assert.match(line.poseId, /^[1-5]$/, `${where}: explicit supported pose`);
  assert(effects.has(line.effect), `${where}: explicit supported effect`);
  assert(globalThis.CompanionReadings[line.text]?.length, `${where}: reviewed kana for actual mouth movement`);
}

for (const [character, tree] of Object.entries(branches)) {
  assert.deepEqual(tree.topics.map(topic => topic.id).sort(), ['daily', 'danmaku', 'outing']);
  assert.equal(new Set(tree.topics.map(topic => topic.entry)).size, 3, `${character}: each topic has its own conversation`);
  const reached = new Set();
  for (const topic of tree.topics) {
    topics++;
    const tieredConclusions = new Set();
    assert(topic.label && /[ぁ-んァ-ヶ一-龯]/.test(topic.label), `${character}/${topic.id}: Japanese menu label`);
    const visit = (key, depth, ancestors) => {
      const where = `${character}/${topic.id}/${key}`;
      assert(tree.nodes[key], `${where}: choice must lead to a real node`);
      assert(!ancestors.has(key), `${where}: branch must terminate rather than cycle`);
      const node = tree.nodes[key];
      if (node.affinityLines) tieredConclusions.add(key);
      assert(Array.isArray(node.lines), `${where}: node has a line sequence`);
      assert(node.lines.length || node.affinityLines, `${where}: selectable node cannot be empty`);
      const nextAncestors = new Set(ancestors).add(key);
      if (!reached.has(key)) {
        node.lines.forEach(line => directed(line, where));
        if (node.affinityLines) {
          assert.equal(node.affinityLines.length, 4, `${where}: all four affection tiers have a response`);
          assert.equal(node.lines.length, 0, `${where}: affinity dialogue replaces the ordinary sequence`);
          node.affinityLines.forEach((line, tier) => directed(line, `${where}/tier-${tier}`));
          affinityLeaves++;
        }
        const options = node.choices || [];
        assert.equal(new Set(options.map(choice => choice.label)).size, options.length, `${where}: visible choices differ`);
        for (const choice of options) {
          assert(choice.label && /[ぁ-んァ-ヶ一-龯]/.test(choice.label), `${where}: meaningful Japanese response`);
          assert(!/[<>]/.test(choice.label));
          assert([0, 1, 2].includes(choice.delta), `${where}: modest explicit affection change`);
          assert(typeof choice.next === 'string' && choice.next !== key, `${where}: response leads forward`);
          choices++;
        }
      }
      reached.add(key);
      const options = node.choices || [];
      if (depth < 2) {
        assert.equal(options.length, depth === 0 ? 3 : 2, `${where}: both stages offer real choices`);
        assert.equal(new Set(options.map(choice => choice.next)).size, options.length, `${where}: choices lead to different replies`);
        options.forEach(choice => visit(choice.next, depth + 1, nextAncestors));
      } else {
        assert.equal(options.length, 0, `${where}: second response reaches a conclusion`);
        leaves++;
      }
    };
    visit(topic.entry, 0, new Set());
    assert(tieredConclusions.size, `${character}/${topic.id}: at least one conclusion responds to affinity`);
  }
  assert.deepEqual(reached, new Set(Object.keys(tree.nodes)), `${character}: no unreachable authored conversation`);
}
assert.equal(topics, 9);
assert.equal(choices, 81);
assert.equal(leaves, 54);
assert(affinityLeaves >= 9, 'Each character/topic should include an affinity-sensitive conclusion');
assert(corpus.size >= 117, 'The new menu options have substantial authored dialogue behind them');
console.log(`PASS: ${topics} topics, ${choices} selectable branches, ${leaves} conclusions, ${affinityLeaves} affinity-sensitive nodes and ${corpus.size} directed Japanese lines with kana; all nodes reachable`);
