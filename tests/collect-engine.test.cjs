const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/collect-engine.js');

function withRolls(...values) { let i = 0; return () => { assert.ok(i < values.length, 'Unexpected random roll'); return values[i++]; }; }
function missNine() {
  let state = E.initialState();
  for (let i = 0; i < 9; i++) state = E.draw(state, withRolls(0.4, 0.9)).state;
  return state;
}
test('six categories each contain every rank, with odds summing to 100%', () => {
  assert.equal(E.categories.length, 6);
  assert.equal(E.cards.length, 30);
  assert.equal(E.ranks.reduce((sum, rank) => sum + rank.chance, 0), 100);
  for (const category of E.categories) {
    assert.deepEqual(E.cards.filter(c => c.category === category.id).map(c => c.rank), ['SSR','SR','S','R','C']);
  }
});
test('rarity boundaries implement the published odds, including 0.15% SSR', () => {
  const samples = [[0,'SSR'],[0.00149999,'SSR'],[0.0015,'SR'],[0.02999999,'SR'],[0.03,'S'],[0.14999999,'S'],[0.15,'R'],[0.44999999,'R'],[0.45,'C'],[0.99999999,'C']];
  for (const [value, rank] of samples) assert.equal(E.rollRank(value), rank, `roll ${value}`);
  for (const invalid of [-1,1,NaN,Infinity]) assert.throws(() => E.rollRank(invalid));
});
test('ninth miss forces tenth card into either preference, without changing rank odds', () => {
  const state = missNine();
  assert.equal(state.cycle.length, 9);
  assert.ok(state.cycle.every(item => !item.preferred));
  for (const [categoryRoll, expected] of [[0,'love'],[0.49999,'love'],[0.5,'career'],[0.99999,'career']]) {
    for (const [rarityRoll, rank] of [[0,'SSR'],[0.01,'SR'],[0.1,'S'],[0.3,'R'],[0.8,'C']]) {
      const outcome = E.draw(state, withRolls(categoryRoll, rarityRoll));
      assert.equal(outcome.card.category, expected);
      assert.equal(outcome.card.rank, rank);
      assert.equal(outcome.result.guaranteed, true);
      assert.equal(outcome.result.preferred, true);
      assert.equal(outcome.state.total, 10);
    }
  }
  assert.equal(state.cycle.length, 9, 'Draw must not mutate earlier state');
});
test('one early match fulfils the entire ten-draw group; tenth can be any category', () => {
  let state = E.draw(E.initialState(), withRolls(0, 0.9)).state;
  for (let i = 1; i < 9; i++) state = E.draw(state, withRolls(0.4, 0.9)).state;
  const {result, state: next} = E.draw(state, withRolls(0.99, 0.9));
  assert.equal(result.category, 'growth');
  assert.equal(result.guaranteed, false);
  assert.equal(next.cycle.filter(item => item.preferred).length, 1);
});
test('eleventh draw starts a fresh group using new preferences', () => {
  let state = E.draw(missNine(), withRolls(0, 0.9)).state;
  state.preferences = ['wellbeing','connection'];
  state = E.restore(JSON.stringify(state));
  assert.equal(state.total, 10, 'Changing preferences between groups preserves collection');
  const outcome = E.draw(state, withRolls(0.55, 0.01));
  assert.equal(outcome.state.total, 11);
  assert.equal(outcome.state.cycle.length, 1);
  assert.equal(outcome.result.category, 'wellbeing');
  assert.equal(outcome.result.preferred, true);
  assert.equal(outcome.result.guaranteed, false);
});
test('persistence preserves progress, collection, duplicates, and the next guarantee', () => {
  const state = missNine();
  const restored = E.restore(JSON.stringify(state));
  assert.deepEqual(restored, state);
  assert.equal(restored.history.length, 9);
  assert.equal(new Set(restored.history.map(item => item.cardId)).size, 1);
  assert.equal(E.draw(restored, withRolls(0.8, 0.9)).result.guaranteed, true);
  for (const corrupt of ['not json', '{}', 'null', JSON.stringify({...state, cycle: []}), JSON.stringify({...state, preferences:['love','love']}), JSON.stringify({...state, history:[{cardId:'fake'}]})]) assert.deepEqual(E.restore(corrupt), E.initialState());
});
test('invalid preference sets cannot draw', () => {
  for (const preferences of [[],['love'],['love','love'],['love','unknown'],['love','career','wealth']]) {
    assert.throws(() => E.draw({...E.initialState(), preferences}, withRolls(0,0)));
  }
});
