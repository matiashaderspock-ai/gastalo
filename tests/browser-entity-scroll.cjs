/* Scroll-position regressions with real IndexedDB and iPhone-size Chromium. */
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const base = process.env.GASTALO_URL || "http://127.0.0.1:4173/";
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  let page;
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"], locale: "es-BO" });
    page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base);
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"), "2026-01");
    for (const [key, count] of [["sources", 16], ["accounts", 16], ["categories", 40]]) {
      while (state[key].length < count) {
        const index = state[key].length;
        state[key].push({ ...state[key][0], id: `${key}-${index}`, name: `${key} ${index}` });
      }
    }
    A.validateState(state);
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
    const cdp = await context.newCDPSession(page);
    const mark = await page.locator(".entity-mark").first().boundingBox();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: mark.x + mark.width / 2, y: mark.y + mark.height / 2 }] });
    await page.locator("#entity-edit-bar").waitFor();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.locator(".drag-clone").waitFor({ state: "detached" });
    const card = id => page.locator(`[data-entity="${id}"]`);
    const tool = (id, action) => page.locator(`[data-action="${action}"][data-id="${id}"]`).first();
    const position = () => page.evaluate(() => ({ x: [...document.querySelectorAll(".entity-strip")].map(e => e.scrollLeft), y: scrollY }));
    async function checkPosition(before, message) {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const actual = await position();
      const bounds = await page.evaluate(() => ({ x: [...document.querySelectorAll(".entity-strip")].map(e => e.scrollWidth - e.clientWidth), y: document.documentElement.scrollHeight - innerHeight }));
      for (let i = 0; i < before.x.length; i++)
        assert.ok(Math.abs(actual.x[i] - Math.min(before.x[i], bounds.x[i])) <= 2, `${message}: row ${i} jumped from ${before.x[i]} to ${actual.x[i]}`);
      // The Undo control can change the footer height; allow that small layout adjustment.
      assert.ok(Math.abs(actual.y - Math.min(before.y, bounds.y)) <= 32, `${message}: page jumped from ${before.y} to ${actual.y} (max ${bounds.y})`);
    }
    async function submit() {
      await page.locator('#dialog button[type="submit"]').click();
      await page.locator("#dialog").waitFor({ state: "hidden" });
    }
    async function remove(id, erase) {
      await tool(id, "remove-entity").click();
      if (erase) {
        await page.locator('[name="removal"][value="erase"]').check();
        await page.locator('[name="confirmErase"]').check();
      }
      await submit();
    }
    for (const [key, index] of [["sources", 11], ["accounts", 11], ["categories", 35]]) {
      // Keep both horizontal rows away from their first four columns.
      await page.locator(".row-0 .entity-strip").evaluate(e => { e.scrollLeft = 650; });
      await page.locator(".row-1 .entity-strip").evaluate(e => { e.scrollLeft = 750; });
      const id = `${key}-${index}`;
      await card(id).scrollIntoViewIfNeeded();
      let before = await position();
      await tool(id, "edit-entity").click();
      await page.locator('#dialog [name="name"]').fill(`${key} edited`);
      await submit();
      await checkPosition(before, `${key} edit`);
      assert.equal(await card(id).locator(".entity-name").innerText(), `${key} edited`);
      before = await position();
      await tool(id, "edit-entity").click();
      await page.locator('#dialog [data-action="close"]').first().click();
      await checkPosition(before, `${key} cancel`);
      before = await position();
      await remove(id, false);
      await checkPosition(before, `${key} archive`);
      assert.equal(await card(id).count(), 0);
      await page.locator('#toast [data-action="undo"]').click();
      await card(id).waitFor();
      await checkPosition(before, `${key} undo`);
      before = await position();
      await remove(id, true);
      await checkPosition(before, `${key} permanent erase`);
      assert.equal(await card(id).count(), 0);
    }
    // Removing the final account clamps to the new end, rather than returning to zero.
    await page.locator(".row-1 .entity-strip").evaluate(e => { e.scrollLeft = e.scrollWidth; });
    await card("accounts-15").scrollIntoViewIfNeeded();
    const atEnd = await position();
    await remove("accounts-15", true);
    await checkPosition(atEnd, "erase final account");
    assert.ok((await position()).x[1] > 600);
    // Opening an entity and returning also retains both horizontal positions.
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await card("accounts-14").scrollIntoViewIfNeeded();
    const beforeDetail = await position();
    await card("accounts-14").click();
    await page.getByRole("button", { name: "Volver a Inicio", exact: true }).click();
    await checkPosition(beforeDetail, "return from detail");
    assert.deepEqual(errors, []);
    console.log("PASS: source/account off-screen edit, cancel, archive, Undo, permanent erase, final-column clamping, category page position and return from detail.");
  } catch (error) {
    if (page) await page.screenshot({ path: "/tmp/gastalo-entity-scroll-error.png", fullPage: true });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
