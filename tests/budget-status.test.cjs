const { test } = require("node:test");
const assert = require("node:assert/strict");
const { budgetVisual } = require("../app.js");

test("sin gasto o sin presupuesto el círculo permanece gris y vacío", () => {
  for (const limit of [null, 0, 10000])
    assert.deepEqual(budgetVisual(limit, 0), { fill: 0, tone: "gray" });
  assert.deepEqual(budgetVisual(null, 5000), { fill: 0, tone: "gray" });
});
test("relleno verde hasta el 65% y naranja por encima, hasta el 100% inclusive", () => {
  assert.deepEqual(budgetVisual(10000, 1), { fill: 0.01, tone: "green" });
  assert.deepEqual(budgetVisual(80000, 50000), { fill: 62.5, tone: "green" });
  assert.deepEqual(budgetVisual(10000, 6500), { fill: 65, tone: "green" });
  assert.deepEqual(budgetVisual(10000, 6501), { fill: 65.01, tone: "orange" });
  assert.deepEqual(budgetVisual(10000, 6510), { fill: 65.1, tone: "orange" });
  assert.deepEqual(budgetVisual(10000, 10000), { fill: 100, tone: "orange" });
});
test("al superar el presupuesto el círculo es rojo completo, incluido límite cero", () => {
  assert.deepEqual(budgetVisual(10000, 10001), { fill: 100, tone: "red" });
  assert.deepEqual(budgetVisual(10000, 25000), { fill: 100, tone: "red" });
  assert.deepEqual(budgetVisual(0, 1), { fill: 100, tone: "red" });
});
test("los umbrales comparan centavos enteros sin errores de coma flotante", () => {
  const limit = 9007199254740900;
  const threshold = Number(BigInt(limit) * 65n / 100n);
  assert.equal(budgetVisual(limit, threshold).tone, "green");
  assert.equal(budgetVisual(limit, threshold + 1).tone, "orange");
  assert.deepEqual(budgetVisual(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), {
    fill: 100, tone: "orange",
  });
});
