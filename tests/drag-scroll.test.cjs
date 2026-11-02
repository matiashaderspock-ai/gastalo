const { test } = require("node:test");
const assert = require("node:assert/strict");
const { scrollEntityStrip, entityStripEdge } = require("../app.js");
const strip = { left: 10, right: 310, top: 100, bottom: 200,
  scrollLeft: 200, scrollWidth: 1200, clientWidth: 300, x: 160, y: 150 };
const step = (changes = {}, elapsedMs = 16) => scrollEntityStrip({ ...strip, ...changes }, elapsedMs);

test("holding near the right edge reveals entities to the right", () => {
  assert.ok(step({ x: 308 }) > strip.scrollLeft);
  assert.ok(step({ x: 308 }) < strip.scrollLeft + 12);
});
test("holding near the left edge reveals entities to the left", () => {
  assert.ok(step({ x: 12 }) < strip.scrollLeft);
  assert.ok(step({ x: 12 }) > strip.scrollLeft - 12);
});
test("scrolling accelerates toward either edge", () => {
  assert.ok(step({ x: 309 }) > step({ x: 285 }));
  assert.ok(step({ x: 11 }) < step({ x: 35 }));
  assert.ok(Math.abs(step({ x: 309 }) - strip.scrollLeft - (strip.scrollLeft - step({ x: 11 }))) < 0.0001);
});
test("the center and points outside the destination row do not scroll", () => {
  for (const point of [{ x: 160 }, { x: 0 }, { x: 320 }, { x: 308, y: 75 }, { x: 12, y: 225 }])
    assert.equal(step(point), strip.scrollLeft);
});
test("scrolling stays within bounds and ignores rows without overflow", () => {
  assert.equal(step({ x: 310, scrollLeft: 899 }), 900);
  assert.equal(step({ x: 10, scrollLeft: 1 }), 0);
  assert.equal(step({ x: 310, scrollWidth: 300, scrollLeft: 0 }), 0);
  assert.equal(step({ x: 10, scrollLeft: 0 }), 0);
  assert.equal(step({ x: 310, scrollLeft: 900 }), 900);
});
test("stationary pointers keep scrolling on successive frames with bounded time steps", () => {
  let scrollLeft = strip.scrollLeft;
  for (let frame = 0; frame < 10; frame++) scrollLeft = step({ x: 308, scrollLeft });
  assert.ok(scrollLeft > strip.scrollLeft + 80);
  for (let frame = 0; frame < 10; frame++) scrollLeft = step({ x: 12, scrollLeft });
  assert.ok(Math.abs(scrollLeft - strip.scrollLeft) < 0.0001);
  assert.equal(step({ x: 308 }, 0), strip.scrollLeft);
  assert.equal(step({ x: 308 }, -16), strip.scrollLeft);
  assert.equal(step({ x: 308 }, 1000), step({ x: 308 }, 32));
});


test("the activation band reaches the real screen edges and tolerates thumb drift above the row", () => {
  const viewport = { viewportLeft: 0, viewportRight: 320 };
  for (const x of [250, 270, 300, 310, 319, 320]) {
    assert.ok(step({ ...viewport, x, y: 80 }) > strip.scrollLeft);
    assert.ok(step({ ...viewport, x }, 8.33) - strip.scrollLeft > .5, "120 Hz steps survive pixel rounding");
  }
  assert.ok(step({ ...viewport, x: 0 }) < strip.scrollLeft);
  assert.ok(step({ ...viewport, x: 2 }) < strip.scrollLeft);
  assert.equal(step({ ...viewport, x: 321 }), strip.scrollLeft);
});
test("hysteresis keeps edge intent through small boundary jitter, then stops in the center", () => {
  const bounds = { ...strip, viewportLeft: 0, viewportRight: 320 };
  assert.equal(entityStripEdge({ ...bounds, x: 230 }).direction, 0);
  assert.equal(entityStripEdge({ ...bounds, x: 230, activeDirection: 1 }).direction, 1);
  assert.equal(entityStripEdge({ ...bounds, x: 210, activeDirection: 1 }).direction, 0);
  assert.equal(entityStripEdge({ ...bounds, x: 90, activeDirection: -1 }).direction, -1);
  assert.equal(entityStripEdge({ ...bounds, x: 110, activeDirection: -1 }).direction, 0);
  assert.equal(entityStripEdge({ ...bounds, x: 309, y: 69, activeDirection: 1 }).direction, 1);
  assert.equal(entityStripEdge({ ...bounds, x: 309, y: 67, activeDirection: 1 }).direction, 0);
});
