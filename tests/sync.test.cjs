const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
// Entirely synthetic configuration and existing made-up CSV fixture.
const config = {
  repo: "example/backup-demo",
  branch: "backup/demo",
  path: "respaldos/último #1.json",
  token: "invented-credential-1234",
};
const now = "2026-01-02T00:00:00.000Z";
const state = () => A.importCSV(
  fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"),
  "2026-01", "fixture", now,
);
const response = (status, sha, remote = A.emptyState()) => ({
  status, ok: status >= 200 && status < 300,
  json: async () => ({ sha, encoding: "base64", content: A.utf8Base64(A.backup(remote, now)) }),
});

test("payload SHA-256 ignores exported_at and detects every transaction change", async () => {
  const s = state(), payload = A.backup(s, now);
  const hash = await A.backupHash(payload);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, await A.backupHash(A.backup(s, "2026-02-02T00:00:00.000Z")));
  for (const transaction of s.transactions) {
    const changed = structuredClone(s);
    changed.transactions.find((t) => t.id === transaction.id).note += " cambio";
    assert.notEqual(hash, await A.backupHash(A.backup(changed, now)));
  }
  const changed = structuredClone(s);
  changed.accounts[0].opening_balance_cents++;
  assert.notEqual(hash, await A.backupHash(A.backup(changed, now)));
});

test("base64 round-trips UTF-8 accents, ñ, emoji and a large payload", () => {
  for (const text of ["", "Café, piñata, año 🪴💸", "ñ🪴".repeat(100000)])
    assert.equal(Buffer.from(A.utf8Base64(text), "base64").toString("utf8"), text);
});

test("sync decision skips absent token, offline and identical hash", () => {
  assert.equal(A.shouldSync({ token: "" }, true, "changed"), false);
  assert.equal(A.shouldSync(config, false, "changed"), false);
  assert.equal(A.shouldSync({ ...config, lastHash: "same" }, true, "same"), false);
  assert.equal(A.shouldSync({ ...config, lastHash: "old" }, true, "changed"), true);
  assert.equal(A.shouldSync(config, true, "first"), true);
  assert.equal(A.shouldSync({ ...config, paused: true }, true, "changed"), false);
  assert.equal(A.shouldSync({ ...config, lastHash: "same", checkAfterReset: true }, true, "same"), true);
});

test("Contents API request encodes URL and includes required headers and safe fetch options", () => {
  const { url, options } = A.syncRequest(config);
  assert.equal(url, "https://api.github.com/repos/example/backup-demo/contents/respaldos/%C3%BAltimo%20%231.json?ref=backup%2Fdemo");
  assert.equal(options.method, "GET");
  assert.deepEqual(options.headers, {
    Authorization: "Bearer " + config.token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  });
  assert.equal(options.redirect, "error");
  assert.equal(options.credentials, "omit");
  assert.equal(options.cache, "no-store");
  assert.equal(options.body, undefined);
  for (const bad of [
    { repo: "https://example.invalid/repo" }, { repo: "../repo" },
    { path: "../file.json" }, { path: "folder/./file.json" },
    { path: "" }, { branch: "" },
  ]) {
    assert.throws(() => A.syncRequest({ ...config, ...bad }), (e) => {
      assert.equal(A.syncErrorMessage(e.status).includes(config.token), false);
      return true;
    });
  }
});

test("PUT body is the unchanged manual backup, with SHA only when present", () => {
  const payload = A.backup(state(), now);
  for (const sha of [undefined, "synthetic-sha"]) {
    const { url, options } = A.syncRequest(config, payload, sha);
    assert.equal(new URL(url).host, "api.github.com");
    assert.equal(new URL(url).search, "");
    assert.equal(options.method, "PUT");
    assert.equal(options.headers["Content-Type"], "application/json");
    const body = JSON.parse(options.body);
    assert.deepEqual(body, {
      message: "sync: backup " + now,
      content: A.utf8Base64(payload),
      branch: config.branch,
      ...(sha ? { sha } : {}),
    });
    assert.equal(Buffer.from(body.content, "base64").toString("utf8"), payload);
    assert.equal(options.body.includes(config.token), false);
  }
});

test("status/errors never echo credentials or server error text", () => {
  assert.equal(A.syncErrorMessage(401), "Token inválido o sin permiso");
  assert.equal(A.syncErrorMessage(403), "Token inválido o sin permiso");
  assert.equal(A.syncErrorMessage(), "Sin conexión, se reintentará");
  for (const status of [undefined, 0, 401, 403, 404, 409, 422, 500, config.token])
    assert.equal(A.syncErrorMessage(status).includes(config.token), false);
});

