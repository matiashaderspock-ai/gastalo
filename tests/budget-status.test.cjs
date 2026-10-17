const { test } = require("node:test");
const assert = require("node:assert/strict");
const { budgetStatus } = require("../app.js");

test("disponible y exceso se calculan en centavos enteros", () => {
  assert.deepEqual(budgetStatus(20000, 2550), { amount_cents: 17450, exceeded: false });
  assert.deepEqual(budgetStatus(20000, 20001), { amount_cents: 1, exceeded: true });
  assert.deepEqual(budgetStatus(30, 10), { amount_cents: 20, exceeded: false });
  assert.deepEqual(budgetStatus(Number.MAX_SAFE_INTEGER, 1), {
    amount_cents: Number.MAX_SAFE_INTEGER - 1, exceeded: false,
  });
});
test("presupuesto agotado o cero y categorías sin presupuesto", () => {
  assert.deepEqual(budgetStatus(20000, 20000), { amount_cents: 0, exceeded: false });
  assert.deepEqual(budgetStatus(0, 0), { amount_cents: 0, exceeded: false });
  assert.deepEqual(budgetStatus(0, 1), { amount_cents: 1, exceeded: true });
  assert.equal(budgetStatus(null, 2550), null);
  assert.equal(budgetStatus(null, 0), null);
});
