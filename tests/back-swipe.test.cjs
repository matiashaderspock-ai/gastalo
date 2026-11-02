const { test } = require('node:test');
const assert = require('node:assert/strict');
const { backSwipeOutcome, backSwipeVelocity, backSwipeMotion, backSwipeTransition } = require('../app.js');
const outcome = (dx, samples, extra = {}) => backSwipeOutcome({ dx, dy: 0, width: 390, samples, ...extra });

test('a short rightward flick finishes well before the screen edge', () => {
  assert.equal(outcome(54, [{ x: 0, time: 0 }, { x: 54, time: 70 }]), 'back');
  assert.equal(outcome(54, [{ x: 0, time: 0 }, { x: 54, time: 70 }], { width: 1280 }), 'back');
});
test('a partial drag held still has no momentum; a deliberate short drag can complete before a quarter screen', () => {
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


function tangents(transition, offset, end) {
  const [x1, y1, x2, y2] = transition.easing.slice(transition.easing.indexOf("(") + 1, -1).split(",").map(Number);
  return [(end - offset) / transition.duration * y1 / x1,
    (end - offset) / transition.duration * (1 - y2) / (1 - x2)];
}
test("settling preserves the measured release velocity and reaches its destination at rest", () => {
  for (const [offset, end, velocity] of [[120, 390, 0], [120, 390, .8], [380, 390, 4], [60, 0, -.6], [54, 0, .1]]) {
    const transition = backSwipeTransition({ offset, end, width: 390, velocity });
    const [first, last] = tangents(transition, offset, end);
    assert.ok(Math.abs(first - velocity) < 1e-9);
    assert.equal(Math.abs(last), 0);
    assert.ok(transition.duration > 0 && transition.duration <= 420);
  }
});
test("a held release does not acquire an artificial burst; fast flicks and remaining distance determine timing", () => {
  const held = backSwipeTransition({ offset: 120, end: 390, width: 390, velocity: 0 });
  const flick = backSwipeTransition({ offset: 120, end: 390, width: 390, velocity: .8 });
  const near = backSwipeTransition({ offset: 380, end: 390, width: 390, velocity: .8 });
  assert.equal(tangents(held, 120, 390)[0], 0);
  assert.ok(flick.duration < held.duration);
  assert.ok(near.duration < flick.duration);
  assert.deepEqual(backSwipeTransition({ offset: 390, end: 390, width: 390 }), { duration: 0, easing: 'linear' });
  assert.equal(backSwipeVelocity([]), 0);
  assert.equal(backSwipeVelocity([{ x: 54, time: 0 }, { x: 54, time: 200 }]), 0);
});


const motionThrough = points => points.reduce((motion, dx) => backSwipeMotion(motion, dx), undefined);
test('slow intentional short drags complete across phone widths even after momentum expires', () => {
  for (const [width, dx] of [[320, 48], [360, 56], [375, 56], [390, 56], [393, 56], [414, 64], [430, 64]]) {
    const motion = motionThrough([0, 12, 24, dx]);
    assert.equal(outcome(dx, [{ x: dx, time: 500 }], { width, motion }), 'back');
    assert.equal(outcome(32, [{ x: 32, time: 500 }], { width, motion: motionThrough([0, 16, 32]) }), 'cancel');
  }
});
test('a crossed short threshold survives minor lift retreat without mistaking it for reversal', () => {
  assert.equal(outcome(50, [{ x: 50, time: 500 }], { motion: motionThrough([0, 20, 56, 50]) }), 'back');
  assert.equal(outcome(90, [{ x: 98, time: 200 }, { x: 90, time: 220 }], { motion: motionThrough([0, 60, 98, 90]) }), 'back');
  assert.equal(outcome(90, [{ x: 104, time: 200 }, { x: 90, time: 240 }], { motion: motionThrough([0, 60, 104, 90]) }), 'back');
});
test('deliberate reversal cancels after a pause even when its distance still exceeds the commit threshold', () => {
  assert.equal(outcome(110, [{ x: 110, time: 500 }], { motion: motionThrough([0, 100, 150, 110]) }), 'cancel');
});
test('a rapid reversal cannot be hidden by earlier forward momentum', () => {
  const samples = [{ x: 0, time: 0 }, { x: 90, time: 60 }, { x: 60, time: 90 }];
  assert.ok(backSwipeVelocity(samples) > 0);
  assert.equal(outcome(60, samples, { motion: motionThrough([0, 90, 60]) }), 'cancel');
});
test('moving forward deliberately again can complete after a reversal and pause', () => {
  assert.equal(outcome(80, [{ x: 80, time: 500 }], { motion: motionThrough([0, 100, 60, 80]) }), 'back');
});
