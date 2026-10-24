const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const load = () => A.importCSV(fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"), "2026-01");

test("dates display DD/MM/YY without changing ISO dates or inventing days for months", () => {
  for (const [iso, expected] of [["2026-10-24", "24/10/26"], ["2024-02-29", "29/02/24"],
    ["1999-12-31", "31/12/99"], ["2000-01-01", "01/01/00"], ["0001-01-01", "01/01/01"]])
    assert.equal(A.formatDate(iso), expected);
  for (const value of [null, undefined, "", "2026-02-30", "24/10/26"]) assert.equal(A.formatDate(value), "");
  assert.equal(A.formatMonth("2026-10"), "10/26");
  assert.equal(A.formatMonth("1999-12"), "12/99");
  assert.equal(A.formatMonth("2026-13"), "");
});
test("local time uses the profile timezone and 00 rather than 24 at midnight", () => {
  assert.deepEqual(A.localClock("2026-10-25T03:59:58Z", "America/La_Paz"), { date: "2026-10-24", time: "23:59:58" });
  assert.deepEqual(A.localClock("2026-10-25T04:00:00Z", "America/La_Paz"), { date: "2026-10-25", time: "00:00:00" });
  assert.deepEqual(A.localClock("2026-10-25T03:59:58Z", "UTC"), { date: "2026-10-25", time: "03:59:58" });
  assert.deepEqual(A.localClock("2026-01-15T12:34:56Z", "America/New_York"), { date: "2026-01-15", time: "07:34:56" });
  assert.deepEqual(A.localClock("2026-07-15T12:34:56Z", "America/New_York"), { date: "2026-07-15", time: "08:34:56" });
});
test("movement time is normalized, timezone-aware and validated", () => {
  assert.deepEqual(A.transactionTimeFields("08:05", "America/La_Paz"), { occurred_time: "08:05:00", occurred_timezone: "America/La_Paz" });
  assert.deepEqual(A.transactionTimeFields("23:59:58", "UTC"), { occurred_time: "23:59:58", occurred_timezone: "UTC" });
  assert.deepEqual(A.transactionTimeFields("", "America/La_Paz"), { occurred_time: null, occurred_timezone: null });
  for (const value of ["24:00", "23:60", "12:34:60", "3:04", "12:04 PM", 1234])
    assert.throws(() => A.transactionTimeFields(value, "America/La_Paz"), /Hora/);
  assert.throws(() => A.transactionTimeFields("12:00", "Invalid/Zone"), /Zona horaria/);
  assert.throws(() => A.transactionTimeFields("12:00"), /zona horaria/);
});
test("old backups and CSV keep unknown hours unknown; new fields survive JSON without financial changes", () => {
  const state = load(), before = A.backup(state);
  for (const t of state.transactions) assert.equal(t.occurred_time, undefined);
  assert.deepEqual(A.restore(before), state);
  const balances = A.balances(state), report = A.report(state, "2026-01");
  Object.assign(state.transactions[0], A.transactionTimeFields("15:32:46", "America/La_Paz"));
  const restored = A.restore(A.backup(state));
  assert.equal(restored.transactions[0].occurred_time, "15:32:46");
  assert.equal(restored.transactions[0].occurred_timezone, "America/La_Paz");
  assert.deepEqual(A.balances(restored), balances);
  assert.deepEqual(A.report(restored, "2026-01"), report);
  assert.equal(restored.transactions[0].occurred_on, "2026-01-05");
});
test("invalid time metadata is rejected before restoring a backup", () => {
  for (const fields of [{ occurred_time: "24:00:00", occurred_timezone: "UTC" },
    { occurred_time: "12:00:00" }, { occurred_time: "12:00:00", occurred_timezone: "Bad/Zone" },
    { occurred_timezone: "UTC" }, { occurred_time: "", occurred_timezone: "UTC" }]) {
    const s = load();
    Object.assign(s.transactions[0], fields);
    assert.throws(() => A.validateState(s));
  }
});
test("history sorts by accounting date, then event time, then original creation time", () => {
  const records = [
    { id: "early", occurred_on: "2026-10-24", occurred_time: "08:00:00", created_at: "2026-10-25T12:00:00Z" },
    { id: "late", occurred_on: "2026-10-24", occurred_time: "20:00:00", created_at: "2026-10-24T12:00:00Z" },
    { id: "legacy", occurred_on: "2026-10-24", created_at: "2026-10-26T12:00:00Z" },
    { id: "next", occurred_on: "2026-10-25", occurred_time: "01:00", created_at: "2026-10-25T12:00:00Z" },
  ];
  assert.deepEqual(records.sort(A.compareTransactionDates).map(t => t.id), ["next", "late", "early", "legacy"]);
  assert.equal(A.compareTransactionDates({ ...records[0], occurred_time: "12:00" }, { ...records[0], occurred_time: "12:00:00" }), 0);
});
