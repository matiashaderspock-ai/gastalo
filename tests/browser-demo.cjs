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
    await page.goto(new URL("?demo=1&app-version=51", base).href);
    await page.locator(".home-totals").waitFor();
    assert.deepEqual(await page.evaluate(() => window.openedDatabases), ["gastalo-demo"]);
    async function assertDemoNotice(selector = "#demo-banner") {
      const banner = page.locator(selector);
      assert.equal(await banner.isVisible(), true);
      assert.equal(await banner.locator('[lang="en"]').innerText(), "Demo: sample data, nothing is saved to anyone's account");
      assert.equal(await banner.locator(".demo-notice > span").count(), 1, "One English notice");
      assert.match(await page.title(), /\bDEMO\b/);
      assert.equal(await banner.evaluate(el => {
        const r = el.getBoundingClientRect();
        return r.top >= -1 && r.bottom <= innerHeight &&
          el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }), true, "Demo notice stays visible and unobscured");
    }
    async function assertScrolledNotice() {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await assertDemoNotice();
      assert.ok((await page.locator("#demo-banner").boundingBox()).y <= 1, "Notice stays at the top while scrolling");
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await assertDemoNotice();
    assert.equal(await page.locator("#demo-banner button").count(), 1);
    assert.equal(await page.locator('#demo-banner button').getAttribute("data-action"), "reset-demo", "No dismissal control");
    await assertScrolledNotice();
    for (const account of A.demoState("2026-02-15").accounts) {
      const card = page.locator(`[data-entity="${account.id}"]`);
      assert.equal(await card.locator(".entity-name").innerText(), account.name);
      assert.match(await card.locator("strong").getAttribute("title"), /^Bs /);
    }
    async function assertDemoLogos() {
      for (const [id, file] of [["chase", "chase.svg"], ["robinhood", "robinhood.png"]]) {
        const logo = page.locator(`[data-entity="demo-${id}"] .entity-mark svg image`);
        assert.equal(await logo.getAttribute("href"), `./icons/demo/${file}`);
      }
      for (const [id, icon] of [["bmsc", "banco_mercantil"], ["wallet", "wallet"]]) {
        const matches = await page.locator(`[data-entity="demo-${id}"] .entity-mark svg`).evaluate((svg, markup) => {
          const expected = document.createElement("div");
          expected.innerHTML = `<svg>${markup}</svg>`;
          return svg.innerHTML === expected.firstChild.innerHTML;
        }, A.ENTITY_ICONS[icon].path);
        assert.equal(matches, true, `${id} keeps its existing artwork`);
      }
    }
    await assertDemoLogos();
    const categoryCards = page.locator('.entity-card[data-key="categories"]');
    assert.equal(await categoryCards.count(), 6);
    assert.equal(await categoryCards.locator(".entity-planned").count(), 6);
    assert.equal(await categoryCards.locator(".budget-amount.budget-red").count(), 1);
    for (const category of A.demoState("2026-02-15").categories) {
      const card = page.locator(`[data-entity="${category.id}"]`);
      assert.match(await card.getAttribute("aria-description"), /Gastos planeados: Bs/);
      assert.doesNotMatch(await card.locator("strong").getAttribute("title"), /^Bs 0,00$/);
    }
    await page.locator('[data-entity="demo-food"]').click();
    await page.locator(".entity-detail").waitFor();
    await assertScrolledNotice();
    await page.getByRole("button", { name: "Volver a Inicio", exact: true }).click();
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
    const personalData = A.emptyState();
    // Same IDs in a personal database must still render the ordinary icon keys.
    personalData.accounts = structuredClone(seed.data.accounts);
    const personal = { main: { revision: 7, data: personalData }, sync_config: token };
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
    await assertDemoNotice();
    await go("Límites de categoría");
    assert.equal(await page.locator("#month").inputValue(), "2026-02");
    assert.equal(await page.locator(".budget-card").count(), 6);
    assert.equal(await page.locator(".budget-card.budget-red").count(), 1);
    const food = page.locator(".budget-card").filter({ has: page.getByRole("heading", { name: "Food", exact: true }) });
    assert.match(await food.innerText(), /Bs 764,50/);
    assert.match(await food.innerText(), /Límite\s+Bs 700,00/);
    assert.match(await food.innerText(), /Exceso\s+Bs 64,50/);
    await assertScrolledNotice();
    await go("Historial");
    await assertScrolledNotice();
    await go("Inicio");
    await openMovementFromMenu(page);
    await assertDemoNotice("#demo-dialog-banner");
    await page.locator("#dialog").evaluate(el => { el.scrollTop = el.scrollHeight; });
    await assertDemoNotice("#demo-dialog-banner");
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
    await assertScrolledNotice();
    assert.equal(await page.locator(".expense-pie svg").count(), 1);
    await go("Importar/Exportar");
    await assertScrolledNotice();
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
    await assertDemoNotice("#demo-dialog-banner");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await assertDemoNotice();
    assert.equal((await records("gastalo-demo")).main.data.transactions.length, 31);
    // Simulate an existing visitor's pre-English seed, including old account IDs.
    const legacy = structuredClone(seed);
    const oldIds = { "demo-chase": "demo-ganadero", "demo-robinhood": "demo-economico" };
    legacy.data.sources[0].name = "Salary / Ingresos";
    legacy.data.accounts.forEach((a, i) => {
      a.id = oldIds[a.id] || a.id;
      a.name = ["Wallet", "BMSC (Banco Mercantil Santa Cruz)", "Banco Ganadero", "Banco Económico"][i];
      if (i) a.icon = "bank";
    });
    legacy.data.categories.forEach((c, i) => {
      c.name = ["Comida", "Transporte", "Vivienda", "Salud", "Entretenimiento", "Servicios"][i];
    });
    legacy.data.transactions.forEach(t => {
      t.from_id = oldIds[t.from_id] || t.from_id;
      t.to_id = oldIds[t.to_id] || t.to_id;
    });
    await write("gastalo-demo", { main: legacy });
    await page.reload();
    await page.locator(".home-totals").waitFor();
    assert.equal(await page.locator('[data-entity="demo-ganadero"] .entity-name').innerText(), "Banco Ganadero");
    await page.locator('#demo-banner [data-action="reset-demo"]').click();
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    const reset = await records("gastalo-demo");
    assert.deepEqual(reset.main.data, seed.data, "Reset upgrades an old demo to the complete English seed");
    await assertDemoLogos();
    assert.equal(reset.sync_config, undefined);
    assert.equal(reset["extra-demo-key"], undefined);
    assert.deepEqual(await records("gastalo"), { ...personal, "extra-demo-key": undefined });
    assert.deepEqual(await page.evaluate(() => [sessionStorage.getItem("gastalo-movement-draft"), localStorage.getItem("gastalo-gesture-help")]), [privateDraft, "dismissed"]);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    for (const file of ["chase.svg", "robinhood.png"]) {
      assert.equal(await page.evaluate(async file => {
        const response = await caches.match(new URL(`./icons/demo/${file}`, location.href).href);
        return response?.ok && (await response.arrayBuffer()).byteLength > 0;
      }, file), true, "Demo logo is available offline");
    }
    await context.setOffline(true);
    await page.reload();
    await page.locator(".home-totals").waitFor();
    await assertDemoLogos();
    assert.equal(new URL(page.url()).searchParams.get("demo"), "1");
    await assertDemoNotice();
    assert.deepEqual(await page.evaluate(() => window.openedDatabases), ["gastalo-demo"]);
    await context.setOffline(false);
    await page.clock.runFor(65000);
    assert.deepEqual(syncCalls, [], "No sync on boot/save/resume/timer/reset/offline recovery");
    assert.deepEqual(errors, []);
    // Positive control: the ordinary URL still opens personal data and attempts sync.
    await page.goto(base);
    await page.locator(".home-totals").waitFor();
    assert.equal(await page.locator("#demo-banner").isVisible(), false);
    assert.equal(await page.locator("#demo-dialog-banner").count(), 0);
    assert.equal(await page.locator(".entity-mark image").count(), 0, "Personal accounts never use demo logo overrides");
    assert.doesNotMatch(await page.title(), /DEMO/);
    await go("Importar/Exportar");
    assert.equal(await page.locator("#sync-form").count(), 1);
    assert.deepEqual(await page.evaluate(() => window.openedDatabases), ["gastalo"]);
    await page.waitForFunction(() => document.querySelector("#sync-status").textContent.includes("Token inválido"));
    assert.deepEqual(syncCalls, ["GET"]);
    assert.deepEqual((await records("gastalo")).main, personal.main);
    console.log("PASS demo: persistent English notice on all views/forms, DEMO title, seeded balances/spending/budgets, isolated DB/drafts, persistence/reset, offline, zero sync calls; ordinary URL unchanged");
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
