const { test } = require("node:test");
const assert = require("node:assert/strict");
const { canDrop, direction, emptyState } = require("../app.js");
const source = { id: "source", type: "sources" };
const account = { id: "account", type: "accounts" };
const otherAccount = { id: "other", type: "accounts" };
const category = { id: "category", type: "categories" };

test("soltar: fuente → cuenta, cuenta → categoría y cuenta → otra cuenta", () => {
  assert.equal(canDrop(source, account), true);
  assert.equal(canDrop(account, category), true);
  assert.equal(canDrop(account, otherAccount), true);
});
test("categorías no son orígenes; mismo elemento y direcciones inversas no son válidos", () => {
  for (const from of [source, account, category]) {
    assert.equal(canDrop(from, { ...from }), false);
    assert.equal(canDrop(category, from), false);
  }
  assert.equal(canDrop(source, category), false);
  assert.equal(canDrop(account, source), false);
  assert.equal(canDrop(null, account), false);
  assert.equal(canDrop(account, null), false);
});
test("la regla de arrastre conserva los tipos del formulario sin mutar datos", () => {
  const state = emptyState();
  state.sources.push(source);
  state.accounts.push(account, otherAccount);
  state.categories.push(category);
  const before = JSON.stringify(state);
  assert.equal(direction(state, source.id, account.id), "income");
  assert.equal(direction(state, account.id, category.id), "expense");
  assert.equal(direction(state, account.id, otherAccount.id), "transfer");
  assert.equal(direction(state, account.id, account.id), null);
  assert.equal(direction(state, category.id, account.id), null);
  assert.equal(direction(state, "missing", account.id), null);
  assert.equal(JSON.stringify(state), before);
});
