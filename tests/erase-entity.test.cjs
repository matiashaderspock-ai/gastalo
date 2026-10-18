const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const load = () => A.importCSV(
  fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"),
  "2026-01", "erase-fixture", "2026-02-02T00:00:00.000Z",
);

test("eliminar una fuente retira todos sus ingresos sin mutar el estado original", () => {
  const state = load(), before = JSON.stringify(state), id = state.sources[0].id;
  const next = A.eraseEntity(state, "sources", id);
  assert.equal(next.sources.length, 0);
  assert.equal(next.transactions.length, 3);
  assert.ok(next.transactions.every(t => t.from_id !== id && t.to_id !== id));
  assert.equal(A.report(next, "2026-01").income, 0);
  assert.equal(A.balances(next)[state.accounts[0].id], 85000);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(next.review, state.review);
  assert.deepEqual(next.imports, state.imports);
  assert.deepEqual(next.tags, state.tags);
});
test("eliminar una cuenta retira ingresos, gastos y transferencias de todos los meses", () => {
  const state = load(), id = state.accounts[0].id;
  const next = A.eraseEntity(state, "accounts", id);
  assert.equal(next.accounts.length, 1);
  assert.deepEqual(next.transactions.map(t => t.id), [state.transactions[2].id]);
  assert.equal(A.balances(next)[state.accounts[1].id], 7450);
  assert.deepEqual(next.budgets, state.budgets);
  assert.equal(A.validateState(next), next);
});
test("eliminar una categoría retira también movimientos borrados y todos sus presupuestos", () => {
  const state = load(), id = state.categories[0].id;
  state.transactions[2].status = "deleted";
  state.categories[0].archived_at = "2026-02-01T00:00:00Z";
  state.budgets.push({id:"feb", category_id:id, month:"2026-02", limit_cents:1000});
  const next = A.eraseEntity(state, "categories", id);
  assert.equal(next.categories.length, 0);
  assert.equal(next.budgets.length, 0);
  assert.deepEqual(next.transactions.map(t => t.kind), ["income", "transfer"]);
  assert.equal(A.report(next, "2026-02").expense, 0);
  assert.deepEqual(A.restore(A.backup(next)), next);
});
test("eliminar una entidad vacía conserva el resto y rechaza IDs o colecciones inválidas", () => {
  const state = load();
  state.categories.push({...state.categories[0], id:"empty", name:"Vacía"});
  assert.deepEqual(A.eraseEntity(state, "categories", "empty"), load());
  assert.throws(() => A.eraseEntity(state, "accounts", "missing"), /inexistente/);
  assert.throws(() => A.eraseEntity(state, "transactions", state.transactions[0].id), /inexistente/);
});
