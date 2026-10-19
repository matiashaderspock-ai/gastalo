const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const base = process.env.GASTALO_URL || "http://127.0.0.1:4173/";
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"], locale: "es-BO" });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base);
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"));
    const sample = state.transactions.find(t => t.kind === "expense");
    const names = ["Supermercado", "Transporte", "Salidas", "Hogar", "Café", "Libros", "Mascotas", "Regalos"];
    const amounts = [4500, 2200, 1500, 800, 400, 300, 200, 100];
    state.categories = names.map((name, i) => ({ id: `pie-category-${i}`, name, currency: "BOB", archived_at: null }));
    state.budgets = [];
    state.transactions = state.categories.map((category, i) => ({ ...sample, id: `pie-transaction-${i}`, to_id: category.id,
      occurred_on: "2026-01-08", amount_cents: amounts[i], note: "", tag_ids: [] }));
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
    await page.locator("#month").fill("2026-01");
    async function go(name) {
      await page.locator("#app-menu > summary").click();
      await page.getByRole("button", { name, exact: true }).click();
    }
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const name of ["Historial", "Gráficos"]) {
        await go(name);
        for (const id of ["f-start", "f-end", "f-entities", "f-tags"])
          assert.ok((await page.locator(`#${id}`).boundingBox()).height <= 32.5, `${name}: ${id} is compact`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
      assert.equal(await page.locator(".pie-slice").count(), 8);
      const shares = await page.locator(".pie-slice").evaluateAll(slices => slices.map(e => Number(e.dataset.percent)));
      assert.equal(shares.reduce((a, b) => a + b, 0), 100);
      const direct = await page.locator(".pie-label").allTextContents();
      for (const name of names.slice(0, 4)) assert.ok(direct.some(label => label.includes(name)));
      assert.match(await page.locator(".pie-others h3").innerText(), /Otros\s*· 10.0%/);
      assert.equal(await page.locator(".pie-others li").count(), 4);
      assert.equal(new Set(await page.locator(".pie-slice").evaluateAll(es => es.map(e => e.getAttribute("fill")))).size, 8);
      const pieBox = await page.locator(".expense-pie").boundingBox();
      const detailBox = await page.locator(".distribution").boundingBox();
      assert.ok(pieBox.y + pieBox.height <= detailBox.y, "Pie appears before the item-by-item breakdown");
      if (width === 390) {
        await page.locator(".expense-pie").scrollIntoViewIfNeeded();
        await page.screenshot({ path: "/tmp/gastalo-report-pie.png", fullPage: true });
      }
    }
    await page.locator("#f-entities").selectOption("pie-category-0");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    assert.equal(await page.locator(".pie-slice").count(), 1);
    assert.equal(await page.locator(".pie-slice").getAttribute("data-percent"), "100");
    assert.equal(await page.locator(".pie-others").count(), 0);
    await page.locator("#f-start").fill("2030-01-01");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    assert.equal(await page.locator(".expense-pie").count(), 0);
    assert.deepEqual(errors, []);
    console.log("PASS: compact date/entity/tag filters at 320/390/1280px, all pie shares/colors, major labels, grouped Others, breakdown order, single-category and empty filtered charts.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
