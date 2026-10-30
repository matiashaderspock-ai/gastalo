const { test } = require("node:test");
const assert = require("node:assert/strict");
const A = require("../app.js");

for (const date of ["2026-10-30", "2026-01-01", "2024-03-01", "2025-03-01"]) {
  test(`demo seed is valid, labeled and recent on ${date}`, () => {
    const s = A.demoState(date), month = date.slice(0, 7), previous = A.shiftMonth(month, -1);
    assert.deepEqual(A.restore(A.backup(s)), s);
    assert.deepEqual(s.accounts.map(a => a.name), ["Wallet", "BMSC (Banco Mercantil Santa Cruz)", "Banco Ganadero", "Banco Económico"]);
    assert.equal(s.categories.length, 6);
    assert.equal(s.transactions.length, 30);
    assert.equal(s.tags[0].name, "Datos de ejemplo");
    assert.ok(s.transactions.every(t => t.note.startsWith("Ejemplo · ") && t.tag_ids.includes("demo-sample")));
    assert.ok(s.transactions.every(t => t.occurred_on <= date && t.occurred_on >= previous + "-01"));
    assert.ok(Object.values(A.balances(s)).every(cents => cents > 0 && cents < 2000000));
    for (const period of [previous, month]) {
      const report = A.report(s, period);
      assert.equal(s.transactions.filter(t => t.occurred_on.startsWith(period)).length, 15);
      assert.equal(report.income, 650000);
      assert.ok(report.expense > 0);
      assert.ok(report.categories.every(c => c.spent > 0));
    }
  });
}
