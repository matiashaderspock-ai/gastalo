const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const A = require('../app.js');
const fixture = () => A.importCSV(fs.readFileSync(__dirname + '/fixtures/coinkeeper.csv', 'utf8'), '2026-01');

test('a prepared monthly report preserves every budget and the exact planned total, including archived categories', () => {
  const state = fixture();
  state.categories[0].archived_at = '2026-01-01T00:00:00Z';
  const before = JSON.stringify(state);
  for (const month of ['2025-12', '2026-01', '2028-04']) {
    const prepared = A.report(state, month);
    for (const category of state.categories) assert.deepEqual(A.budget(state, category.id, month, prepared), A.budget(state, category.id, month));
    assert.deepEqual(A.budgetTotals(state, month, prepared), A.budgetTotals(state, month));
  }
  assert.equal(JSON.stringify(state), before);
});
test('single-pass balances match independent BigInt accounting over many transfers, incomes and deleted records', () => {
  const state = fixture(), original = state.transactions;
  state.transactions = Array.from({ length: 5000 }, (_, i) => ({ ...original[i % original.length], id: 'large-' + i, status: i % 13 ? 'posted' : 'deleted' }));
  const expected = Object.fromEntries(state.accounts.map(account => {
    const net = state.transactions.filter(t => t.status === 'posted').reduce((total, t) => total +
      (t.to_id === account.id ? BigInt(t.amount_cents) : 0n) - (t.from_id === account.id ? BigInt(t.amount_cents) : 0n), BigInt(account.opening_balance_cents));
    return [account.id, Number(net)];
  }));
  assert.deepEqual(A.balances(state), expected);
  assert.doesNotThrow(() => A.validateState(state));
});
test('opposing large flows use exact intermediates and still reject an unsafe final balance', () => {
  const state = fixture(), account = state.accounts[0], sample = state.transactions.find(t => t.kind === 'income');
  account.opening_balance_cents = Number.MAX_SAFE_INTEGER;
  state.transactions = [{ ...sample, amount_cents: 1 }];
  assert.throws(() => A.balances(state), /rango seguro/);
  state.transactions.push({ ...state.transactions[0], id: 'opposing', from_id: account.id, to_id: state.accounts[1].id, kind: 'transfer' });
  assert.equal(A.balances(state)[account.id], Number.MAX_SAFE_INTEGER);
});
