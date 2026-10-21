const { setHomeMonth } = require("./browser-helpers.cjs");
/* Focused touch/browser regression. Uses the same Playwright setup as browser-smoke.cjs. */
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
  let page;
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"], locale: "es-BO" });
    page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(base);
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8"),
      "2026-01", "swipe-browser", "2026-02-02T00:00:00Z");
    const expense = state.transactions.find(t => t.kind === "expense");
    state.transactions = [ ...state.transactions.filter(t => t.kind !== "expense"),
      ...Array.from({length:32}, (_, i) => ({ ...expense, id:`swipe-${i}`, amount_cents:1000,
        occurred_on:"2026-01-17", note:`Movimiento ${i + 1}`, tag_ids:[] })) ];
    A.validateState(state);
    const incomeId = state.transactions[0].id, transferId = state.transactions[1].id;
    await page.evaluate(async data => new Promise((resolve, reject) => {
      const r = indexedDB.open("gastalo");
      r.onsuccess = () => {
        const db = r.result, tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put({data, revision:1}, "main");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      r.onerror = () => reject(r.error);
    }), state);
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    await setHomeMonth(page, "2026-01");
    assert.equal(await page.locator(".home-toolbar, #main #month").count(), 0);
    const cdp = await context.newCDPSession(page);
    const row = id => page.locator(`[data-swipe-transaction="${id}"]`);
    const count = () => page.locator(".entity-history .transaction").count();
    async function swipe(id, dx, dy = 0, cancel = false) {
      const target = row(id);
      await target.scrollIntoViewIfNeeded();
      const box = await target.locator(".transaction").boundingBox();
      const point = {x:box.x + box.width - 24, y:box.y + 28};
      await cdp.send("Input.dispatchTouchEvent", {type:"touchStart", touchPoints:[point]});
      for (let i = 1; i <= 3; i++)
        await cdp.send("Input.dispatchTouchEvent", {type:"touchMove", touchPoints:[{
          x:point.x + dx * i / 3, y:point.y + dy * i / 3,
        }]});
      await cdp.send("Input.dispatchTouchEvent", {type:cancel ? "touchCancel" : "touchEnd", touchPoints:[]});
    }
    async function undo(id) {
      await page.locator('#toast [data-action="undo"]').tap();
      await row(id).waitFor();
    }
    async function open(name) {
      await page.getByRole("button", {name:`Ver historial de ${name}`, exact:true}).tap();
      await page.locator(".app-header .detail-toolbar h1").waitFor();
      assert.equal(await page.locator(".app-header .detail-toolbar h1").innerText(), name);
      const movement = await page.locator('.detail-period [data-action="entity-movement"]').boundingBox();
      assert.ok(movement.x < (await page.locator(".detail-period .compact-month").boundingBox()).x);
    }
    const back = () => page.getByRole("button", {name:"Volver a Inicio", exact:true}).tap();
    await open("Comida");
    assert.equal(await count(), 32);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight - 500));
    assert.ok(await page.evaluate(() => scrollY) > 1000);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const titleBox = await page.locator(".detail-toolbar h1").boundingBox();
    const backBox = await page.getByRole("button", {name:"Volver a Inicio", exact:true}).boundingBox();
    assert.ok(titleBox.y >= 0 && titleBox.y < 80 && backBox.y >= 0 && backBox.y < 80);
    assert.equal(await page.evaluate(({x,y}) => !!document.elementFromPoint(x,y)?.closest('.app-header'), {
      x:titleBox.x + 10, y:titleBox.y + titleBox.height / 2,
    }), true, "Sticky title remains above the scrolled history");
    await page.screenshot({path:"/tmp/gastalo-v15-sticky-header.png"});
    await swipe("swipe-0", -20);
    assert.equal(await row("swipe-0").evaluate(e => e.classList.contains("is-revealed")), false);
    assert.equal(await count(), 32);
    await swipe("swipe-0", -70);
    await row("swipe-0").locator(".transaction-swipe-delete").waitFor({state:"visible"});
    assert.equal(await count(), 32, "Partial swipe only reveals delete");
    assert.equal(await row("swipe-0").locator(".transaction-swipe-delete").getAttribute("aria-hidden"), "false");
    await page.waitForFunction(() => {
      const front = document.querySelector('[data-swipe-transaction="swipe-0"] .transaction');
      return Math.abs(new DOMMatrix(getComputedStyle(front).transform).m41 + 84) < 1;
    });
    await page.screenshot({path:"/tmp/gastalo-v15-swipe-delete.png"});
    // Swipe back to close without deleting.
    await swipe("swipe-0", 90);
    assert.equal(await row("swipe-0").locator(".transaction-swipe-delete").isVisible(), false);
    assert.equal(await count(), 32);
    await swipe("swipe-0", -70);
    await row("swipe-0").locator(".transaction-swipe-delete").tap();
    await row("swipe-0").waitFor({state:"detached"});
    assert.equal(await count(), 31);
    assert.match(await page.locator(".detail-totals").innerText(), /310,00/);
    await undo("swipe-0");
    assert.equal(await count(), 32);
    const width = (await row("swipe-0").boundingBox()).width;
    await swipe("swipe-0", -width * 0.8);
    await row("swipe-0").waitFor({state:"detached"});
    assert.equal(await count(), 31, "Full swipe deletes exactly one transaction");
    await undo("swipe-0");
    await swipe("swipe-0", -80, 0, true);
    assert.equal(await count(), 32);
    assert.equal(await row("swipe-0").evaluate(e => e.classList.contains("is-revealed")), false);
    await row("swipe-0").scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);
    await swipe("swipe-0", 0, -120);
    assert.ok(await page.evaluate(() => scrollY) > before + 30, "Vertical row gesture scrolls normally");
    assert.equal(await count(), 32);
    await swipe("swipe-0", -70);
    await page.locator(".detail-toolbar h1").tap();
    assert.equal(await row("swipe-0").evaluate(e => e.classList.contains("is-revealed")), false);
    await back();
    await open("Trabajo");
    await swipe(incomeId, -width * 0.8);
    await page.getByText("No hay movimientos en este período.", {exact:true}).waitFor();
    assert.equal(await count(), 0);
    await undo(incomeId);
    assert.equal(await count(), 1);
    await back();
    await open("Banco");
    await swipe(transferId, -70);
    await row(transferId).locator(".transaction-swipe-delete").tap();
    await row(transferId).waitFor({state:"detached"});
    assert.equal(await count(), 1);
    assert.match(await page.locator(".detail-totals").innerText(), /2\.000,00/);
    await undo(transferId);
    assert.equal(await count(), 2);
    assert.match(await page.locator(".detail-totals").innerText(), /1\.900,00/);
    assert.deepEqual(errors, []);
    console.log("PASS: sticky entity header, swapped month/movement controls, partial/full/right/cancelled transaction swipes, native vertical scrolling, income/expense/transfer deletion and Undo.");
  } catch (error) {
    if (page) {
      await page.screenshot({path:"/tmp/gastalo-v15-swipe-error.png"});
    }
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
