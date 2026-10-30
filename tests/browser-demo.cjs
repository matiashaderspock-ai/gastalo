/* Synthetic data only; all GitHub requests are intercepted. */
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const A = require("../app.js");
const { openMovementFromMenu } = require("./browser-helpers.cjs");
const base = process.env.GASTALO_URL || "http://127.0.0.1:4173/";
const token = { repo: "example/synthetic", branch: "main", path: "backup.json", token: "synthetic-demo-test" };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"], locale: "es-BO", reducedMotion: "reduce" });
    const syncCalls = [];
    await context.route("https://api.github.com/**", route => {
      syncCalls.push(route.request().method());
      return route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
    });
    await context.addInitScript(() => {
      window.openedDatabases = [];
      const open = indexedDB.open.bind(indexedDB);
      indexedDB.open = (...args) => { window.openedDatabases.push(args[0]); return open(...args); };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-02-15T16:00:00Z") });
    await page.goto(new URL("?demo=1&app-version=49", base).href);
    await page.locator(".home-totals").waitFor();
    assert.deepEqual(await page.evaluate(() => window.openedDatabases), ["gastalo-demo"]);
    assert.equal(await page.locator("#demo-banner").isVisible(), true);
    assert.match(await page.locator("#demo-banner").innerText(), /Datos de ejemplo/);
    assert.equal(await page.locator('link[rel="manifest"]').count(), 0, "No personal install shortcut");
    async function records(name) {
      return page.evaluate(name => new Promise((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction("state"), result = {};
          for (const key of ["main", "sync_config", "extra-demo-key"])
            tx.objectStore("state").get(key).onsuccess = e => { result[key] = e.target.result; };
          tx.oncomplete = () => { db.close(); resolve(result); };
          tx.onerror = () => reject(tx.error);
        };
      }), name);
    }
    async function write(name, values) {
      await page.evaluate(({ name, values }) => new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => request.result.createObjectStore("state");
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction("state", "readwrite");
          for (const [key, value] of Object.entries(values)) tx.objectStore("state").put(value, key);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      }), { name, values });
    }
    const seed = (await records("gastalo-demo")).main;
    assert.deepEqual(seed.data, A.demoState("2026-02-15"));
    assert.equal((await records("gastalo-demo")).sync_config, undefined);
    const personal = { main: { revision: 7, data: A.emptyState() }, sync_config: token };
    await write("gastalo", personal);
    await write("gastalo-demo", { sync_config: token, "extra-demo-key": "discard on reset" });
    const privateDraft = JSON.stringify({ transactionId: null, amount: "987.65", note: "synthetic personal draft" });
    await page.evaluate(draft => {
      sessionStorage.setItem("gastalo-movement-draft", draft);
      localStorage.setItem("gastalo-gesture-help", "dismissed");
    }, privateDraft);
    await page.reload();
    await page.locator(".home-totals").waitFor();
    assert.deepEqual(await page.evaluate(() => window.openedDatabases), ["gastalo-demo"]);
    assert.deepEqual((await records("gastalo-demo")).main, seed, "Reload does not reseed");
    await openMovementFromMenu(page);
    assert.equal(await page.locator(".draft-notice").count(), 0, "No personal draft read");
    await page.locator('[name="from"]').selectOption("demo-wallet");
    await page.locator('[name="to"]').selectOption("demo-food");
    await page.locator('[name="amount"]').fill("25");
    await page.getByRole("button", { name: "Registrar", exact: true }).click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    assert.equal((await records("gastalo-demo")).main.data.transactions.length, 31);
    await page.reload();
    await page.locator(".home-totals").waitFor();
    assert.equal((await records("gastalo-demo")).main.data.transactions.length, 31, "Edits persist");
    async function go(name) {
      await page.locator("#app-menu > summary").click();
      await page.getByRole("button", { name, exact: true }).click();
    }
    await go("Gráficos");
    assert.equal(await page.locator(".expense-pie svg").count(), 1);
    await go("Importar/Exportar");
    assert.equal(await page.locator("#backup-settings, #sync-form, #sync-token, [data-action=reset-app]").count(), 0);
    await page.evaluate(() => {
      const form = document.createElement("form");
      form.id = "sync-form";
      document.body.append(form);
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.remove();
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("online"));
    });
    await page.clock.runFor(65000);
    assert.deepEqual(syncCalls, []);
    assert.deepEqual((await records("gastalo-demo")).sync_config, token, "Injected config ignored");
    await go("Inicio");
    await page.screenshot({ path: "/tmp/gastalo-demo-mobile.png", fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#demo-banner [data-action="reset-demo"]').click();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    assert.equal((await records("gastalo-demo")).main.data.transactions.length, 31);
    await page.locator('#demo-banner [data-action="reset-demo"]').click();
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    const reset = await records("gastalo-demo");
    assert.deepEqual(reset.main.data, seed.data);
    assert.equal(reset.sync_config, undefined);
    assert.equal(reset["extra-demo-key"], undefined);
    assert.deepEqual(await records("gastalo"), { ...personal, "extra-demo-key": undefined });
    assert.deepEqual(await page.evaluate(() => [sessionStorage.getItem("gastalo-movement-draft"), localStorage.getItem("gastalo-gesture-help")]), [privateDraft, "dismissed"]);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await page.locator(".home-totals").waitFor();
    assert.equal(new URL(page.url()).searchParams.get("demo"), "1");
    assert.equal(await page.locator("#demo-banner").isVisible(), true);
    assert.deepEqual(await page.evaluate(() => window.openedDatabases), ["gastalo-demo"]);
    await context.setOffline(false);
    await page.clock.runFor(65000);
    assert.deepEqual(syncCalls, [], "No sync on boot/save/resume/timer/reset/offline recovery");
    assert.deepEqual(errors, []);
    // Positive control: the ordinary URL still opens personal data and attempts sync.
    await page.goto(base);
    await page.locator(".home-totals").waitFor();
    assert.equal(await page.locator("#demo-banner").isVisible(), false);
    await go("Importar/Exportar");
    assert.equal(await page.locator("#sync-form").count(), 1);
    assert.deepEqual(await page.evaluate(() => window.openedDatabases), ["gastalo"]);
    await page.waitForFunction(() => document.querySelector("#sync-status").textContent.includes("Token inválido"));
    assert.deepEqual(syncCalls, ["GET"]);
    assert.deepEqual((await records("gastalo")).main, personal.main);
    console.log("PASS demo: isolated DB/drafts, seeded charts, persistence/reset, offline, zero sync calls; ordinary URL unchanged");
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
