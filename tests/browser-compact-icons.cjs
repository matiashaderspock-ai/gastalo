/* Touch, keyboard and persistence checks for the three-page icon chooser.
   Start the server and use the Playwright setup documented in README.md. */
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const base = process.env.GASTALO_URL || "http://127.0.0.1:4173/";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"], locale: "es-BO" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(base);
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"),
      "2026-01", "compact-icons", "2026-02-02T00:00:00Z");
    state.categories.push({ id: "outings", name: "Salidas", currency: "BOB", archived_at: null });
    A.validateState(state);
    await page.evaluate(data => new Promise((resolve, reject) => {
      const request = indexedDB.open("gastalo");
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put({ data, revision: 1 }, "main");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    }), state);
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    await page.locator("#month").fill("2026-01");
    async function go(name) {
      await page.locator("#app-menu > summary").click();
      await page.getByRole("button", { name, exact: true }).click();
      const title = await page.locator("#main h1").boundingBox();
      const header = await page.locator(".app-header").boundingBox();
      assert.ok(title.y >= header.y + header.height, "Navigation leaves the title below the sticky header");
    }
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const name of ["Historial", "Límites de categoría", "Gráficos", "Importar/Exportar"]) {
        await go(name);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
          `${name} fits at ${width}px`);
        if (name === "Límites de categoría") {
          assert.equal(await page.locator(".page-heading .month-picker").count(), 1);
          const edit = page.getByRole("button", { name: "Editar límite de Salidas" });
          assert.equal(await edit.innerText(), "Editar");
          const heading = await page.locator(".budget-card").filter({ has: edit }).locator("h2").boundingBox();
          const button = await edit.boundingBox();
          assert.ok(button.x > heading.x && Math.abs(heading.y + heading.height / 2 - button.y - button.height / 2) < 1);
        }
        if (width === 390) await page.screenshot({ path: `/tmp/gastalo-compact-${name}.png`, fullPage: true });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await go("Límites de categoría");
    await page.getByRole("button", { name: "Editar límite de Salidas" }).click();
    await page.locator('#dialog [name="limit"]').fill("300");
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    assert.match(await page.locator(".budget-card").filter({ hasText: "Salidas" }).innerText(), /300,00/);
    await page.getByRole("button", { name: "Mes siguiente" }).click();
    assert.match(await page.locator(".budget-card").filter({ hasText: "Salidas" }).innerText(), /300,00/);
    await go("Importar/Exportar");
    await page.locator('.manage-row').filter({ hasText: "Salidas" }).locator('button').evaluate(button => {
      button.closest("details").open = true;
    });
    await page.locator('.manage-row').filter({ hasText: "Salidas" }).getByRole("button", { name: "Editar" }).click();
    const toggle = page.locator('[data-action="toggle-icons"]');
    await toggle.click();
    assert.equal(await page.locator(".icon-page").count(), 3);
    for (const [i, group] of (await page.locator(".icon-page").all()).entries())
      assert.equal(await group.locator('[data-action="select-icon"]').count(), A.ENTITY_ICON_PAGES[i].length);
    const pages = page.locator(".icon-pages");
    const cdp = await context.newCDPSession(page);
    async function swipe(dx) {
      const box = await pages.boundingBox();
      const start = { x: box.x + (dx < 0 ? box.width - 15 : 15), y: box.y + 24 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      for (let i = 1; i <= 8; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x + dx * i / 8, y: start.y }] });
        await page.waitForTimeout(20);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    await swipe(-270);
    await page.waitForFunction(() => document.querySelector('[data-action="icon-page"][data-page="1"]').getAttribute("aria-current") === "true");
    assert.equal(await page.locator('#dialog [name="icon"]').inputValue(), "tag", "Swipe does not select an icon");
    await page.screenshot({ path: "/tmp/gastalo-icons-page-2.png" });
    await swipe(-270);
    await page.waitForFunction(() => document.querySelector('[data-action="icon-page"][data-page="2"]').getAttribute("aria-current") === "true");
    await page.screenshot({ path: "/tmp/gastalo-icons-page-3.png" });
    await swipe(270);
    await page.waitForFunction(() => document.querySelector('[data-action="icon-page"][data-page="1"]').getAttribute("aria-current") === "true");
    await swipe(270);
    await page.waitForFunction(() => document.querySelector('[data-action="icon-page"][data-page="0"]').getAttribute("aria-current") === "true");
    await pages.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator('[data-action="icon-page"][data-page="1"]').getAttribute("aria-current"), "true");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator('[data-action="icon-page"][data-page="2"]').getAttribute("aria-current"), "true");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator('[data-action="icon-page"][data-page="2"]').getAttribute("aria-current"), "true", "ArrowRight stops at the last page");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.locator('[data-action="icon-page"][data-page="1"]').getAttribute("aria-current"), "true");
    await page.keyboard.press("End");
    assert.equal(await page.locator('[data-action="icon-page"][data-page="2"]').getAttribute("aria-current"), "true");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.locator('[data-action="icon-page"][data-page="0"]').getAttribute("aria-current"), "true", "ArrowLeft stops at the first page");
    await page.screenshot({ path: "/tmp/gastalo-icons-page-1.png" });
    await page.getByRole("button", { name: "Página de iconos 3", exact: true }).click();
    await page.getByRole("button", { name: "Taxi", exact: true }).tap();
    assert.equal(await page.locator("#icon-picker").isVisible(), false);
    await toggle.click();
    assert.equal(await page.locator('[data-action="icon-page"][data-page="2"]').getAttribute("aria-current"), "true");
    assert.equal(await page.locator('[data-icon="taxi"]').getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "Página de iconos 1", exact: true }).click();
    await page.getByRole("button", { name: "Inversiones", exact: true }).tap();
    await toggle.click();
    assert.equal(await page.locator('[data-action="icon-page"][data-page="0"]').getAttribute("aria-current"), "true");
    assert.equal(await page.locator('[data-icon="investments"]').getAttribute("aria-pressed"), "true");
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    const saved = await page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open("gastalo");
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("state");
        tx.objectStore("state").get("main").onsuccess = event => resolve(event.target.result.data);
        tx.oncomplete = () => db.close();
      };
    }));
    assert.equal(A.restore(A.backup(saved)).categories.find(c => c.id === "outings").icon, "investments");
    assert.deepEqual(errors, []);
    console.log("PASS: compact pages at 320/390/1280px, inline budget editing, monthly limits, 18+18+15 icons, native swipes across three pages, keyboard/buttons, reopening selection and new-icon persistence through reload/JSON.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
