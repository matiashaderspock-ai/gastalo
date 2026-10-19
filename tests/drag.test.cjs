const { test } = require("node:test");
const assert = require("node:assert/strict");
const { canDrop, direction, emptyState, gestureIntent } = require("../app.js");
const source = { id: "source", type: "sources" };
const account = { id: "account", type: "accounts" };
const otherAccount = { id: "other", type: "accounts" };
const category = { id: "category", type: "categories" };
const gesture = (overrides) => gestureIntent({
  dx: 0, dy: 0, onCircle: true, canDrag: true, canPan: false, ...overrides,
});

test("el primer movimiento sobre un círculo inicia el arrastre, sin espera ni distancia mínima", () => {
  assert.equal(gesture({}), "pending");
  for (const [dx, dy] of [[0.1,0],[-0.1,0],[0,0.1],[0,-0.1],[1,1],[-1,-1],[0,11]]) {
    assert.equal(gesture({dx, dy}), "drag");
    assert.equal(gesture({dx, dy, canPan:true}), "drag", "También inicia al instante en una fila desbordada");
  }
});
test("los nombres e importes conservan scroll y nunca inician arrastre", () => {
  assert.equal(gesture({onCircle:false, dy:1}), "pending");
  for (const [dx,dy] of [[0,7],[0,-20],[20,0],[-20,1]])
    assert.equal(gesture({onCircle:false, dx,dy,canPan:true}), "scroll");
});
test("el modo edición y las categorías permiten desplazarse sin arrastrar", () => {
  assert.equal(gesture({canDrag:false, canPan:true, dx:-30}), "pan");
  assert.equal(gesture({canDrag:false, canPan:true, dy:20}), "scroll");
  assert.equal(gesture({canDrag:false, dy:20}), "scroll");
  assert.equal(gesture({canDrag:false, dx:20}), "scroll");
});

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
