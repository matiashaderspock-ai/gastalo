const { test } = require("node:test");
const assert = require("node:assert/strict");
const { canDrop, direction, emptyState, gestureIntent } = require("../app.js");
const source = { id: "source", type: "sources" };
const account = { id: "account", type: "accounts" };
const otherAccount = { id: "other", type: "accounts" };
const category = { id: "category", type: "categories" };
const gesture = (overrides) => gestureIntent({
  dx: 0, dy: 0, elapsedMs: 50, onCircle: true, canDrag: true,
  canPan: false, pointerType: "touch", ...overrides,
});

test("el gesto vertical temprano espera y cancela el arrastre al superar 10 px antes de 150 ms", () => {
  assert.equal(gesture({ dy: 6 }), "pending");
  assert.equal(gesture({ dy: 7 }), "pending");
  assert.equal(gesture({ dy: 10, elapsedMs: 149 }), "pending");
  for (const dy of [-11, 11]) {
    assert.equal(gesture({ dy, elapsedMs: 149 }), "scroll");
    assert.equal(gesture({ dx: 30, dy, elapsedMs: 149 }), "scroll");
  }
  assert.equal(gesture({ dy: 11, elapsedMs: 150 }), "drag");
});
test("solo el círculo inicia arrastre; nombres e importes conservan scroll", () => {
  assert.equal(gesture({ dx: 8 }), "drag");
  for (const elapsedMs of [50, 150, 300]) {
    assert.equal(gesture({ onCircle: false, dy: 20, elapsedMs }), "scroll");
    assert.equal(gesture({ onCircle: false, dx: 20, elapsedMs }), "scroll");
    assert.equal(gesture({ canDrag: false, dy: 20, elapsedMs }), "scroll");
  }
});
test("deslizar horizontalmente explora la fila; mantener antes de mover permite transferir", () => {
  assert.equal(gesture({ canPan: true, dx: -30 }), "pan");
  assert.equal(gesture({ canPan: true, dx: 30, elapsedMs: 150 }), "drag");
  assert.equal(gesture({ canPan: true, dx: 30, pointerType: "mouse" }), "drag");
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
