const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const A = require('../app.js');
function ledger() {
  const state = A.importCSV(fs.readFileSync(__dirname + '/fixtures/coinkeeper.csv', 'utf8'));
  const [bank, cash] = state.accounts, source = state.sources[0], category = state.categories[0];
  const base = state.transactions[0];
  state.transactions = [];
  const add = (kind, from, to, amount, date = '2026-02-10', status = 'posted') => {
    const transaction = { ...base, id: `movement-${state.transactions.length}`, kind,
      from_id: from.id, to_id: to.id, amount_cents: amount, occurred_on: date, status };
    state.transactions.push(transaction);
    return transaction;
  };
  return { state, bank, cash, source, category, add };
}
test('daily net matches the signed entity rows for incomes, expenses and both transfer directions', () => {
  const { state, bank, cash, source, category, add } = ledger();
  const income = add('income', source, bank, 10000);
  const expense = add('expense', bank, category, 4000);
  const outgoing = add('transfer', bank, cash, 2000);
  const incoming = add('transfer', cash, bank, 500);
  add('expense', cash, category, 1000);
  add('income', source, bank, 90000, '2026-02-10', 'deleted');
  const before = JSON.stringify(state);
  assert.equal(A.entityMovementAmount(income, source.id), 10000);
  assert.equal(A.entityMovementAmount(expense, category.id), -4000);
  assert.equal(A.entityMovementAmount(outgoing, bank.id), -2000);
  assert.equal(A.entityMovementAmount(incoming, bank.id), 500);
  assert.equal(A.entityMovementAmount(income, category.id), 0);
  assert.equal(A.entityDayTotals(state, bank.id).get('2026-02-10'), 4500);
  assert.equal(A.entityDayTotals(state, cash.id).get('2026-02-10'), 500);
  assert.equal(A.entityDayTotals(state, source.id).get('2026-02-10'), 10000);
  assert.equal(A.entityDayTotals(state, category.id).get('2026-02-10'), -5000);
  assert.equal(JSON.stringify(state), before, 'Reading totals does not change movements or opening balances');
});
test('dates remain separate, a balanced day shows zero, and unrelated or deleted movements do not contribute', () => {
  const { state, bank, cash, source, category, add } = ledger();
  add('income', source, bank, 1100);
  add('expense', bank, category, 1100);
  add('expense', bank, category, 900, '2025-12-31');
  add('income', source, cash, 8000, '2026-02-11');
  add('income', source, bank, 9999, '2026-02-12', 'deleted');
  assert.deepEqual([...A.entityDayTotals(state, bank.id)], [['2026-02-10', 0], ['2025-12-31', -900]]);
  assert.equal(A.entityDayTotals(state, 'unrelated-entity').size, 0);
});
test('complete-day totals include more than 100 movements and remain exact in integer cents', () => {
  const { state, bank, source, category, add } = ledger();
  for (let i = 0; i < 125; i++) add('income', source, bank, 101);
  add('expense', bank, category, 5000);
  assert.equal(A.entityDayTotals(state, bank.id).get('2026-02-10'), 7625);
  state.transactions = [];
  add('income', source, bank, Number.MAX_SAFE_INTEGER);
  add('income', source, bank, Number.MAX_SAFE_INTEGER);
  add('expense', bank, category, Number.MAX_SAFE_INTEGER);
  assert.equal(A.entityDayTotals(state, bank.id).get('2026-02-10'), Number.MAX_SAFE_INTEGER, 'Intermediate totals use exact arithmetic');
  add('income', source, bank, 1);
  assert.throws(() => A.entityDayTotals(state, bank.id), /Total fuera del rango seguro/);
});
test('edits, deletion and restoration recalculate the appropriate day', () => {
  const { state, bank, source, category, add } = ledger();
  add('income', source, bank, 10000);
  const expense = add('expense', bank, category, 2500);
  assert.equal(A.entityDayTotals(state, bank.id).get('2026-02-10'), 7500);
  expense.amount_cents = 3500;
  assert.equal(A.entityDayTotals(state, bank.id).get('2026-02-10'), 6500);
  expense.occurred_on = '2026-02-11';
  assert.deepEqual([...A.entityDayTotals(state, bank.id)], [['2026-02-10', 10000], ['2026-02-11', -3500]]);
  expense.status = 'deleted';
  assert.equal(A.entityDayTotals(state, bank.id).has('2026-02-11'), false);
  expense.status = 'posted';
  assert.equal(A.entityDayTotals(state, bank.id).get('2026-02-11'), -3500);
});
