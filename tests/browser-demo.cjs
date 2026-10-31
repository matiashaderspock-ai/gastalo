/* Synthetic data only; all GitHub requests are intercepted. */
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const A = require("../app.js");
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
    await page.goto(new URL("?demo=1&app-version=53", base).href);
    await page.locator(".home-totals").waitFor();
    assert.equal(await page.locator("html").getAttribute("lang"), "en", "English even in an es-BO browser");
    assert.deepEqual(await page.locator("nav button").allTextContents().then(values => values.map(v => v.trim())),
      ["+ Transaction", "Home", "History", "Category limits", "Charts", "Import/Export"]);
    assert.equal(await page.locator("#update-app").innerText(), "Update app");
    assert.equal(await page.locator(".skip-link").textContent(), "Skip to content");
    async function assertEnglishChrome() {
      const chrome = await page.evaluate(() => {
        const values = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          // User-entered names, notes, tags, and imported rows are data, not UI copy.
          if (!node.parentElement.closest("script, noscript, .entity-name, .transaction-note, .tags, .review-row p"))
            values.push(node.textContent);
        }
        for (const el of document.querySelectorAll("[aria-label], [aria-description], [placeholder], [title]")) {
          for (const name of ["aria-label", "aria-description", "placeholder", "title"])
            values.push(el.getAttribute(name) || "");
        }
        return values.join("\n");
      });
      assert.doesNotMatch(chrome, /\b(?:Inicio|Historial|Gráficos|Importar|Exportar|Guardar|Cancelar|Crear|Editar|Registrar|Borrar|Deshacer|Listo|Origen|Destino|Importe|Nombre|Límite|Límites|Categoría|Categorías|Fuentes|Cuentas|Etiquetas|Fecha|Hora|Mes|páginas|movimientos|presupuesto|gastado|archivado|Restante|Exceso|Restablecer|almacenamiento|sincronización|Navegación|Menú|Recuperar|Descartar)\b/iu);
    }
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
    await assertEnglishChrome();
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
      assert.match(await card.getAttribute("aria-description"), /Planned spending: Bs/);
      assert.doesNotMatch(await card.locator("strong").getAttribute("title"), /^Bs 0,00$/);
    }
    await page.locator('[data-entity="demo-food"]').click();
    await page.locator(".entity-detail").waitFor();
    await assertEnglishChrome();
    await assertScrolledNotice();
    await page.getByRole("button", { name: "Back to Home", exact: true }).click();
    assert.equal(await page.locator('link[rel="manifest"]').count(), 0, "No personal install shortcut");
    async function records(name) {
      return page.evaluate(name => new Promise((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction("state"), result = {};
          for (const key of ["main", "demo_seed_version", "sync_config", "extra-demo-key"])
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
          for (const [key, value] of Object.entries(values)) {
            if (value === undefined) tx.objectStore("state").delete(key);
            else tx.objectStore("state").put(value, key);
          }
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      }), { name, values });
    }
    const seed = (await records("gastalo-demo")).main;
    assert.deepEqual(seed.data, A.demoState("2026-02-15"));
    assert.equal((await records("gastalo-demo")).demo_seed_version, 2);
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
    await go("Category limits");
    assert.equal(await page.locator("#month").inputValue(), "2026-02");
    assert.equal(await page.locator(".month-picker > span").innerText(), "February 2026");
    assert.equal(await page.locator(".budget-card").count(), 6);
    assert.equal(await page.locator(".budget-card.budget-red").count(), 1);
    const food = page.locator(".budget-card").filter({ has: page.getByRole("heading", { name: "Food", exact: true }) });
    assert.match(await food.innerText(), /Bs 764,50/);
    assert.match(await food.innerText(), /Limit\s+Bs 700,00/);
    assert.match(await food.innerText(), /Over budget\s+Bs 64,50/);
    await assertScrolledNotice();
    await go("History");
    await page.locator("#shared-filters > summary").click();
    assert.equal(await page.locator("#f-text").getAttribute("placeholder"), "E.g. lunch");
    assert.equal(await page.locator("#f-start").evaluate(el => el.parentElement.textContent.trim()), "DD/MM/YY");
    await page.locator("#f-text").fill("no matching sample note");
    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    assert.equal(await page.locator(".transaction-list .empty").innerText(), "No transactions match these filters.");
    await assertEnglishChrome();
    await page.getByRole("button", { name: "Show all", exact: true }).click();
    await assertScrolledNotice();
    await go("Home");
    await page.locator("#app-menu > summary").click();
    await page.locator('nav [data-action="movement"]').click();
    await assertDemoNotice("#demo-dialog-banner");
    await page.locator("#dialog").evaluate(el => { el.scrollTop = el.scrollHeight; });
    await assertDemoNotice("#demo-dialog-banner");
    assert.equal(await page.locator(".draft-notice").count(), 0, "No personal draft read");
    await assertEnglishChrome();
    await page.locator("#tag-picker-toggle").click();
    assert.equal(await page.locator("#dialog-title").textContent(), "Tags");
    assert.equal(await page.locator("#tag-search").getAttribute("placeholder"), "Find or create a tag");
    await page.locator("#tag-search").fill("no matching tag");
    assert.equal(await page.locator("#tag-search-empty").innerText(), "No matches.");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.locator('[name="from"]').selectOption("demo-wallet");
    await page.locator('[name="to"]').selectOption("demo-food");
    await page.locator('[name="amount"]').fill("invalid");
    await page.getByRole("button", { name: "Record", exact: true }).click();
    assert.equal(await page.locator("#modal-error").innerText(), "Invalid amount. Use up to two decimal places, without thousands separators.");
    await page.locator('[name="amount"]').fill("25");
    await page.locator(".movement-extras > summary").click();
    await page.locator('[name="note"]').fill("Gastos planeados · nota del usuario");
    await page.getByRole("button", { name: "Record", exact: true }).click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    assert.equal((await records("gastalo-demo")).main.data.transactions.length, 31);
    assert.equal((await records("gastalo-demo")).main.data.transactions.at(-1).note, "Gastos planeados · nota del usuario", "User data is never translated");
    assert.match(await page.locator("#toast").innerText(), /Transaction recorded/);
    await page.reload();
    await page.locator(".home-totals").waitFor();
    assert.equal((await records("gastalo-demo")).main.data.transactions.length, 31, "Edits persist");
    async function go(name) {
      await page.locator("#app-menu > summary").click();
      await page.getByRole("button", { name, exact: true }).click();
    }
    await go("Charts");
    await assertEnglishChrome();
    await assertScrolledNotice();
    assert.equal(await page.locator(".expense-pie svg").count(), 1);
    await go("Import/Export");
    await assertEnglishChrome();
    for (const [key, kind] of [["sources", "source"], ["accounts", "account"], ["categories", "category"], ["tags", "tag"]]) {
      const group = page.locator(`[data-manage-key="${key}"]`);
      await group.locator(":scope > summary").click();
      await group.locator('[data-action="add"]').click();
      assert.equal(await page.locator("#dialog-title").innerText(), `Create ${kind}`);
      assert.equal(await page.locator('[name="name"]').evaluate(el => el.parentElement.textContent), "Name");
      await assertEnglishChrome();
      if (key !== "tags") {
        await page.getByRole("button", { name: "Change icon", exact: true }).click();
        assert.equal(await page.locator('[data-icon="wallet"]').getAttribute("aria-label"), "Wallet");
        assert.equal(await page.locator('[data-icon="food"]').getAttribute("title"), "Food");
        await assertEnglishChrome();
      }
      await page.locator('#dialog .dialog-heading [data-action="close"]').click();
    }
    await page.locator("#json-file").setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{") });
    assert.equal(await page.locator("#toast > span").innerText(), "This file is not a valid JSON backup. Your data was not changed.");
    await page.locator("#json-file").setInputFiles({ name: "sample.json", mimeType: "application/json", buffer: Buffer.from(A.backup(A.demoState("2026-02-15"))) });
    await page.locator("#dialog[open]").waitFor();
    assert.equal(await page.locator("#dialog-title").innerText(), "Review import");
    await assertEnglishChrome();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal((await records("gastalo-demo")).main.data.transactions.length, 31, "Cancelled preview leaves demo data intact");
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
    await go("Home");
    await page.screenshot({ path: "/tmp/gastalo-demo-mobile.png", fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#demo-banner [data-action="reset-demo"]').click();
    await assertDemoNotice("#demo-dialog-banner");
    assert.equal(await page.locator("#dialog-title").innerText(), "Reset demo?");
    await assertEnglishChrome();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
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
    for (const version of [undefined, 1]) {
      await write("gastalo-demo", {
        main: legacy, demo_seed_version: version,
        sync_config: token, "extra-demo-key": "discard on upgrade",
      });
      await page.reload();
      await page.locator(".home-totals").waitFor();
      assert.deepEqual(await page.evaluate(() => window.openedDatabases), ["gastalo-demo"]);
      const upgraded = await records("gastalo-demo");
      assert.deepEqual(upgraded.main.data, seed.data, `Version ${version} upgrades automatically to the English seed`);
      assert.equal(upgraded.main.revision, legacy.revision + 1, "Invalidate writes from tabs holding the old seed");
      assert.equal(upgraded.demo_seed_version, 2);
      assert.equal(upgraded.sync_config, undefined);
      assert.equal(upgraded["extra-demo-key"], undefined);
      await assertDemoLogos();
      await page.reload();
      await page.locator(".home-totals").waitFor();
      assert.deepEqual(await records("gastalo-demo"), upgraded, "Upgrade happens only once");
      assert.deepEqual(await records("gastalo"), {
        ...personal, demo_seed_version: undefined, "extra-demo-key": undefined,
      }, "Upgrading the demo leaves the personal database untouched");
      assert.deepEqual(syncCalls, [], "Demo upgrades never sync");
    }
    // A newer seed must not be downgraded by an older app shell.
    await write("gastalo-demo", { main: legacy, demo_seed_version: 3 });
    await page.reload();
    await page.locator(".home-totals").waitFor();
    assert.deepEqual((await records("gastalo-demo")).main, legacy);
    assert.equal((await records("gastalo-demo")).demo_seed_version, 3);
    await page.locator('#demo-banner [data-action="reset-demo"]').click();
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    const reset = await records("gastalo-demo");
    assert.deepEqual(reset.main.data, seed.data, "Reset upgrades an old demo to the complete English seed");
    assert.equal(reset.demo_seed_version, 2, "Manual demo reset retains the current seed version");
    await assertDemoLogos();
    assert.equal(reset.sync_config, undefined);
    assert.equal(reset["extra-demo-key"], undefined);
    assert.deepEqual(await records("gastalo"), { ...personal, demo_seed_version: undefined, "extra-demo-key": undefined });
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
    assert.equal(await page.locator("#offline").innerText(), "Offline");
    assert.deepEqual(await page.evaluate(() => window.openedDatabases), ["gastalo-demo"]);
    assert.deepEqual(await records("gastalo-demo"), reset, "Reload after manual reset does not reseed");
    await context.setOffline(false);
    await page.clock.runFor(65000);
    assert.deepEqual(syncCalls, [], "No sync on boot/save/resume/timer/reset/offline recovery");
    assert.deepEqual(errors, []);
    // Positive control: the ordinary URL still opens personal data and attempts sync.
    await page.goto(base);
    await page.locator(".home-totals").waitFor();
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    assert.deepEqual(await page.locator("nav button").allTextContents().then(values => values.map(v => v.trim())),
      ["+ Movimiento", "Inicio", "Historial", "Límites de categoría", "Gráficos", "Importar/Exportar"]);
    assert.equal(await page.locator("#update-app").innerText(), "Actualizar app");
    assert.deepEqual(await page.locator(".home-totals .stat > span").allTextContents(),
      ["Balance actual", "Gastos efectuados", "Gastos planeados"]);
    assert.equal(await page.locator("#demo-banner").isVisible(), false);
    assert.equal(await page.locator("#demo-dialog-banner").count(), 0);
    assert.equal(await page.locator(".entity-mark image").count(), 0, "Personal accounts never use demo logo overrides");
    assert.doesNotMatch(await page.title(), /DEMO/);
    await go("Importar/Exportar");
    assert.equal(await page.locator("#main h1").innerText(), "Importar/Exportar");
    assert.match(await page.locator("#main").innerText(), /Sin filas pendientes\./);
    assert.equal(await page.locator("#sync-form").count(), 1);
    assert.deepEqual(await page.evaluate(() => window.openedDatabases), ["gastalo"]);
    await page.waitForFunction(() => document.querySelector("#sync-status").textContent.includes("Token inválido"));
    assert.deepEqual(syncCalls, ["GET"]);
    assert.deepEqual((await records("gastalo")).main, personal.main);
    console.log("PASS demo: persistent English notice, seeded balances/spending/budgets, automatic English seed upgrades, version persistence/reset, isolated DB/drafts, offline, zero sync calls; ordinary URL unchanged");
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
