const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const load = () => A.importCSV(fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"), "2026-01");
for (const key of ["sources", "accounts", "categories"]) {
  test(`reorder ${key}: preserve financial data, metadata and archived slots`, () => {
    const state = load(), template = state[key][0];
    state[key].push({ ...template, id: `${key}-extra-1`, name: "Extra 1" },
      { ...template, id: `${key}-extra-2`, name: "Extra 2" });
    state[key].splice(1, 0, { ...template, id: `${key}-archived`, name: "Archivada", archived_at: "2026-01-02T00:00:00Z" });
    const before = JSON.stringify(state), ids = state[key].filter(e => !e.archived_at).map(e => e.id);
    ids.unshift(ids.splice(2, 1)[0]);
    const next = A.reorderEntities(state, key, ids);
    assert.deepEqual(next[key].filter(e => !e.archived_at).map(e => e.id), ids);
    assert.deepEqual(next[key][1], state[key][1]);
    assert.equal(JSON.stringify(state), before);
    for (const field of Object.keys(state).filter(field => field !== key)) assert.deepEqual(next[field], state[field]);
    assert.deepEqual(A.balances(next), A.balances(state));
    assert.deepEqual(A.restore(A.backup(next)), next);
    assert.deepEqual(A.reorderEntities(next, key, state[key].filter(e => !e.archived_at).map(e => e.id)), state);
  });
}
test("reject duplicate, missing, cross-group and archived reorder targets", () => {
  const s = load(), ids = s.accounts.map(e => e.id);
  for (const [key, order] of [["tags", []], ["unknown", []], ["accounts", null], ["accounts", []],
    ["accounts", [ids[0], ids[0]]], ["accounts", [ids[0], s.categories[0].id]], ["accounts", [...ids, "unknown"]]])
    assert.throws(() => A.reorderEntities(s, key, order), /Orden de entidades inválido/);
  s.accounts[0].archived_at = "2026-01-02T00:00:00Z";
  assert.throws(() => A.reorderEntities(s, "accounts", ids), /Orden de entidades inválido/);
});
