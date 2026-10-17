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
    // A replacement notice gets its own full lifetime; old timers cannot hide it.
    await page.clock.install();
    await add("sources", "Trabajo");
    assert.ok((await page.locator("#toast").boundingBox()).height <= 44);
    await page.clock.fastForward(2000);
    await add("accounts", "Banco");
    await page.clock.fastForward(1100);
    assert.equal(await page.locator("#toast").isVisible(), true);
    await page.clock.fastForward(2000);
    assert.equal(await page.locator("#toast").isVisible(), false);
    await add("accounts", "Efectivo");
    await page.locator('#toast [data-action="dismiss"]').click();
    assert.equal(await page.locator("#toast").isVisible(), false);
    await add("categories", "Comida");
    const card = (text) =>
      page
        .locator(".entity-card")
        .filter({ has: page.locator(".entity-name", { hasText: text }) });
    async function transaction(from, to, amount, note = "") {
      await page.locator('[data-action="movement"]').first().click();
      const fromId = await card(from).getAttribute("data-entity");
      const toId = await card(to).getAttribute("data-entity");
      await page.locator('#dialog [name="from"]').selectOption(fromId);
      await page.locator('#dialog [name="to"]').selectOption(toId);
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
    assert.equal(
      await page.locator(".entity-edit, .entity-section h2").count(),
      0,
    );
    assert.ok(
      (await page.locator(".compact-month").boundingBox()).height <= 36,
    );
    assert.equal(
      await page
        .locator(".home-totals .stat")
        .first()
        .evaluate((e) => getComputedStyle(e).borderTopWidth),
      "0px",
    );
    const consultedMonth = await page.locator("#month").inputValue();
    await page.locator(".month-picker input").click();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Mes anterior", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Mes siguiente", exact: true })
      .click();
    assert.equal(await page.locator("#month").inputValue(), consultedMonth);
    // A tap opens each entity, without opening a movement form.
    for (const [name, caption, count] of [
      ["Trabajo", "Ingresos por mes", 1],
      ["Banco", "Saldo al cierre de cada mes", 2],
      ["Comida", "Gastos por mes", 1],
    ]) {
      await card(name).tap();
      await page.getByRole("heading", { name, exact: true }).waitFor();
      assert.equal(
        await page.locator("#dialog").evaluate((e) => e.open),
        false,
      );
      assert.equal(
        await page.locator(".entity-history .transaction").count(),
        count,
      );
      await page.getByRole("heading", { name: caption, exact: true }).waitFor();
      assert.equal(await page.locator(".entity-chart tbody tr").count(), 12);
      if (name === "Comida")
        assert.match(
          await page.locator(".transaction-end > strong").innerText(),
          /^−Bs /,
        );
      if (name === "Trabajo")
        assert.match(
          await page.locator(".transaction-end > strong").innerText(),
          /^\+Bs /,
        );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.locator('.detail-toolbar [data-action="edit-entity"]').click();
      assert.equal(
        await page.locator('#dialog [name="name"]').inputValue(),
        name,
      );
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      if (name === "Trabajo") {
        await page.locator('[data-action="delete-transaction"]').click();
        await page
          .getByText("No hay movimientos en este período.", { exact: true })
          .waitFor();
        assert.equal(
          await page.locator(".entity-history .transaction").count(),
          0,
        );
        assert.match(await page.locator(".detail-totals").innerText(), /0,00/);
        await page.locator('#toast [data-action="undo"]').click();
        await page.locator(".entity-history .transaction").waitFor();
        assert.equal(
          await page.locator(".entity-history .transaction").count(),
          1,
        );
      }
      await page
        .getByRole("button", { name: "Volver a Inicio", exact: true })
        .click();
    }
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
    // Undo notices last eight seconds; the header keeps Undo available afterward.
    await page.clock.fastForward(3100);
    assert.equal(
      await page.locator('#toast [data-action="undo"]').isVisible(),
      true,
    );
    await page.clock.fastForward(5000);
    assert.equal(await page.locator("#toast").isVisible(), false);
    assert.equal(await page.locator("#undo-button").isVisible(), true);
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
    // Entity detail has its own scope, month switching and signed account history.
    await card("Comida").tap();
    assert.equal(await page.locator(".entity-history .transaction").count(), 1);
    await page
      .getByRole("button", { name: "Todo el historial", exact: true })
      .click();
    assert.equal(await page.locator(".entity-history .transaction").count(), 2);
    await page
      .getByRole("button", { name: "Mes anterior", exact: true })
      .click();
    assert.equal(await page.locator(".entity-history .transaction").count(), 0);
    await page
      .getByRole("button", { name: "Mes siguiente", exact: true })
      .click();
    assert.equal(await page.locator(".entity-history .transaction").count(), 1);
    await page
      .getByRole("button", { name: "Volver a Inicio", exact: true })
      .click();
    await card("Banco").tap();
    const incomeRow = page
      .locator(".transaction")
      .filter({ hasText: "Ingreso" });
    await incomeRow.locator('[data-action="delete-transaction"]').click();
    await incomeRow.waitFor({ state: "detached" });
    assert.equal(await page.locator(".entity-history .transaction").count(), 1);
    assert.match(await page.locator(".detail-totals").innerText(), /850,00/);
    await page.locator('#toast [data-action="undo"]').click();
    await incomeRow.waitFor();
    assert.match(
      await page.locator(".detail-totals").innerText(),
      /1\.850,00|1850,00/,
    );
    await page.screenshot({
      path: "/tmp/gastalo-account-detail.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Volver a Inicio", exact: true })
      .click();
    // Real touch input exercises the circle, long press, clone and pointer capture.
    await card("Banco").scrollIntoViewIfNeeded();
    const grip = await card("Banco").locator(".entity-mark").boundingBox();
    const target = await card("Efectivo").boundingBox();
    const cdp = await context.newCDPSession(page);
    const point = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    await page.locator(".drag-clone").waitFor();
    assert.equal(
      await card("Banco").evaluate((e) => e.classList.contains("dragging")),
      true,
    );
    assert.equal(
      await card("Efectivo").evaluate((e) =>
        e.classList.contains("valid-target"),
      ),
      true,
    );
    assert.equal(
      await card("Trabajo").evaluate((e) =>
        e.classList.contains("invalid-target"),
      ),
      true,
    );
    assert.equal(
      await page
        .locator(".drag-clone")
        .evaluate((e) => getComputedStyle(e).opacity),
      "1",
    );
    const lockedScroll = await page.evaluate(() => document.body.style.top);
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
    await page.waitForTimeout(30);
    assert.equal(
      await card("Efectivo").evaluate((e) =>
        e.classList.contains("drop-target"),
      ),
      true,
    );
    assert.equal(
      await page.evaluate(() => document.body.style.top),
      lockedScroll,
    );
    const cloneBox = await page.locator(".drag-clone").boundingBox();
    assert.ok(Math.abs(cloneBox.width - 67.2) < 1);
    assert.ok(
      Math.abs(
        cloneBox.x + cloneBox.width / 2 - (target.x + target.width / 2),
      ) < 2,
    );
    await page.screenshot({ path: "/tmp/gastalo-drag.png" });
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
    // Mouse uses the same Pointer Events path; >6px starts without a hold.
    const bankCircle = await card("Banco")
      .locator(".entity-mark")
      .boundingBox();
    const foodCircle = await card("Comida")
      .locator(".entity-mark")
      .boundingBox();
    await page.mouse.move(bankCircle.x + 24, bankCircle.y + 24);
    await page.mouse.down();
    await page.mouse.move(bankCircle.x + 32, bankCircle.y + 24);
    await page.locator(".drag-clone").waitFor();
    await page.mouse.move(foodCircle.x + 24, foodCircle.y + 24, { steps: 8 });
    await page.mouse.up();
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
    // Outside drop and pointer cancellation return the clone and leave no form or lock.
    for (const cancel of [false, true]) {
      const box = await card("Banco").locator(".entity-mark").boundingBox();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: box.x + 24, y: box.y + 24 }],
      });
      await page.locator(".drag-clone").waitFor();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 3, y: 120 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: cancel ? "touchCancel" : "touchEnd",
        touchPoints: [],
      });
      await page.locator(".drag-clone").waitFor({ state: "detached" });
      assert.equal(
        await page.locator("#dialog").evaluate((e) => e.open),
        false,
      );
      assert.equal(
        await page
          .locator("html")
          .evaluate((e) => e.classList.contains("is-dragging")),
        false,
      );
    }
    // Category grids stay compact, wrap to new rows and always retain four columns.
    for (let i = 2; i <= 20; i++)
      await add("categories", `Categoría ${i} nombre largo`);
    const categoryGrid = page.locator(".row-2 .entity-grid");
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await categoryGrid.evaluate(
          (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
        ),
        4,
      );
      assert.equal(
        await categoryGrid.evaluate((e) => e.scrollWidth > e.clientWidth),
        false,
      );
      assert.ok((await categoryGrid.boundingBox()).height < 700);
      assert.equal(
        (await card("Comida").locator(".entity-mark").boundingBox()).width,
        48,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
    await page.locator(".row-2").scrollIntoViewIfNeeded();
    assert.ok((await page.locator(".home-totals").boundingBox()).y <= 1);
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
      "PASS: entity history/charts/deletion, notices, mobile CRUD, pointer drag, budgets, filters, reports, JSON/CSV, reload, concurrent tabs, offline persistence, desktop layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
