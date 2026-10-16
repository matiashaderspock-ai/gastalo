/* Optional real-browser smoke test. Requires Playwright; runtime app has no dependencies.
   Start a server first. GASTALO_URL may include a Pages-style subdirectory. */
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const A = require("../app.js");
const base = process.env.GASTALO_URL || "http://127.0.0.1:4173/";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      defaultBrowserType: "chromium",
      locale: "es-BO",
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    assert.equal(await page.title(), "gástalo");
    async function add(key, name) {
      await page
        .locator(`[data-action="add"][data-key="${key}"]`)
        .first()
        .click();
      await page.locator('#dialog [name="name"]').fill(name);
      await page.locator('#dialog button[type="submit"]').click();
      await page.locator("#dialog").waitFor({ state: "hidden" });
    }
    await add("sources", "Trabajo");
    await add("accounts", "Banco");
    await add("accounts", "Efectivo");
    await add("categories", "Comida");
    const card = (text) =>
      page
        .locator(".entity-card")
        .filter({ has: page.locator(".entity-name", { hasText: text }) });
    async function transaction(from, to, amount, note = "") {
      await card(from).tap();
      await card(to).tap();
      await page.locator('#dialog [name="amount"]').fill(amount);
      await page.locator('#dialog [name="note"]').fill(note);
      await page.locator('#dialog [name="newTag"]').fill("Personal");
      await page.locator('#dialog button[type="submit"]').click();
      await page.locator("#dialog").waitFor({ state: "hidden" });
    }
    await transaction("Trabajo", "Banco", "1000,10");
    await transaction("Banco", "Efectivo", "100");
    await transaction(
      "Efectivo",
      "Comida",
      "25,50",
      '<script>alert("x")</script> almuerzo',
    );
    assert.match(await card("Banco").innerText(), /900,10/);
    assert.match(await card("Efectivo").innerText(), /74,50/);
    await page.getByRole("button", { name: "Límites", exact: true }).click();
    await page
      .getByRole("button", { name: "Editar límite de este mes" })
      .click();
    await page.locator('#dialog [name="limit"]').fill("200");
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    assert.match(await page.locator(".budget-card").innerText(), /174,50/);
    await page.getByRole("button", { name: "Mes siguiente" }).click();
    assert.match(await page.locator(".budget-card").innerText(), /Sin límite/);
    await page
      .getByRole("button", { name: "Mes anterior", exact: true })
      .click();
    assert.match(await page.locator(".budget-card").innerText(), /174,50/);
    await page.getByRole("button", { name: "Historial", exact: true }).click();
    assert.equal(await page.locator(".transaction").count(), 3);
    await page.locator("#f-text").fill("almuerzo");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    assert.equal(await page.locator(".transaction").count(), 1);
    await page.locator('[data-action="edit-transaction"]').click();
    await page.locator('#dialog [name="amount"]').fill("30");
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    assert.match(await page.locator(".transaction-end").innerText(), /30,00/);
    await page.locator('[data-action="delete-transaction"]').click();
    await page.getByText("No hay movimientos con estos filtros.").waitFor();
    await page.locator('#toast [data-action="undo"]').click();
    await page.locator(".transaction").waitFor();
    await page.getByRole("button", { name: "Ver todo" }).click();
    await page.getByRole("button", { name: "Reportes", exact: true }).click();
    assert.equal(await page.locator(".timeline-month").count(), 12);
    assert.match(await page.locator(".stats").innerText(), /1000,10|1\.000,10/);
    assert.match(await page.locator(".stats").innerText(), /30,00/);
    await page.getByRole("button", { name: "Datos", exact: true }).click();
    const downloadWait = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Descargar respaldo JSON", exact: true })
      .click();
    const download = await downloadWait;
    const json = fs.readFileSync(await download.path(), "utf8");
    const exported = A.restore(json);
    assert.equal(exported.transactions.length, 3);
    assert.equal(exported.transactions[2].amount_cents, 3000);
    await page.locator("#json-file").setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(json),
    });
    await page.locator('#dialog [name="confirm"]').check();
    await page.getByRole("button", { name: "Importar y reemplazar" }).click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    assert.match(await card("Efectivo").innerText(), /70,00/);
    // A stale tab cannot overwrite a newer complete snapshot.
    const stale = await context.newPage();
    await stale.goto(base);
    await stale.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    await add("categories", "Transporte");
    await stale
      .locator('[data-action="add"][data-key="categories"]')
      .first()
      .click();
    await stale.locator('#dialog [name="name"]').fill("No debe guardarse");
    await stale.locator('#dialog button[type="submit"]').click();
    await stale
      .getByText("Otra pestaña cambió tus datos. Recarga antes de guardar.")
      .waitFor();
    await stale.close();
    await page.getByRole("button", { name: "Datos", exact: true }).click();
    await page.locator("#import-month").fill("2026-01");
    await page
      .locator("#csv-file")
      .setInputFiles(path.join(__dirname, "fixtures/coinkeeper.csv"));
    await page.getByRole("heading", { name: "Revisar importación" }).waitFor();
    assert.match(
      await page.locator(".import-summary").innerText(),
      /Movimientos aceptados\s+4/,
    );
    await page.locator('#dialog [name="confirm"]').check();
    await page.getByRole("button", { name: "Importar y reemplazar" }).click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    await page
      .getByRole("heading", { name: "Revisión de importación · 1" })
      .waitFor();
    await page.getByRole("button", { name: "Inicio", exact: true }).click();
    await page.locator("#month").fill("2026-01");
    assert.match(await card("Banco").innerText(), /1\.850,00|1850,00/);
    // Actual touch events on the grip exercise pointer capture and iPhone drag/drop.
    await card("Banco").scrollIntoViewIfNeeded();
    const grip = await card("Banco").locator(".drag-grip").boundingBox();
    const target = await card("Efectivo").boundingBox();
    const cdp = await context.newCDPSession(page);
    const point = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    await page.waitForTimeout(320);
    for (let i = 1; i <= 6; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: point.x + ((target.x + target.width / 2 - point.x) * i) / 6,
            y: point.y + ((target.y + target.height / 2 - point.y) * i) / 6,
          },
        ],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.getByRole("heading", { name: "Nuevo movimiento" }).waitFor();
    assert.equal(
      await page.locator('#dialog [name="to"] option:checked').innerText(),
      "Efectivo",
    );
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    // Real HTML drag/drop opens a preselected form; cancellation leaves balances intact.
    await card("Banco").dragTo(card("Comida"));
    await page.getByRole("heading", { name: "Nuevo movimiento" }).waitFor();
    assert.equal(
      await page.locator('#dialog [name="from"] option:checked').innerText(),
      "Banco",
    );
    assert.equal(
      await page.locator('#dialog [name="to"] option:checked').innerText(),
      "Comida",
    );
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "No horizontal overflow on iPhone",
    );
    await page.screenshot({ path: "/tmp/gastalo-mobile.png", fullPage: true });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    await context.setOffline(true);
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    assert.match(await card("Efectivo").innerText(), /174,50/);
    await transaction("Efectivo", "Comida", "1.01", "Sin conexión");
    assert.match(await card("Efectivo").innerText(), /173,49/);
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    assert.match(await card("Efectivo").innerText(), /173,49/);
    await context.setOffline(false);
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const dp = await desktop.newPage();
    await dp.goto(base);
    await dp.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    await dp.getByRole("button", { name: "Datos", exact: true }).click();
    await dp.locator("#import-month").fill("2026-01");
    await dp
      .locator("#csv-file")
      .setInputFiles(path.join(__dirname, "fixtures/coinkeeper.csv"));
    await dp.locator('#dialog [name="confirm"]').check();
    await dp.getByRole("button", { name: "Importar y reemplazar" }).click();
    await dp.locator("#dialog").waitFor({ state: "hidden" });
    await dp.getByRole("button", { name: "Inicio", exact: true }).click();
    await dp.locator("#month").fill("2026-01");
    await dp.screenshot({ path: "/tmp/gastalo-desktop.png", fullPage: true });
    assert.equal(
      await dp.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: mobile CRUD, tap/drag, budgets, filters, reports, JSON/CSV, reload, concurrent tabs, offline persistence, desktop layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
