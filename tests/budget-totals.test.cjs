const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const load = () => A.importCSV(
  fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"),
  "2026-01", "budget-totals", "2026-02-02T00:00:00Z",
);

test("el total de límites se mantiene y el planeado baja con el gasto de cada mes", () => {
  const s = load();
  assert.deepEqual(A.budgetTotals(A.emptyState(), "2026-01"), { limit: 0, remaining: 0 });
  assert.deepEqual(A.budgetTotals(s, "2025-12"), { limit: 0, remaining: 0 });
  assert.deepEqual(A.budgetTotals(s, "2026-01"), { limit: 20000, remaining: 17450 });
  assert.deepEqual(A.budgetTotals(s, "2026-02"), { limit: 20000, remaining: 15000 });
  assert.deepEqual(A.budgetTotals(s, "2026-03"), { limit: 20000, remaining: 20000 });
  s.budgets.push({ id: "march", category_id: s.categories[0].id, month: "2026-03", limit_cents: 30000 });
  assert.deepEqual(A.budgetTotals(s, "2026-03"), { limit: 30000, remaining: 30000 });
  assert.deepEqual(A.budgetTotals(s, "2026-02"), { limit: 20000, remaining: 15000 });
});

test("un exceso, una categoría sin límite y un límite cero no consumen lo planeado de otra", () => {
  const s = load(), expense = s.transactions.find(t => t.kind === "expense");
  for (const [id, limit, spent] of [["extra", 10000, 15000], ["unlimited", null, 80000], ["zero", 0, 3000]]) {
    s.categories.push({ id, name: id, currency: "BOB", archived_at: null });
    if (limit !== null) s.budgets.push({ id: "limit-" + id, category_id: id, month: "2026-01", limit_cents: limit });
    s.transactions.push({ ...expense, id: "expense-" + id, to_id: id, amount_cents: spent });
  }
  A.validateState(s);
  assert.deepEqual(A.budgetTotals(s, "2026-01"), { limit: 30000, remaining: 17450 });
  expense.amount_cents = 20000;
  assert.deepEqual(A.budgetTotals(s, "2026-01"), { limit: 30000, remaining: 0 }, "Exactly reaching a limit leaves zero");
  expense.amount_cents = 25000;
  assert.deepEqual(A.budgetTotals(s, "2026-01"), { limit: 30000, remaining: 0 }, "Exceeding every limit never makes the planned total negative");
});

test("editar o borrar un gasto y quitar un límite recalcula lo pendiente sin cambiar datos", () => {
  const s = load(), expense = s.transactions.find(t => t.kind === "expense");
  expense.amount_cents = 1234;
  assert.deepEqual(A.budgetTotals(s, "2026-01"), { limit: 20000, remaining: 18766 });
  expense.status = "deleted";
  assert.deepEqual(A.budgetTotals(s, "2026-01"), { limit: 20000, remaining: 20000 }, "Income, transfers and deleted expenses do not consume the limit");
  s.budgets.push({ id: "unlimited", category_id: s.categories[0].id, month: "2026-02", limit_cents: null });
  assert.deepEqual(A.budgetTotals(s, "2026-02"), { limit: 0, remaining: 0 });
  const now = "2026-02-02T00:00:00Z", saved = A.backup(s, now);
  assert.deepEqual(A.budgetTotals(A.restore(saved), "2026-01"), { limit: 20000, remaining: 20000 });
  assert.equal(A.backup(s, now), saved, "Totals are derived and do not rewrite saved limits");
});

test("archivar y restaurar una categoría conserva sus movimientos, límites y saldos", () => {
  const s = load(), category = s.categories[0];
  const before = {
    transactions: structuredClone(s.transactions),
    budgets: structuredClone(s.budgets),
    totals: A.budgetTotals(s, "2026-01"),
    spent: A.report(s, "2026-01").categories.find(c => c.id === category.id).spent,
  };
  category.archived_at = "2026-10-20T00:00:00.000Z";
  A.validateState(s);
  assert.equal(s.categories.filter(c => !c.archived_at).some(c => c.id === category.id), false);
  assert.deepEqual(A.budgetTotals(s, "2026-01"), before.totals);
  assert.equal(A.report(s, "2026-01").categories.find(c => c.id === category.id).spent, before.spent);
  assert.deepEqual(s.transactions, before.transactions);
  assert.deepEqual(s.budgets, before.budgets);
  category.archived_at = null;
  A.validateState(s);
  assert.equal(s.categories.filter(c => !c.archived_at).some(c => c.id === category.id), true);
  assert.deepEqual(A.budgetTotals(s, "2026-01"), before.totals);
  assert.deepEqual(s.transactions, before.transactions);
  assert.deepEqual(s.budgets, before.budgets);
});
