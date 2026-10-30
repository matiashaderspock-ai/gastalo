const { test } = require("node:test");
const assert = require("node:assert/strict");
const A = require("../app.js");

for (const date of ["2026-10-30", "2026-01-01", "2024-03-01", "2025-03-01"]) {
  test(`demo seed is valid, labeled and recent on ${date}`, () => {
    const s = A.demoState(date), month = date.slice(0, 7), previous = A.shiftMonth(month, -1);
    assert.deepEqual(A.restore(A.backup(s)), s);
    assert.deepEqual(s.accounts.map(a => a.name), ["Wallet", "BMSC", "Chase", "Robinhood"]);
    assert.deepEqual(s.sources.map(a => a.name), ["Salary"]);
    assert.deepEqual(s.categories.map(c => c.name), ["Food", "Transport", "Housing", "Health", "Entertainment", "Utilities"]);
    assert.deepEqual(s.accounts.map(a => a.icon), ["wallet", "banco_mercantil", "bank", "investments"]);
    assert.equal(s.transactions.length, 30);
    assert.equal(s.tags[0].name, "Sample data");
    assert.ok(s.transactions.every(t => t.note.startsWith("Sample · ") && t.tag_ids.includes("demo-sample")));
    assert.ok(s.transactions.every(t => t.occurred_on <= date && t.occurred_on >= previous + "-01"));
    assert.ok(Object.values(A.balances(s)).every(cents => cents > 0 && cents < 2000000));
    const totals = A.report(s, previous).income + A.report(s, month).income
      - A.report(s, previous).expense - A.report(s, month).expense;
    assert.equal(Object.values(A.balances(s)).reduce((a, b) => a + b, 0),
      s.accounts.reduce((sum, a) => sum + a.opening_balance_cents, 0) + totals);
    for (const period of [previous, month]) {
      const report = A.report(s, period);
      assert.equal(s.transactions.filter(t => t.occurred_on.startsWith(period)).length, 15);
      assert.equal(report.income, 650000);
      assert.ok(report.expense > 0);
      assert.ok(report.categories.every(c => c.spent > 0));
    }
  });
}

for (const date of ["2026-10-30", "2026-01-01", "2024-03-01", "2025-03-01"]) {
  test(`demo has current-month plans and spending, with one over budget on ${date}`, () => {
    const state = A.demoState(date), month = date.slice(0, 7);
    const expected = [
      ["demo-food", 70000, 76450],
      ["demo-transport", 45000, 19900],
      ["demo-housing", 200000, 180350],
      ["demo-health", 50000, 24000],
      ["demo-entertainment", 60000, 19700],
      ["demo-services", 40000, 24350],
    ];
    const plans = state.budgets.filter(b => b.month === month);
    assert.equal(plans.length, state.categories.length);
    assert.equal(new Set(plans.map(b => b.category_id)).size, state.categories.length);
    for (const [id, limit, spent] of expected) {
      assert.equal(plans.find(b => b.category_id === id)?.limit_cents, limit);
      assert.deepEqual(A.budget(state, id, month), { limit, spent, remaining: limit - spent });
    }
    const budgets = state.categories.map(c => A.budget(state, c.id, month));
    assert.equal(budgets.filter(b => b.remaining < 0).length, 1);
    assert.equal(budgets.filter(b => b.remaining > 0).length, 5);
    assert.deepEqual(A.budgetTotals(state, month), { limit: 465000, remaining: 126700 });
    // Current-month plans use the normal effective-month model and retain history.
    assert.equal(A.budgetLimit(state, "demo-food", A.shiftMonth(month, -1)), 140000);
    assert.equal(A.budgetLimit(state, "demo-food", A.shiftMonth(month, 1)), 70000);
    assert.deepEqual(A.balances(state), {
      "demo-wallet": 128850, "demo-bmsc": 1121300,
      "demo-chase": 522250, "demo-robinhood": 262300,
    });
  });
}
