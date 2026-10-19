const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const csv = fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8");
const now = "2026-10-19T12:00:00.000Z";
const history = csv.replaceAll("2026", "2021").replace('"2/1/2021"', '"2/1/2025"');

test("CSV sin mes importa todo el historial de varios años y reconcilia los saldos", () => {
  const s = A.importCSV(history, null, "history", now);
  assert.deepEqual(s.transactions.map(t => t.occurred_on), [
    "2021-01-05", "2021-01-06", "2021-01-07", "2025-02-01",
  ]);
  assert.equal(s.budgets.length, 0);
  assert.equal(s.imports[0].budget_month, null);
  assert.equal(s.accounts[0].opening_date, "2021-01-05");
  assert.equal(A.balances(s)[s.accounts[0].id], 185000);
  assert.equal(A.balances(s)[s.accounts[1].id], 17450);
  assert.equal(s.categories[0].import_metadata.raw[1], "200.00");
  assert.deepEqual(A.restore(A.backup(s)), s);
  assert.equal(A.importCSV(history).transactions.length, 4);
  assert.equal(A.importCSV(history, "").transactions.length, 4);
});

test("el mes opcional de límites nunca filtra ni cambia fechas históricas", () => {
  const s = A.importCSV(history, "2026-10", "history", now);
  const category = s.categories[0].id;
  assert.equal(s.transactions.length, 4);
  assert.equal(s.transactions[0].occurred_on, "2021-01-05");
  assert.equal(A.budgetLimit(s, category, "2025-02"), null);
  assert.equal(A.budgetLimit(s, category, "2026-10"), 20000);
  assert.equal(A.budgetLimit(s, category, "2028-06"), 20000);
});

test("CSV sin movimientos ni mes usa una fecha inicial válida y conserva cuentas", () => {
  const sections = csv.split(/\n\s*\n/);
  sections[0] = sections[0].split("\n").slice(0, 2).join("\n");
  const s = A.importCSV(sections.join("\n\n"), null, "empty-history", now);
  assert.equal(s.transactions.length, 0);
  assert.equal(s.accounts[0].opening_date, "2026-10-19");
  assert.equal(A.balances(s)[s.accounts[0].id], 185000);
});

test("los límites se heredan sin duplicar registros; los cambios respetan meses anteriores", () => {
  const s = A.importCSV(csv, "2026-01", "budgets", now);
  const category = s.categories[0].id;
  s.budgets.push(
    { id: "december", category_id: category, month: "2026-12", limit_cents: 40000 },
    { id: "march", category_id: category, month: "2026-03", limit_cents: 30000 },
  );
  const snapshot = JSON.stringify(s);
  for (const [month, limit] of [["2025-12", null], ["2026-01", 20000],
    ["2026-02", 20000], ["2026-03", 30000], ["2026-11", 30000],
    ["2026-12", 40000], ["2036-05", 40000]]) {
    assert.equal(A.budget(s, category, month).limit, limit);
  }
  assert.equal(JSON.stringify(s), snapshot, "Reading future months does not create budget records");
  assert.equal(A.budget(s, category, "2026-02").remaining, 15000);
  assert.equal(A.budget(s, category, "2026-03").remaining, 30000, "Monthly spending resets");
  assert.equal(A.budgetLimit(A.restore(A.backup(s)), category, "2036-05"), 40000);
});

test("sin límite y cero se heredan como cambios explícitos hasta el siguiente límite", () => {
  const s = A.importCSV(csv, "2026-01", "budgets", now);
  const category = s.categories[0].id;
  s.budgets.push(
    { id: "zero", category_id: category, month: "2026-03", limit_cents: 0 },
    { id: "unlimited", category_id: category, month: "2026-05", limit_cents: null },
    { id: "again", category_id: category, month: "2027-01", limit_cents: 10000 },
  );
  assert.equal(A.budgetLimit(s, category, "2026-04"), 0);
  assert.equal(A.budgetLimit(s, category, "2026-05"), null);
  assert.equal(A.budgetLimit(s, category, "2026-12"), null);
  assert.equal(A.budgetLimit(s, category, "2027-02"), 10000);
});
