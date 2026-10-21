/* Serve successive app releases locally; no production requests or real tokens. */
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const A = require("../app.js");
const root = path.join(__dirname, "..");
const current = Number(/app\.js\?v=(\d+)/.exec(fs.readFileSync(path.join(root, "index.html"), "utf8"))[1]);
let release = current, failCheck = false, checks = 0;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost"), check = url.searchParams.has("app-check");
  if (check) checks++;
  if (check && failCheck) { res.writeHead(503).end(); return; }
  const name = url.pathname.replace(/^\/gastalo\//, "") || "index.html";
  if (!/^(index\.html|app\.js|styles\.css|sw\.js|manifest\.json|icons\/[\w.-]+)$/.test(name)) {
    res.writeHead(404).end(); return;
  }
  let body = fs.readFileSync(path.join(root, name));
  if (["index.html", "sw.js"].includes(name)) body = Buffer.from(body.toString()
    .replaceAll(`?v=${current}`, `?v=${release}`).replace(`gastalo-v${current}`, `gastalo-v${release}`));
  res.writeHead(200, {
    "Content-Type": ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" })[path.extname(name)] || "image/png",
    // Deliberately cache HTML to reproduce stale installed shells.
    "Cache-Control": "public, max-age=86400",
  }).end(body);
});
(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"], locale: "es-BO" }), errors = [];
    await context.route("https://api.github.com/**", route => route.abort());
    const page = await context.newPage(), base = `http://127.0.0.1:${server.address().port}/gastalo/`;
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(base);
    await page.waitForFunction(v => document.querySelector("#app-version")?.textContent === `v${v}`, current);
    const state = A.importCSV(fs.readFileSync(path.join(__dirname, "fixtures/coinkeeper.csv"), "utf8"), "2026-01", "app-update", "2026-02-02T00:00:00Z"),
      config = { repo: "example/test", path: "backup.json", token: "synthetic-update-test", paused: true };
    await page.evaluate(({ data, config }) => new Promise(resolve => {
      const request = indexedDB.open("gastalo");
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("state", "readwrite"), store = tx.objectStore("state");
        store.put({ data, revision: 1 }, "main");
        store.put(config, "sync_config");
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    }), { data: state, config });
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.getByRole("button", { name: "+ Movimiento", exact: true }).click();
    await page.locator('#dialog [name="amount"]').fill("123.45");
    release++;
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.getByText(/Actualización lista/).waitFor();
    assert.equal(await page.locator("#app-version").innerText(), `v${current}`);
    assert.equal(await page.locator('#dialog [name="amount"]').inputValue(), "123.45", "A resumed app must keep an open expense draft");
    // The new worker can activate even while an old window stays open.
    await page.waitForFunction(async v => {
      const keys = await caches.keys();
      return keys.includes(`gastalo-v${v}`) && !keys.includes(`gastalo-v${v - 1}`);
    }, release);
    assert.equal(await page.locator('#dialog [name="amount"]').inputValue(), "123.45");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.waitForFunction(v => document.querySelector("#app-version")?.textContent === `v${v}`, release);
    assert.equal(new URL(page.url()).searchParams.get("app-version"), String(release));
    // A restored page checks on pageshow too, without a full user navigation.
    release++;
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
    await page.waitForFunction(v => document.querySelector("#app-version")?.textContent === `v${v}`, release);
    await page.locator("#app-menu > summary").click();
    await page.getByRole("button", { name: "Importar/Exportar", exact: true }).click();
    await page.locator("#sync-token").fill("unsaved-token-draft");
    release++;
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.getByText(/Actualización lista/).waitFor();
    assert.equal(await page.locator("#sync-token").inputValue(), "unsaved-token-draft");
    assert.equal(await page.locator("#app-version").innerText(), `v${release - 1}`);
    await page.locator("#app-menu > summary").click();
    await page.getByRole("button", { name: "Inicio", exact: true }).click();
    await page.waitForFunction(v => document.querySelector("#app-version")?.textContent === `v${v}`, release);
    // Manual checks report network failure and recover without touching data.
    failCheck = true;
    await page.getByRole("button", { name: "Actualizar app", exact: true }).click();
    await page.getByText(/No se pudo comprobar/).waitFor();
    failCheck = false;
    await page.getByRole("button", { name: "Actualizar app", exact: true }).click();
    await page.getByText(/La app está actualizada/).waitFor();
    // Wait for this release's worker to control the app before checking offline use.
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
    await page.waitForFunction(async v => {
      const keys = await caches.keys();
      return keys.includes(`gastalo-v${v}`) && keys.filter(k => k.startsWith("gastalo-")).length === 1;
    }, release);
    await context.setOffline(true);
    const beforeOffline = checks;
    await page.getByRole("button", { name: "Actualizar app", exact: true }).click();
    await page.getByText(/Conéctate a internet/).waitFor();
    assert.equal(checks, beforeOffline);
    await page.reload();
    await page.waitForFunction(v => document.querySelector("#app-version")?.textContent === `v${v}`, release);
    const saved = await page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open("gastalo");
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("state"), result = {};
        for (const key of ["main", "sync_config"]) tx.objectStore("state").get(key).onsuccess = e => { result[key] = e.target.result; };
        tx.oncomplete = () => { db.close(); resolve(result); };
      };
    }));
    assert.deepEqual(saved.main, { data: state, revision: 1 });
    assert.deepEqual(saved.sync_config, config);
    assert.deepEqual(errors, []);
    console.log("PASS: cached shell upgrades on foreground/pageshow, open drafts and settings defer refresh, manual/offline/error checks, Pages subdirectory scope, offline reload and financial data/token preservation.");
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
