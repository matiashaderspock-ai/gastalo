const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const A = require("../app.js");
const source = fs.readFileSync(__dirname + "/../app.js", "utf8");
const config = { repo: "example/synthetic", branch: "main", path: "gastalo-backup.json", token: "fake-token-1234" };
const fixture = A.importCSV(fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"), "2026-01", "fixture");
function state(count, deleted = 0) {
  const s = structuredClone(fixture);
  s.transactions = Array.from({ length: count + deleted }, (_, i) => ({
    ...s.transactions[0], id: "tx-" + i, status: i < count ? "posted" : "deleted",
  }));
  return s;
}
const digests = new Set();
const settle = async () => {
  for (let i = 0; i < 20; i++) {
    await Promise.all([...digests]);
    await new Promise(setImmediate);
  }
};

// Run the unmodified app with a small DOM/IndexedDB boundary fake; no dependencies or network.
async function app(local, remote, savedConfig = config) {
  const records = new Map([["main", { revision: 1, data: local }], ["sync_config", structuredClone(savedConfig)]]);
  const transactions = [], calls = [], timers = new Map(), nodes = new Map(), listeners = new Map();
  let nextTimer = 0, remoteState = remote, remoteSha = "remote-1", pending = Promise.resolve();
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {
      innerHTML: "", textContent: "", value: "", open: false, disabled: false,
      classList: { toggle() {}, add() {}, remove() {} },
      focus() {}, setAttribute() {}, contains() { return false; }, querySelector() { return null; },
      showModal() { this.open = true; }, close() { this.open = false; },
      addEventListener() {},
    });
    return nodes.get(selector);
  }
  const db = { transaction() {
    const tx = { objectStore: () => store, abort() { aborted = true; } };
    const operations = [];
    let aborted = false;
    const store = {
      get(key) { const request = {}; operations.push(() => { request.result = structuredClone(staged.get(key)); request.onsuccess?.(); }); return request; },
      put(value, key) { staged.set(key, structuredClone(value)); writes.push(["put", key]); },
      delete(key) { staged.delete(key); writes.push(["delete", key]); },
    };
    let staged, writes = [];
    pending = pending.then(() => new Promise(resolve => setImmediate(() => {
      staged = new Map(records);
      // Writes made immediately when creating a transaction are queued until it is active.
      for (const operation of operations) operation();
      if (!aborted) {
        records.clear();
        for (const [key, value] of staged) records.set(key, value);
        transactions.push(writes);
        tx.oncomplete?.();
      } else tx.onabort?.();
      resolve();
    })));
    // Defer immediate put/delete calls just as IndexedDB queues its requests.
    for (const method of ["put", "delete"]) {
      const perform = store[method];
      store[method] = (...args) => {
        if (staged) perform(...args);
        else operations.push(() => perform(...args));
      };
    }
    return tx;
  }};
  const document = {
    visibilityState: "visible", querySelector: node, querySelectorAll: () => [],
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(listener); },
  };
  const context = vm.createContext({
    document, window: { addEventListener() {}, scrollTo() {} }, navigator: { onLine: false },
    indexedDB: { open() { const request = { result: db }; setImmediate(() => request.onsuccess()); return request; } },
    crypto: { subtle: { digest(...args) {
      const result = globalThis.crypto.subtle.digest(...args);
      digests.add(result);
      result.finally(() => digests.delete(result));
      return result;
    } } }, TextEncoder, TextDecoder, Uint8Array, btoa, atob, AbortController,
    setTimeout(fn, delay) { timers.set(++nextTimer, { fn, delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    FormData: class { constructor(form) { this.values = form.values; } get(key) { return this.values?.[key] ?? null; } },
    fetch: async (url, options) => {
      calls.push(options);
      if (options.method === "PUT") return { ok: true, status: 200 };
      return { ok: true, status: 200, json: async () => ({ sha: remoteSha, encoding: "base64", content: A.utf8Base64(A.backup(remoteState)) }) };
    },
  });
  vm.runInContext(source, context);
  await settle();
  assert.doesNotMatch(node("#main").innerHTML, /No se pudo abrir/);
  async function emit(type, event = {}) {
    for (const listener of listeners.get(type) || []) listener(event);
    await settle();
  }
  return {
    records, calls, transactions, node, context,
    async click(dataset) {
      const button = { dataset, matches: () => false, closest: selector => selector === "[data-action], [data-view]" ? button : null };
      await emit("click", { target: button });
    },
    async submit(values = {}) {
      const form = node("#modal-form"); form.values = values;
      await form.onsubmit({ preventDefault() {}, currentTarget: form });
      await settle();
    },
    async manual() {
      for (const key of ["repo", "branch", "path"]) node("#sync-" + key).value = config[key];
      context.navigator.onLine = true;
      await emit("submit", { target: { id: "sync-form" }, preventDefault() {} });
    },
    async auto() { context.navigator.onLine = true; await emit("visibilitychange"); },
    async advance() {
      for (const [id, timer] of [...timers]) if (timer.delay <= 30000) { timers.delete(id); timer.fn(); await settle(); }
    },
    remote(value, sha) { remoteState = value; remoteSha = sha; },
  };
}
const methods = a => a.calls.map(c => c.method);

for (const erase of [false, true]) test(`reset ${erase ? "deletes" : "preserves"} sync_config atomically`, async () => {
  const saved = { ...config, enabled: true, lastHash: "previous" };
  const a = await app(state(4), state(4), saved);
  await a.click({ action: "reset-app" });
  assert.match(a.node("#dialog-body").innerHTML, /También borrar el token de sincronización/);
  assert.match(a.node("#dialog-body").innerHTML, /Tendrás que crear y pegar un token nuevo/);
  assert.match(a.node("#dialog-body").innerHTML, /name="erase-sync" type="checkbox">/);
  await a.submit({ "confirm-reset": "on", ...(erase ? { "erase-sync": "on" } : {}) });
  assert.deepEqual(a.records.get("main"), { revision: 2, data: A.emptyState() });
  assert.deepEqual(a.records.get("sync_config"), erase ? undefined : { ...saved, checkAfterReset: true });
  assert.ok(a.transactions.some(tx => tx.some(([op, key]) => op === "put" && key === "main") &&
    tx.some(([op, key]) => op === (erase ? "delete" : "put") && key === "sync_config")));
  await a.click({ view: "settings" });
  if (!erase) assert.match(a.node("#main").innerHTML, /placeholder="••••1234"/);
  assert.deepEqual(methods(a), []);
});

test("reset conflict leaves both data and sync configuration unchanged", async () => {
  const a = await app(state(4), state(4));
  a.records.get("main").revision++;
  await a.click({ action: "reset-app" });
  await a.submit({ "confirm-reset": "on", "erase-sync": "on" });
  assert.match(a.node("#modal-error").textContent, /Otra pestaña/);
  assert.deepEqual(a.records.get("main").data, state(4));
  assert.deepEqual(a.records.get("sync_config"), config);
});

test("empty local backup blocks auto-sync; cancel pauses until a manual retry and explicit replacement", async () => {
  const a = await app(state(0, 3), state(4, 2));
  await a.auto();
  assert.deepEqual(methods(a), ["GET"]);
  assert.equal(a.node("#dialog").open, true);
  assert.match(a.node("#dialog-body").innerHTML, /Tu respaldo en GitHub tiene 4 movimientos y aquí hay 0\. ¿Reemplazarlo con datos vacíos\?/);
  assert.match(a.node("#dialog-body").innerHTML, /class="danger" type="submit">Reemplazar/);
  await a.click({ action: "close" });
  await a.auto(); await a.advance();
  assert.deepEqual(methods(a), ["GET"]);
  assert.equal(a.records.get("sync_config").paused, true);
  const reloaded = await app(state(0), state(4), a.records.get("sync_config"));
  await reloaded.auto();
  assert.deepEqual(methods(reloaded), []);
  await a.manual();
  assert.equal(a.node("#dialog").open, true);
  assert.deepEqual(methods(a), ["GET", "GET"]);
  await a.submit(); await a.advance();
  assert.deepEqual(methods(a), ["GET", "GET", "GET", "PUT"]);
});

test("guard blocks below half of >=20 remote posted movements; boundaries and growth upload without prompting", async () => {
  for (const [local, remote, blocked] of [[9, 20, true], [10, 21, true], [10, 20, false], [1, 19, false], [21, 20, false]]) {
    const a = await app(state(local, 3), state(remote, 4));
    await a.manual();
    assert.deepEqual(methods(a), blocked ? ["GET"] : ["GET", "PUT"], `${local}/${remote}`);
    assert.equal(a.node("#dialog").open, blocked);
    if (blocked) assert.ok(a.node("#dialog-body").innerHTML.includes(`tiene ${remote} movimientos y aquí hay ${local}`));
  }
});

test("first sync after reset requires a check/confirmation even when hashes and counts look fine", async () => {
  const empty = A.emptyState();
  const a = await app(state(4), empty, { ...config, lastHash: await A.backupHash(A.backup(empty)) });
  await a.click({ action: "reset-app" }); await a.submit({ "confirm-reset": "on" });
  const reloaded = await app(empty, empty, a.records.get("sync_config"));
  await reloaded.auto();
  assert.deepEqual(methods(reloaded), ["GET"]);
  assert.equal(reloaded.node("#dialog").open, true);
  await reloaded.submit(); await reloaded.advance();
  assert.deepEqual(methods(reloaded), ["GET", "GET", "PUT"]);
  assert.equal(reloaded.records.get("sync_config").checkAfterReset, undefined);
  await reloaded.auto();
  assert.deepEqual(methods(reloaded), ["GET", "GET", "PUT"], "SHA-256 dedupe resumes after success");
});

test("replacement approval cannot authorize a changed remote SHA", async () => {
  const a = await app(state(0), state(4));
  await a.auto();
  a.remote(state(5), "remote-2");
  await a.submit(); await a.advance();
  assert.deepEqual(methods(a), ["GET", "GET"]);
  assert.equal(a.node("#dialog").open, true);
  assert.match(a.node("#dialog-body").innerHTML, /tiene 5 movimientos/);
});
