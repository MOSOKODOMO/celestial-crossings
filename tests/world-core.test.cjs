// Unit tests for dist/world-core.js (MooJai World game rules).
const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../dist/world-core.js');

test('spawn and pavilion door are walkable; water and buildings are not', () => {
  assert.equal(W.blocked(W.WORLD.spawn.x, W.WORLD.spawn.y), false);
  assert.equal(W.blocked(W.pavilion.door.x, W.pavilion.door.y), false);
  assert.equal(W.blocked(W.pond.cx, W.pond.cy), true);
  assert.equal(W.blocked(W.pavilion.x + 50, W.pavilion.y + 50), true);
  assert.equal(W.nearPavilion(W.pavilion.door.x, W.pavilion.door.y), true);
});

test('movement slides along obstacles instead of sticking', () => {
  const start = { x: W.pond.cx - W.pond.rx - 40, y: W.pond.cy };
  const next = W.step(start, 1, 1, 200, 0.1);
  assert.ok(next.moved);
  assert.equal(W.blocked(next.x, next.y), false);
});

test('pets come only from valid owned cards, rarest first, level capped at 10', () => {
  const pets = W.petsFromQuantities({ 'wealth-C': 14, 'love-SSR': 1, 'fake-SSR': 9, 'growth-SR': 0 });
  assert.deepEqual(pets.map(p => p.cardId), ['love-SSR', 'wealth-C']);
  assert.equal(pets[1].level, 10);
  assert.equal(pets[0].species, 'bunny');
});

test('collector history converts to quantities and duplicate stardust', () => {
  const q = W.quantitiesFromHistory([{ cardId: 'love-C' }, { cardId: 'love-C' }, { cardId: 'career-SR' }, { cardId: 'career-SR' }, { cardId: 'nope' }]);
  assert.deepEqual(q, { 'love-C': 2, 'career-SR': 2 });
  assert.equal(W.duplicateStardust(q), 1 + 40);
});

test('daily visit and prayer reward once per day; offerings need enough stardust', () => {
  const day1 = new Date(2026, 10, 20, 10), day2 = new Date(2026, 10, 21, 9);
  let l = W.freshLedger();
  l = W.claimVisit(l, day1).ledger;
  assert.equal(W.claimVisit(l, day1).gained, 0);
  const prayed = W.pray(l, day1);
  assert.ok(prayed.ok);
  assert.equal(W.pray(prayed.ledger, day1).ok, false);
  assert.ok(W.pray(prayed.ledger, day2).ok);
  assert.equal(W.balance(prayed.ledger, {}), 8);
  assert.equal(W.makeOffering(prayed.ledger, {}, 'lantern').ok, false);
  const owned = { 'love-S': 2 }; // one duplicate S = 10 stardust
  assert.equal(W.balance(prayed.ledger, owned), 18);
  const lit = W.makeOffering(prayed.ledger, owned, 'lantern', 1000);
  assert.ok(lit.ok);
  assert.equal(W.balance(lit.ledger, owned), 8);
  assert.equal(lit.ledger.glowUntil, 1000 + 24 * 3600000);
});

test('pet care rewards are capped per day', () => {
  let l = W.freshLedger();
  const now = new Date(2026, 10, 20);
  for (let i = 0; i < 8; i++) l = W.carePet(l, now).ledger;
  assert.equal(l.earned, W.rewards.petCarePerDay * W.rewards.petCare);
});

test('chat filter hides contacts, links and abuse without breaking normal Thai words', () => {
  const r = W.filterChat('hi line: moojai99 โทร 081-234-5678 www.scam.com fuck สัดส่วนดี หีบสมบัติ');
  assert.ok(r.hidden);
  assert.doesNotMatch(r.text, /moojai99|081|scam|fuck/);
  assert.match(r.text, /สัดส่วนดี หีบสมบัติ/);
  assert.equal(W.filterChat('x'.repeat(500)).text.length, W.MAX_CHAT);
  assert.equal(W.validName('a'), null);
  assert.equal(W.validName('ไอ้สัตว์'), null);
  assert.equal(W.validName('  Mos  '), 'Mos');
});

test('chat rate limit allows 3 messages per 10 seconds, 1.2s apart', () => {
  let times = [];
  for (const t of [0, 1300, 2600]) { const r = W.rateCheck(times, t); assert.ok(r.ok); times = r.times; }
  assert.equal(W.rateCheck(times, 3000).ok, false);
  assert.ok(W.rateCheck(times, 10100).ok);
  assert.equal(W.rateCheck([0], 500).ok, false);
});

test('untrusted network state is sanitised', () => {
  assert.equal(W.sanitizeState({ id: 'x', x: 1, y: 1 }), null);
  const s = W.sanitizeState({ id: 'player-123456', name: 'fuck', x: 99999, y: -5, pet: 'love-SSR', followers: ['bad', 'career-C', 'wealth-S', 'growth-R'] });
  assert.equal(s.name, 'ผู้มาเยือน');
  assert.equal(s.x, W.WORLD.width - 20);
  assert.equal(s.y, 20);
  assert.deepEqual(s.followers, ['career-C', 'wealth-S']);
});
