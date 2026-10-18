const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const load = () =>
  A.importCSV(
    fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"),
    "2026-01",
    "fixture",
    "2026-02-02T00:00:00.000Z",
  );
test("respaldos v1 sin icono usan el símbolo del tipo", () => {
  const s = load();
  assert.equal(A.entityIconKey(s.sources[0], "sources"), "income");
  assert.equal(A.entityIconKey(s.accounts[0], "accounts"), "wallet");
  assert.equal(A.entityIconKey(s.categories[0], "categories"), "tag");
  assert.deepEqual(A.restore(A.backup(s)), s);
});
test("los iconos elegidos se conservan en JSON sin modificar saldos ni reportes", () => {
  const s = load(),
    balances = A.balances(s),
    report = A.report(s, "2026-01");
  s.sources[0].icon = "work";
  s.accounts[0].icon = "bank";
  s.categories[0].icon = "food";
  const restored = A.restore(A.backup(s));
  assert.equal(restored.sources[0].icon, "work");
  assert.equal(restored.accounts[0].icon, "bank");
  assert.equal(restored.categories[0].icon, "food");
  assert.equal(A.entityIconKey(restored.categories[0], "categories"), "food");
  assert.deepEqual(A.balances(restored), balances);
  assert.deepEqual(A.report(restored, "2026-01"), report);
});
test("solo se aceptan claves del catálogo propio, nunca SVG o rutas arbitrarias", () => {
  for (const icon of ["<svg onload=alert(1)>", "../../file", null, 17]) {
    const s = load();
    s.accounts[0].icon = icon;
    assert.throws(() => A.validateState(s), /Icono de entidad inválido/);
  }
  assert.equal(Object.keys(A.ENTITY_ICONS).length, 24);
});
