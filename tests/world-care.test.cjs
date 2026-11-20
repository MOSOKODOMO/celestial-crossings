const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../dist/world-care.js');

test('care saves recover malformed values and keep pets independent', () => {
  const saved = C.restore({version:1,pets:{'love-C':{hunger:-50,energy:900,feedReadyAt:-4},'career-R':{hunger:'bad',energy:NaN},unknown:{hunger:2}}});
  assert.deepEqual(saved.pets['love-C'], {hunger:0,energy:100,feedReadyAt:0});
  assert.deepEqual(saved.pets['career-R'], {hunger:25,energy:85,feedReadyAt:0});
  assert.equal(Object.keys(saved.pets).length,2);
  const restored=C.restore(saved);restored.pets['love-C'].energy=7;
  assert.equal(saved.pets['love-C'].energy,100);
  assert.deepEqual(C.restore(null),{version:1,pets:{}});
});

test('walking uses energy, rest restores it, and idle does not drain energy', () => {
  const pet={hunger:40,energy:50,feedReadyAt:0};
  const walking=C.advance(pet,5,{moving:true});
  assert.ok(walking.hunger>pet.hunger);assert.equal(walking.energy,49.75);
  assert.equal(C.advance(pet,5,{resting:true}).energy,60);
  assert.equal(C.advance(pet,5).energy,50);
  assert.equal(C.advance(pet,5,{moving:true,resting:true}).energy,49.75);
  assert.deepEqual(C.advance(pet,0),pet);assert.deepEqual(C.advance(pet,-10),pet);
  assert.deepEqual(C.advance(pet,Infinity),pet);
  assert.equal(C.advance({hunger:100,energy:0},5,{moving:true}).energy,0);
  assert.equal(C.advance({hunger:100,energy:99},5,{resting:true}).energy,100);
});

test('food restores the advertised needs without mutating the original pet', () => {
  const pet={hunger:80,energy:40,feedReadyAt:0};
  assert.deepEqual(C.feed(pet,'berries',1000).needs,{hunger:60,energy:45,feedReadyAt:5000});
  assert.deepEqual(C.feed(pet,'meal',1000).needs,{hunger:35,energy:52,feedReadyAt:5000});
  assert.equal(pet.hunger,80);assert.equal(pet.energy,40);
  const nearlyFull=C.feed({hunger:2,energy:99},'meal',1000);
  assert.equal(nearlyFull.needs.hunger,0);assert.equal(nearlyFull.needs.energy,100);
});

test('feeding respects a saved cooldown, full tummies, and unknown food', () => {
  const fed=C.feed({hunger:80,energy:40},'berries',1000);
  assert.equal(C.feed(fed.needs,'meal',4999).reason,'chewing');
  assert.equal(C.feed(fed.needs,'meal',5000).ok,true);
  assert.equal(C.feed({hunger:0,energy:40},'meal',6000).reason,'full');
  assert.equal(C.feed({hunger:40,energy:40},'__proto__',6000).ok,false);
  assert.equal(C.feed({hunger:40,energy:40},'meal',NaN).ok,false);
});

test('restoring a save never applies elapsed offline time', () => {
  const saved={version:1,pets:{'love-C':{hunger:50,energy:20,feedReadyAt:1000}}};
  assert.deepEqual(C.restore(saved),saved);
  const advanced=C.advance(saved.pets['love-C'],86400,{moving:true});
  assert.ok(advanced.hunger<51,'a stalled frame cannot consume a day of needs');
});