test("backup/restore and erase use financial state, never the separate sync_config key", () => {
  const records = new Map([
    ["main", { revision: 1, data: state() }], ["sync_config", config],
  ]);
  const payload = A.backup(records.get("main").data, now);
  assert.deepEqual(Object.keys(JSON.parse(payload)).sort(),
    [...Object.keys(A.emptyState()), "exported_at"].sort());
  assert.equal(payload.includes("sync_config"), false);
  assert.equal(payload.includes(config.token), false);
  records.set("main", { revision: 2, data: A.restore(payload) });
  const s = records.get("main").data;
  records.set("main", { revision: 3, data: A.eraseEntity(s, "accounts", s.accounts[0].id) });
  assert.deepEqual(records.get("sync_config"), config);
  assert.equal(A.backup(records.get("main").data).includes(config.token), false);
});

test("upload checks the backup with its SHA before PUT; 404 creates file without SHA", async () => {
  const payload = A.backup(state(), now);
  for (const sha of [undefined, "old-sha"]) {
    const calls = [], signal = new AbortController().signal;
    await A.uploadBackup(config, payload, signal, async (url, options) => {
      calls.push({ url, options });
      return options.method === "GET" ? response(sha ? 200 : 404, sha) : response(200);
    });
    assert.deepEqual(calls.map((c) => c.options.method), ["GET", "PUT"]);
    assert.equal(JSON.parse(calls[1].options.body).sha, sha);
    assert.ok(calls.every((c) => c.options.signal === signal));
  }
});

test("409/422 refetch SHA and retry PUT exactly once", async () => {
  const payload = A.backup(state(), now);
  for (const conflict of [409, 422]) {
    const calls = [];
    await A.uploadBackup(config, payload, undefined, async (url, options) => {
      calls.push(options);
      if (options.method === "GET") return response(200, calls.length === 1 ? "old" : "new");
      return response(calls.length === 2 ? conflict : 200);
    });
    assert.deepEqual(calls.map((c) => c.method), ["GET", "PUT", "GET", "PUT"]);
    assert.equal(JSON.parse(calls[1].body).sha, "old");
    assert.equal(JSON.parse(calls[3].body).sha, "new");
    assert.equal(JSON.parse(calls[1].body).content, JSON.parse(calls[3].body).content);
    let attempts = 0;
    await assert.rejects(A.uploadBackup(config, payload, undefined, async (url, options) => {
      attempts++;
      return options.method === "GET" ? response(200, "sha") : response(conflict);
    }), (e) => e.status === conflict);
    assert.equal(attempts, 4);
  }
});

test("auth and network failures stop without consuming response error text", async () => {
  for (const status of [401, 403, 500]) {
    let attempts = 0;
    await assert.rejects(A.uploadBackup(config, A.backup(state()), undefined, async () => {
      attempts++;
      return { ...response(status), json: () => assert.fail("Do not read server errors") };
    }), (e) => {
      assert.equal(A.syncErrorMessage(e.status).includes(config.token), false);
      return e.status === status;
    });
    assert.equal(attempts, 1);
  }
  await assert.rejects(A.uploadBackup(config, A.backup(state()), undefined, async () => {
    throw new TypeError(config.token);
  }), (e) => A.syncErrorMessage(e.status) === "Sin conexión, se reintentará");
});

test("conflict retries recheck counts before another PUT", async () => {
  const calls = [];
  await assert.rejects(A.uploadBackup(config, A.backup(A.emptyState()), undefined, async (url, options) => {
    calls.push(options.method);
    if (options.method === "PUT") return response(409);
    return response(200, calls.length === 1 ? "old" : "new", calls.length === 1 ? A.emptyState() : state());
  }), error => error.replacementRequired && error.remoteCount === 4 && error.localCount === 0);
  assert.deepEqual(calls, ["GET", "PUT", "GET"]);
});

test("unreadable remote backups and aborted GETs cannot reach PUT", async () => {
  for (const remote of [{ sha: "sha" }, { sha: "sha", encoding: "base64", content: "invalid!" }]) {
    const calls = [];
    await assert.rejects(A.uploadBackup(config, A.backup(state()), undefined, async (url, options) => {
      calls.push(options.method);
      return { ok: true, status: 200, json: async () => remote };
    }));
    assert.deepEqual(calls, ["GET"]);
  }
  const controller = new AbortController(), calls = [];
  await assert.rejects(A.uploadBackup(config, A.backup(state()), controller.signal, async (url, options) => {
    calls.push(options.method);
    controller.abort();
    return response(200, "sha");
  }), { name: "AbortError" });
  assert.deepEqual(calls, ["GET"]);
});
