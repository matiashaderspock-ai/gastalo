const { test } = require('node:test');
const assert = require('node:assert/strict');
const { backSwipeOutcome } = require('../app.js');
const outcome = (dx, samples, extra = {}) => backSwipeOutcome({ dx, dy: 0, width: 390, samples, ...extra });

test('a short rightward flick finishes well before the screen edge', () => {
  assert.equal(outcome(54, [{ x: 0, time: 0 }, { x: 54, time: 70 }]), 'back');
  assert.equal(outcome(54, [{ x: 0, time: 0 }, { x: 54, time: 70 }], { width: 1280 }), 'back');
});
test('a partial drag held still has no momentum; a deliberate drag finishes around a quarter screen', () => {
  const held = x => [{ x: 0, time: 0 }, { x, time: 200 }, { x, time: 450 }];
  assert.equal(outcome(54, held(54)), 'cancel');
  assert.equal(outcome(100, held(100)), 'back');
  assert.equal(outcome(75, held(75), { width: 320 }), 'back');
});
test('reversing the finger cancels even beyond the normal completion distance', () => {
  assert.equal(outcome(120, [{ x: 220, time: 100 }, { x: 180, time: 140 }, { x: 120, time: 180 }]), 'cancel');
});
test('tiny, leftward and vertical gestures never complete a back navigation', () => {
  const samples = [{ x: 0, time: 0 }, { x: 200, time: 20 }];
  for (const dx of [-200, 0, 15, 30, 35]) assert.equal(outcome(dx, samples), 'cancel');
  assert.equal(outcome(100, samples, { dy: 70 }), 'cancel');
  assert.equal(outcome(70, samples, { dy: 50 }), 'cancel');
});
test('a stationary release or coalesced timestamps cannot invent flick velocity', () => {
  assert.equal(outcome(54, [{ x: 54, time: 300 }]), 'cancel');
  assert.equal(outcome(54, [{ x: 0, time: 300 }, { x: 54, time: 300 }]), 'cancel');
});
