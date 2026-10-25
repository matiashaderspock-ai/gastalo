const { chromium, devices } = require("playwright");
const { openMovementFromMenu } = require("./browser-helpers.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const base = process.env.GASTALO_URL || "http://127.0.0.1:4173/";
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  let page;
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"], locale: "en-US", acceptDownloads: true });
    page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.setFixedTime(new Date("2026-10-24T18:07:09Z"));
    await page.goto(base);
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"), "2026-01");
    const [bank, cash] = state.accounts, source = state.sources[0], category = state.categories[0];
    await page.evaluate(data => new Promise(resolve => {
      const request = indexedDB.open("gastalo");
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put({ data, revision: 1 }, "main");
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    }), state);
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    async function go(name) {
      await page.locator("#app-menu > summary").click();
      await page.getByRole("button", { name, exact: true }).click();
    }
    const readState = () => page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open("gastalo");
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("state");
        tx.objectStore("state").get("main").onsuccess = e => resolve(e.target.result.data);
        tx.oncomplete = () => db.close();
      };
    }));
    const display = selector => page.locator(selector).locator("..").locator(".date-value").innerText();
    async function save() {
      await page.locator('#dialog button[type="submit"]').click();
      await page.locator("#dialog").waitFor({ state: "hidden" });
    }
    async function create(from, to, amount, date, time) {
      await openMovementFromMenu(page);
      await page.locator('[name="from"]').selectOption(from);
      await page.locator('[name="to"]').selectOption(to);
      await page.locator('[name="amount"]').fill(amount);
      assert.equal(await page.locator('.movement-timestamp').isVisible(), false, "Event metadata stays inside collapsed Nota");
      if (!await page.locator('.movement-extras').evaluate(e => e.open)) await page.locator('.movement-extras > summary').click();
      assert.match(await page.locator('.movement-timestamp').innerText(), /24\/10\/26/, "App dates stay D/M/Y even in an English browser");
      assert.equal(await page.locator('[name="date"]').getAttribute('type'), 'hidden');
      assert.equal(await page.locator('[name="time"]').getAttribute('type'), 'hidden');
      await save();
      if (date || time) {
        const record = (await readState()).transactions.find(t => t.amount_cents === A.cents(amount));
        await go('Historial');
        await page.locator(`[data-action="edit-transaction"][data-id="${record.id}"]`).click();
        if (!await page.locator('.movement-extras').evaluate(e => e.open)) await page.locator('.movement-extras > summary').click();
        if (date) await page.locator('[name="date"]').fill(date);
        if (time) await page.locator('[name="time"]').fill(time);
        await save();
      }
    }
    await openMovementFromMenu(page);
    assert.equal(await page.locator('[name="time"]').inputValue(), "14:07:09");
    if (!await page.locator('.movement-extras').evaluate(e => e.open)) await page.locator('.movement-extras > summary').click();
    assert.equal(await page.locator('.movement-timestamp').innerText(), "24/10/26 · 14:07");
    assert.match(await page.locator("#movement-timezone").innerText(), /America\/La_Paz/);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await create(source.id, bank.id, "12.34");
    await create(bank.id, category.id, "2.01", "2026-10-23", "10:05");
    await go("Importar/Exportar");
    await page.locator("#timezone").fill("UTC");
    await page.getByRole("button", { name: "Guardar zona horaria", exact: true }).click();
    await create(bank.id, cash.id, "5.67");
    let saved = await readState();
    const income = saved.transactions.find(t => t.amount_cents === 1234);
    const expense = saved.transactions.find(t => t.amount_cents === 201);
    const transfer = saved.transactions.find(t => t.amount_cents === 567);
    assert.equal(income.occurred_time, "14:07:09");
    assert.equal(income.occurred_timezone, "America/La_Paz");
    assert.equal(expense.occurred_on, "2026-10-23");
    assert.equal(expense.occurred_time, "10:05:00");
    assert.equal(transfer.occurred_time, "18:07:09");
    assert.equal(transfer.occurred_timezone, "UTC");
    await page.clock.setFixedTime(new Date("2026-10-25T20:00:00Z"));
    await go("Historial");
    await page.locator(`[data-action="edit-transaction"][data-id="${income.id}"]`).click();
    if (!await page.locator('.movement-extras').evaluate(e => e.open)) await page.locator('.movement-extras > summary').click();
    assert.equal(await page.locator('[name="time"]').inputValue(), "14:07:09");
    assert.equal(await display('[name="date"]'), "24/10/26");
    assert.match(await page.locator("#movement-timezone").innerText(), /America\/La_Paz/);
    await page.locator('[name="amount"]').fill("12.35");
    await save();
    saved = await readState();
    const edited = saved.transactions.find(t => t.id === income.id);
    assert.equal(edited.occurred_time, income.occurred_time);
    assert.equal(edited.occurred_timezone, income.occurred_timezone);
    assert.equal(edited.created_at, income.created_at);
    assert.equal(edited.updated_at, "2026-10-25T20:00:00.000Z");
    await page.locator(`[data-action="edit-transaction"][data-id="${state.transactions[0].id}"]`).click();
    if (!await page.locator('.movement-extras').evaluate(e => e.open)) await page.locator('.movement-extras > summary').click();
    assert.equal(await page.locator('[name="time"]').inputValue(), "", "Legacy event time is never inferred from import time");
    assert.match(await page.locator("#movement-timezone").innerText(), /Hora anterior no registrada/);
    await save();
    saved = await readState();
    assert.equal(saved.transactions.find(t => t.id === state.transactions[0].id).occurred_time, null);
    for (const text of await page.locator(".transaction-info > span").allTextContents()) {
      assert.match(text, /^\d{2}\/\d{2}\/\d{2}(?: · \d{2}:\d{2})? · /);
      assert.doesNotMatch(text, /2026-/);
    }
    if (!await page.locator(".filters").evaluate(e => e.open)) await page.locator(".filters > summary").click();
    await page.locator("#f-start").fill("2026-10-01");
    await page.locator("#f-end").fill("2026-10-31");
    assert.equal(await display("#f-start"), "01/10/26");
    assert.equal(await display("#f-end"), "31/10/26");
    await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    assert.equal(await page.locator(".transaction").count(), 3);
    await page.getByRole("button", { name: "Ver todo", exact: true }).click();
    assert.equal(await display("#f-start"), "DD/MM/AA");
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await openMovementFromMenu(page);
      assert.equal(await page.locator('.movement-timestamp').isVisible(), false);
      const card = await page.locator('#dialog').boundingBox();
      assert.ok(card.height < 400, 'Collapsed new movement fits on a compact card');
      const heading = await page.locator('#dialog-title').boundingBox();
      assert.ok(heading.width <= 1 && heading.height <= 1, 'New movement title is only an accessible name');
      if (!await page.locator('.movement-extras').evaluate(e => e.open)) await page.locator('.movement-extras > summary').click();
      assert.match(await page.locator('.movement-timestamp').innerText(), /25\/10\/26/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width === 390) await page.screenshot({ path: "/tmp/gastalo-datetime-form.png" });
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    }
    await go("Inicio");
    await page.locator(`[data-entity="${category.id}"]`).click();
    assert.equal(await page.locator('#app-menu').isVisible(), false, 'Category header has no menu');
    assert.equal(await page.locator('[data-action="back-home"]').isVisible(), true);
    assert.equal(await page.locator('.detail-toolbar [data-action="edit-entity"]').isVisible(), true);
    const back = await page.locator('[data-action="back-home"]').boundingBox();
    const header = await page.locator('.app-header').boundingBox();
    assert.ok(back.x - header.x < 35, 'Back arrow uses the space previously reserved for the menu');
    await page.getByRole('button', { name: 'Volver a Inicio', exact: true }).click();
    assert.equal(await page.locator('#app-menu').isVisible(), true, 'Returning home restores navigation');
    await page.locator(`[data-entity="${bank.id}"]`).click();
    for (const text of await page.locator(".history-day h3").allTextContents()) assert.match(text, /^\d{2}\/\d{2}\/\d{2}$/);
    await page.locator(".chart-data > summary").click();
    for (const text of await page.locator(".chart-data tbody td:first-child").allTextContents()) assert.match(text, /^\d{2}\/\d{2}$/);
    await page.getByRole("button", { name: "Volver a Inicio", exact: true }).click();
    await go("Límites de categoría");
    assert.equal(await page.locator(".month-picker > span").innerText(), "10/26");
    await page.getByRole("button", { name: "Mes siguiente", exact: true }).click();
    assert.equal(await page.locator(".month-picker > span").innerText(), "11/26");
    await page.getByRole("button", { name: "Mes anterior", exact: true }).click();
    await go("Gráficos");
    for (const text of await page.locator(".table-scroll").last().locator("tbody td:first-child").allTextContents()) assert.match(text, /^\d{2}\/\d{2}$/);
    await go("Importar/Exportar");
    await page.locator("#csv-file").setInputFiles(__dirname + "/fixtures/coinkeeper.csv");
    const period = await page.locator(".import-summary").innerText();
    assert.match(period, /05\/01\/26/);
    assert.match(period, /01\/02\/26/);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar respaldo JSON", exact: true }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "gastalo-25-10-26.json");
    const payload = fs.readFileSync(await download.path(), "utf8");
    assert.deepEqual(A.restore(payload), await readState());
    assert.match(JSON.parse(payload).exported_at, /^2026-/);
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    assert.equal((await readState()).transactions.find(t => t.id === income.id).occurred_time, "14:07:09");
    assert.deepEqual(errors, []);
    console.log("PASS: local event hours for income/expense/transfers, timezone changes, editing without overwriting original time, legacy unknown time, DD/MM/YY across forms/filters/history/imports, MM/YY tables/pickers, JSON and reload at 320/390/1280px.");
  } catch (error) {
    if (page) await page.screenshot({ path: "/tmp/gastalo-datetime-error.png", fullPage: true });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
