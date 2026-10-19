/* Real touch reorder and month-arrow regressions. Uses the README Playwright setup. */
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
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(base);
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"), "2026-01");
    for (const [key, count] of [["sources", 8], ["accounts", 9], ["categories", 24]]) {
      while (state[key].length < count) {
        const index = state[key].length;
        state[key].push({ ...state[key][0], id: `${key}-${index}`, name: `${key} ${index}` });
      }
    }
    state.categories.splice(2, 0, { ...state.categories[0], id: "archived-category", name: "Archived", archived_at: "2026-01-01T00:00:00Z" });
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
    const card = id => page.locator(`[data-entity="${id}"]`);
    const ids = key => page.locator(`[data-key="${key}"][data-entity]`).evaluateAll(es => es.map(e => e.dataset.entity));
    const saved = () => page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open("gastalo");
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("state");
        tx.objectStore("state").get("main").onsuccess = e => resolve(e.target.result);
        tx.oncomplete = () => db.close();
      };
    }));
    const point = async id => {
      const box = await card(id).locator(".entity-mark").boundingBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const start = p => cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [p] });
    const end = (cancel = false) => cdp.send("Input.dispatchTouchEvent", { type: cancel ? "touchCancel" : "touchEnd", touchPoints: [] });
    async function move(from, to) {
      for (let i = 1; i <= 10; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + (to.x - from.x) * i / 10, y: from.y + (to.y - from.y) * i / 10 }] });
        await page.waitForTimeout(18);
      }
    }
    async function settled() {
      await page.locator(".drag-clone").waitFor({ state: "detached" });
      await page.waitForTimeout(80);
      assert.equal(await page.locator('#dialog').isVisible(), false, "Reordering does not open a movement");
    }
    const sourceIds = await ids("sources");
    const origin = await point(sourceIds[2]);
    await start(origin);
    await page.locator("#entity-edit-bar").waitFor();
    await move(origin, await point(sourceIds[0]));
    await end();
    await settled();
    assert.deepEqual(await ids("sources"), [sourceIds[2], sourceIds[0], sourceIds[1], ...sourceIds.slice(3)]);
    assert.equal((await saved()).data.sources[0].id, sourceIds[2]);
    assert.equal(await page.locator("#entity-edit-bar").isVisible(), true);
    // Undo restores the stored order, then a mouse-style keyboard move persists it again.
    await page.locator('#toast [data-action="undo"]').click();
    await page.waitForFunction(id => document.querySelector('.row-0 [data-entity]').dataset.entity === id, sourceIds[0]);
    assert.deepEqual(await ids("sources"), sourceIds);
    await card(sourceIds[2]).focus();
    await page.keyboard.press("Alt+ArrowLeft");
    await page.waitForFunction(id => document.querySelectorAll('.row-0 [data-entity]')[1].dataset.entity === id, sourceIds[2]);
    const accountIds = await ids("accounts");
    await start(await point(accountIds[2]));
    await move(await point(accountIds[2]), await point(accountIds[0]));
    await end();
    await settled();
    assert.equal((await ids("accounts"))[0], accountIds[2]);
    const categoryIds = await ids("categories");
    await card(categoryIds[5]).scrollIntoViewIfNeeded();
    await start(await point(categoryIds[5]));
    await move(await point(categoryIds[5]), await point(categoryIds[0]));
    await end();
    await settled();
    assert.equal((await ids("categories"))[0], categoryIds[5], "Categories move between rows and columns");
    assert.equal((await saved()).data.categories[2].id, "archived-category");
    // Cancel and cross-group drops restore all previewed slots without a write.
    let before = await saved();
    let current = await ids("categories");
    await start(await point(current[2]));
    await move(await point(current[2]), await point(current[0]));
    await end(true);
    await settled();
    assert.deepEqual(await saved(), before);
    await start(await point(current[2]));
    await move(await point(current[2]), await point(current[0]));
    await page.keyboard.press("Escape");
    await end();
    await settled();
    assert.deepEqual(await saved(), before);
    assert.equal(await page.locator("#entity-edit-bar").isVisible(), false);
    // Enter edit mode again before testing cross-group and edge drops.
    await start(await point(current[0]));
    await page.locator("#entity-edit-bar").waitFor();
    await end();
    await page.evaluate(() => scrollTo(0, 0));
    current = await ids("accounts");
    await start(await point(current[0]));
    await move(await point(current[0]), await point((await ids("sources"))[0]));
    await end();
    await settled();
    assert.deepEqual(await saved(), before);
    // Holding near an overflowing row's edge discovers further reorder slots.
    const strip = page.locator(".row-1 .entity-strip");
    const box = await strip.boundingBox(), from = await point(current[0]);
    await start(from);
    await move(from, { x: box.x + box.width - 8, y: from.y });
    await page.waitForFunction(() => document.querySelector(".row-1 .entity-strip").scrollLeft > 100);
    await end();
    await settled();
    assert.ok(await strip.evaluate(e => e.scrollLeft) > 90, "The row keeps its scroll position after saving");
    assert.ok((await ids("accounts")).indexOf(current[0]) > 0);
    // A category can travel toward rows below the current viewport.
    current = await ids("categories");
    await card(current[0]).scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => scrollY), initial = await point(current[0]);
    await start(initial);
    await move(initial, { x: initial.x, y: 824 });
    await page.waitForFunction(before => scrollY > before + 50, scrollBefore);
    await end();
    await settled();
    const reordered = (await saved()).data;
    for (const field of ["transactions", "budgets", "tags", "imports", "profile", "review"])
      assert.deepEqual(reordered[field], state[field]);
    assert.deepEqual(A.balances(reordered), A.balances(state));
    assert.deepEqual(A.restore(A.backup(reordered)), reordered);
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    for (const key of ["sources", "accounts", "categories"])
      assert.deepEqual(await ids(key), reordered[key].filter(e => !e.archived_at).map(e => e.id));
    // Arrow taps must never hit the native calendar, even if Safari gives it excess intrinsic width.
    await page.evaluate(() => {
      window.__pickerCalls = 0;
      HTMLInputElement.prototype.showPicker = function () { window.__pickerCalls++; };
    });
    async function go(view) {
      await page.locator("#app-menu > summary").click();
      await page.getByRole("button", { name: view, exact: true }).click();
    }
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const view of ["Inicio", "Límites de categoría", "Gráficos"]) {
        await go(view);
        await page.locator("#month").fill("2026-12");
        for (const action of ["next", "prev"]) {
          await page.locator("#month").evaluate(input => { input.style.minWidth = "180px"; });
          const button = page.locator(`.month-nav [data-action="${action}"]`);
          assert.ok(await button.evaluate(element => {
            const rect = element.getBoundingClientRect();
            return [0.2, 0.5, 0.8].every(offset => document.elementFromPoint(rect.x + rect.width * offset, rect.y + rect.height / 2)?.closest("button") === element);
          }), "Calendar hit area is clipped away from the arrows");
          await button.tap();
          assert.equal(await page.locator("#month").inputValue(), action === "next" ? "2027-01" : "2026-12");
        }
      }
    }
    assert.equal(await page.evaluate(() => window.__pickerCalls), 0);
    await page.locator(".month-picker input").tap();
    assert.equal(await page.evaluate(() => window.__pickerCalls), 1);
    await page.keyboard.press("Escape");
    await go("Inicio");
    await card(reordered.accounts.find(e => !e.archived_at).id).click();
    await page.locator("#month").fill("2026-12");
    await page.getByRole("button", { name: "Mes siguiente", exact: true }).tap();
    assert.equal(await page.locator("#month").inputValue(), "2027-01");
    await page.getByRole("button", { name: "Mes anterior", exact: true }).tap();
    assert.equal(await page.locator("#month").inputValue(), "2026-12");
    assert.equal(await page.evaluate(() => window.__pickerCalls), 1);
    assert.deepEqual(errors, []);
    console.log("PASS: long-press then reorder, all groups, rows/columns, Undo, keyboard, cancel/cross-group drops, horizontal/vertical edge scrolling, financial invariants, persistence/JSON, and month arrow/calendar hit areas at 320/390/1280px.");
  } catch (error) {
    if (page) await page.screenshot({ path: "/tmp/gastalo-reorder-error.png", fullPage: true });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
