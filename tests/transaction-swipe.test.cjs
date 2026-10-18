const { test } = require("node:test");
const assert = require("node:assert/strict");
const { transactionSwipeOutcome } = require("../app.js");

test("un toque o gesto corto/derecho no borra el movimiento", () => {
  for (const offset of [100, 1, 0, -10, -31, -32])
    assert.equal(transactionSwipeOutcome(offset, 300), "closed");
});
test("un gesto parcial a la izquierda revela Borrar sin eliminar", () => {
  for (const offset of [-33, -84, -194])
    assert.equal(transactionSwipeOutcome(offset, 300), "revealed");
  assert.equal(transactionSwipeOutcome(-139, 200), "revealed");
});
test("el gesto completo requiere el 65% del ancho y al menos 140 px", () => {
  assert.equal(transactionSwipeOutcome(-195, 300), "delete");
  assert.equal(transactionSwipeOutcome(-140, 200), "delete");
  assert.equal(transactionSwipeOutcome(-389, 600), "revealed");
  assert.equal(transactionSwipeOutcome(-390, 600), "delete");
});
