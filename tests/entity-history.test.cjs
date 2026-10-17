const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const load = () =>
  A.importCSV(
    fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"),
    "2026-01",
    "fixture",
    "2026-02-02T00:00:00.000Z",
  );

test("evolución de fuentes y categorías agrupa importes por mes e ignora borrados", () => {
  const s = load();
  const source = A.entityEvolution(s, s.sources[0].id, "2026-02");
  assert.equal(source.length, 12);
  assert.deepEqual(source.slice(-2), [
    { month: "2026-01", value: 100000 },
    { month: "2026-02", value: 0 },
  ]);
  const category = A.entityEvolution(s, s.categories[0].id, "2026-02");
  assert.deepEqual(category.slice(-2), [
    { month: "2026-01", value: 2550 },
    { month: "2026-02", value: 5000 },
  ]);
  s.transactions[0].status = "deleted";
  s.transactions[3].status = "deleted";
  assert.equal(A.entityEvolution(s, s.sources[0].id, "2026-02")[10].value, 0);
  assert.equal(
    A.entityEvolution(s, s.categories[0].id, "2026-02")[11].value,
    0,
  );
});
test("cuentas muestran saldo al cierre con saldo inicial, transferencias y gastos", () => {
  const s = load(),
    before = JSON.stringify(s);
  const bank = A.entityEvolution(s, s.accounts[0].id, "2026-02");
  const cash = A.entityEvolution(s, s.accounts[1].id, "2026-02");
  assert.equal(
    bank[9].value,
    0,
    "el saldo inicial no aparece antes de la fecha de apertura",
  );
  assert.deepEqual(bank.slice(-2), [
    { month: "2026-01", value: 190000 },
    { month: "2026-02", value: 185000 },
  ]);
  assert.deepEqual(cash.slice(-2), [
    { month: "2026-01", value: 17450 },
    { month: "2026-02", value: 17450 },
  ]);
  assert.equal(
    JSON.stringify(s),
    before,
    "consultar el gráfico no muta el respaldo",
  );
  s.transactions[0].status = "deleted";
  assert.equal(
    A.entityEvolution(s, s.accounts[0].id, "2026-02")[11].value,
    85000,
  );
});
test("el cierre excluye movimientos futuros y admite saldos negativos y entidades vacías", () => {
  const s = load();
  s.transactions.push({
    ...s.transactions[0],
    id: "future",
    occurred_on: "2026-03-01",
    amount_cents: 100,
  });
  assert.equal(
    A.entityEvolution(s, s.accounts[0].id, "2026-02")[11].value,
    185000,
  );
  assert.equal(
    A.entityEvolution(s, s.accounts[0].id, "2026-03")[11].value,
    185100,
  );
  const empty = A.emptyState();
  empty.accounts.push({
    id: "negative",
    opening_balance_cents: -12345,
    opening_date: "2026-02-01",
  });
  empty.categories.push({ id: "empty" });
  assert.equal(
    A.entityEvolution(empty, "negative", "2026-02")[11].value,
    -12345,
  );
  assert.equal(A.entityEvolution(empty, "negative", "2026-02")[10].value, 0);
  assert.ok(
    A.entityEvolution(empty, "empty", "2026-02").every((p) => p.value === 0),
  );
  assert.throws(
    () => A.entityEvolution(empty, "missing", "2026-02"),
    /inexistente/,
  );
});
