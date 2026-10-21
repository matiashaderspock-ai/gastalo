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
    assert.deepEqual(
      await page.locator(".home-totals .stat > span").allTextContents(),
      ["Balance actual", "Gastos efectuados", "Gastos planeados"],
    );
    async function go(name, target = page) {
      await target.locator("#app-menu > summary").click();
      await target.getByRole("button", { name, exact: true }).click();
      assert.equal(
        await target.locator("#app-menu").evaluate((e) => e.open),
        false,
      );
    }
    const menuBox = await page.locator("#app-menu > summary").boundingBox();
    assert.equal(await page.locator(".brand").isVisible(), false);
    assert.equal(await page.locator(".app-footer .brand").count(), 0);
    const totalsBox = await page.locator(".home-totals").boundingBox();
    assert.ok(menuBox.x + menuBox.width <= totalsBox.x, "Totals sit beside the menu");
    assert.ok(Math.abs(menuBox.y + menuBox.height / 2 - totalsBox.y - totalsBox.height / 2) < 1);
    assert.equal(await page.locator(".currency-chip, .home-hint, #main .footnote").count(), 0);
    // Header disclosure exposes all five views, and supports Escape and outside click.
    await page.locator("#app-menu > summary").click();
    const brandBox = await page.locator(".menu-brand").boundingBox();
    const firstItemBox = await page.locator("#app-menu nav button").first().boundingBox();
    assert.ok(brandBox.y + brandBox.height <= firstItemBox.y);
    assert.equal(await page.locator("#app-menu nav button").count(), 5);
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("#app-menu").evaluate((e) => e.open),
      false,
    );
    await page.locator("#app-menu > summary").click();
    await page.locator(".home-totals .stat").last().click();
    assert.equal(
      await page.locator("#app-menu").evaluate((e) => e.open),
      false,
    );
    assert.equal(
      await page.locator("nav").evaluate((e) => getComputedStyle(e).position),
      "absolute",
    );
    const cdp = await context.newCDPSession(page);
    async function add(key, name, icon = "") {
      await page
        .locator(`[data-action="add"][data-key="${key}"]`)
        .first()
        .click();
      await page.locator('#dialog [name="name"]').fill(name);
      if (icon) {
        await page.locator('[data-action="toggle-icons"]').click();
        await page.locator(`#icon-picker [data-icon="${icon}"]`).click();
      }
      await page.locator('#dialog button[type="submit"]').click();
      await page.locator("#dialog").waitFor({ state: "hidden" });
    }
    // A replacement notice gets its own full lifetime; old timers cannot hide it.
    await page.clock.install();
    await add("sources", "Trabajo", "work");
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
    async function hold(name) {
      await card(name).scrollIntoViewIfNeeded();
      const box = await card(name).locator(".entity-mark").boundingBox();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: box.x + 24, y: box.y + 24 }],
      });
      await page.locator("#entity-edit-bar").waitFor();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      assert.equal(await page.locator(".drag-clone").count(), 0);
      assert.equal(await page.locator(".entity-pencil:visible").count(), 4);
      const centered = await page.locator(".entity-remove:visible").evaluateAll(buttons => buttons.every(button => {
        const b = button.getBoundingClientRect(), s = button.querySelector("svg").getBoundingClientRect();
        return Math.abs(b.x + b.width / 2 - s.x - s.width / 2) < 0.5 && Math.abs(b.y + b.height / 2 - s.y - s.height / 2) < 0.5;
      }));
      assert.equal(centered, true, "The delete X is centered in its circle");
    }
    // Stationary holds edit every entity type; the pencil opens the icon chooser.
    for (const name of ["Trabajo", "Banco", "Comida"]) {
      await hold(name);
      if (name === "Comida") {
        await page
          .getByRole("button", { name: "Editar Comida", exact: true })
          .click();
        await page.locator('[data-action="toggle-icons"]').click();
        assert.equal(await page.locator('#icon-picker [data-action="select-icon"]').count(), Object.keys(A.ENTITY_ICONS).length);
        await page.locator('#icon-picker [data-icon="food"]').click();
        await page.locator('#dialog button[type="submit"]').click();
        await page.locator("#dialog").waitFor({ state: "hidden" });
      }
      await page.getByRole("button", { name: "Listo", exact: true }).click();
      assert.equal(await page.locator(".entity-pencil:visible").count(), 0);
    }
    assert.equal(await page.locator('.entity-add').count(), 3);
    assert.ok((await page.locator('.entity-add').allTextContents()).every(text => !text.trim()));
    assert.ok(await page.locator('.entity-add .entity-mark').evaluateAll(marks => marks.every(mark => {
      const style = getComputedStyle(mark);
      return mark.getBoundingClientRect().width === 40 && style.borderStyle === 'solid' && style.borderWidth === '1px';
    })));
    async function transaction(from, to, amount, note = "") {
      await page.locator('[data-action="movement"]').first().click();
      const fromId = await card(from).getAttribute("data-entity");
      const toId = await card(to).getAttribute("data-entity");
      await page.locator('#dialog [name="from"]').selectOption(fromId);
      await page.locator('#dialog [name="to"]').selectOption(toId);
      await page.locator('#dialog [name="amount"]').fill(amount);
      await page.locator(".movement-extras > summary").click();
      await page.locator('#dialog [name="note"]').fill(note);
      await page.getByRole('button', { name: 'Elegir o crear etiquetas', exact: true }).click();
      await page.locator('#tag-search').fill('Personal');
      if (await page.locator('#tag-create').isVisible()) await page.locator('#tag-create').click();
      else await page.locator('#tag-picker-list input').first().check();
      await page.locator('#tag-picker-done').click();
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
    // The X archives the entity while retaining its movements and balance; Undo restores it.
    await hold("Banco");
    await page
      .getByRole("button", { name: "Eliminar Banco", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Archivar", exact: true })
      .click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    assert.equal(await card("Banco").count(), 0);
    assert.match(await page.locator(".home-totals").innerText(), /974,60/);
    await page.locator('#toast [data-action="undo"]').click();
    await card("Banco").waitFor();
    await page.getByRole("button", { name: "Listo", exact: true }).click();
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
    assert.equal(await page.locator('.home-toolbar .month-nav button').count(), 0);
    await page.locator('#month').fill('2026-12');
    assert.equal(await page.locator('#month').inputValue(), '2026-12');
    await page.locator('#month').fill(consultedMonth);
    // Complete deletion is distinct from archive, requires confirmation and supports Undo.
    await hold("Banco");
    await page.getByRole("button", { name: "Eliminar Banco", exact: true }).click();
    await page.locator('#dialog [name="removal"][value="erase"]').check();
    assert.equal(await page.locator('#dialog [name="confirmErase"]').isVisible(), true);
    assert.match(await page.locator("#erase-warning").innerText(), /2 movimientos/);
    await page.getByRole("button", {name:"Eliminar completamente", exact:true}).click();
    assert.equal(await page.locator("#dialog").evaluate(e=>e.open), true, "No deletion without confirmation");
    await page.locator('#dialog [name="confirmErase"]').check();
    await page.getByRole("button", {name:"Eliminar completamente", exact:true}).click();
    await page.locator("#dialog").waitFor({state:"hidden"});
    assert.equal(await card("Banco").count(), 0);
    assert.match(await card("Efectivo").innerText(), /25,50/);
    await go("Historial");
    assert.equal(await page.locator(".transaction").count(), 1);
    await page.locator('#toast [data-action="undo"]').click();
    await page.waitForFunction(() => document.querySelectorAll(".transaction").length === 3);
    assert.equal(await page.locator(".transaction").count(), 3);
    await go("Inicio");
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
    await go("Límites de categoría");
    await page
      .getByRole("button", { name: "Editar límite de Comida" })
      .click();
    await page.locator('#dialog [name="limit"]').fill("200");
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    assert.match(await page.locator(".budget-card").innerText(), /174,50/);
    await page.getByRole("button", { name: "Mes siguiente" }).click();
    assert.match(await page.locator(".budget-card").innerText(), /200,00/);
    await page
      .getByRole("button", { name: "Mes anterior", exact: true })
      .click();
    assert.match(await page.locator(".budget-card").innerText(), /174,50/);
    await go("Historial");
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
    await go("Gráficos");
    assert.equal(await page.locator(".timeline-month").count(), 12);
    assert.match(await page.locator(".stats").innerText(), /1000,10|1\.000,10/);
    assert.match(await page.locator(".stats").innerText(), /30,00/);
    await go("Importar/Exportar");
    const downloadWait = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Descargar respaldo JSON", exact: true })
      .click();
    const download = await downloadWait;
    const json = fs.readFileSync(await download.path(), "utf8");
    const exported = A.restore(json);
    assert.equal(exported.transactions.length, 3);
    assert.equal(exported.sources[0].icon, "work");
    assert.equal(exported.categories[0].icon, "food");
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
    await go("Importar/Exportar");
    await page.locator(".import-options > summary").click();
    await page.locator("#import-budget-month").fill("2026-01");
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
    await go("Inicio");
    await page.locator("#month").fill("2026-01");
    assert.match(await card("Banco").innerText(), /1\.850,00|1850,00/);
    async function assertBudgetMark(tone, fill, planned = "200,00") {
      const mark = card("Comida").locator(".entity-mark");
      assert.equal(await mark.evaluate((e, tone) => e.classList.contains(`budget-${tone}`), tone), true);
      assert.equal(await mark.evaluate(e => e.style.getPropertyValue("--budget-fill")), `${fill}%`);
      assert.match(await mark.evaluate(e => getComputedStyle(e).backgroundImage), /linear-gradient/);
      const iconColor = await mark.evaluate(e => {
        const style = document.createElement("span").style;
        style.color = getComputedStyle(e).getPropertyValue("--budget-color");
        return style.color;
      });
      assert.equal(await card("Comida").locator("strong").evaluate(e => getComputedStyle(e).color), iconColor);
      assert.doesNotMatch(await card("Comida").innerText(), /límite|disponible|exceso/);
      const caption = card("Comida").locator(".entity-planned");
      if (planned === null) assert.equal(await caption.count(), 0);
      else {
        assert.equal(await caption.innerText(), planned);
        assert.equal(await caption.evaluate(e => getComputedStyle(e).fontSize), "10px");
        assert.equal(await caption.evaluate(e => getComputedStyle(e).color), "rgb(105, 118, 109)");
        const current = await card("Comida").locator("strong").boundingBox();
        assert.ok((await caption.boundingBox()).y >= current.y + current.height);
      }
    }
    await assertBudgetMark("green", 12.75);
    assert.equal(await page.locator('.row-0 .entity-planned, .row-1 .entity-planned').count(), 0);
    await page.locator("#month").fill("2026-02");
    assert.equal(await card("Comida").locator(".entity-planned").innerText(), "200,00");
    await page.locator("#month").fill("2026-01");
    await assertBudgetMark("green", 12.75);
    for (const [limit, tone, fill, planned] of [["30", "orange", 85, "30,00"], ["25.50", "orange", 100, "25,50"], ["20", "red", 100, "20,00"], ["0", "red", 100, "0,00"], ["", "gray", 0, null], ["200", "green", 12.75, "200,00"]]) {
      await go("Límites de categoría");
      await page.getByRole("button", { name: "Editar límite de Comida" }).click();
      await page.locator('#dialog [name="limit"]').fill(limit);
      await page.locator('#dialog button[type="submit"]').click();
      await page.locator("#dialog").waitFor({ state: "hidden" });
      await go("Inicio");
      await assertBudgetMark(tone, fill, planned);
    }
    // Archiving a category preserves its limits and history, and restoration works
    // both from Organizar entidades and the collapsed Archived Categories list.
    await hold("Comida");
    await page.getByRole("button", { name: "Eliminar Comida", exact: true }).click();
    assert.equal(await page.locator('#dialog [name="removal"]:checked').inputValue(), "archive");
    await page.getByRole("button", { name: "Archivar", exact: true }).click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    assert.equal(await card("Comida").count(), 0);
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await go("Límites de categoría");
    assert.equal(await page.locator("#archived-categories").evaluate(e => e.open), false);
    assert.equal(await page.locator("section.budget-grid > .budget-card").count(), 0);
    await page.locator("#archived-categories > summary").click();
    assert.equal(await page.locator("#archived-categories .budget-card").count(), 1);
    assert.match(await page.locator("#archived-categories .budget-card").innerText(), /200,00/);
    await go("Importar/Exportar");
    await page.locator('[data-manage-key="categories"] > summary').click();
    await page.getByRole("button", { name: "Restaurar Comida en Inicio" }).click();
    assert.equal(await page.locator('[data-manage-key="categories"]').evaluate(e => e.open), true);
    await go("Inicio");
    await card("Comida").waitFor();
    await go("Límites de categoría");
    assert.equal(await page.locator("section.budget-grid > .budget-card").count(), 1);
    assert.match(await page.locator("section.budget-grid > .budget-card").innerText(), /200,00/);
    await go("Inicio");
    await hold("Comida");
    await page.getByRole("button", { name: "Eliminar Comida", exact: true }).click();
    await page.getByRole("button", { name: "Archivar", exact: true }).click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await go("Límites de categoría");
    await page.locator("#archived-categories > summary").click();
    await page.getByRole("button", { name: "Restaurar Comida en Inicio" }).click();
    assert.equal(await page.locator("#archived-categories .budget-card").count(), 0);
    assert.equal(await page.locator("section.budget-grid > .budget-card").count(), 1);
    await go("Inicio");
    await card("Comida").waitFor();
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
    // A one-pixel first touch move starts dragging immediately, without a hold.
    await card("Banco").scrollIntoViewIfNeeded();
    const grip = await card("Banco").locator(".entity-mark").boundingBox();
    const target = await card("Efectivo").boundingBox();
    const point = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
    await page.evaluate(() => {
      window.__immediateDrag = false;
      document.addEventListener("pointermove", () => {
        window.__immediateDrag = !!document.querySelector(".drag-clone");
      }, {once:true});
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: point.x + 1, y: point.y }],
    });
    assert.equal(await page.evaluate(() => window.__immediateDrag), true,
      "Clone exists in the first pointermove handler, without a timer");
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
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".drop-target .entity-name")].some(
        (e) => e.textContent === "Efectivo",
      ),
    );
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
    // The target can react one frame before the final clone position is painted.
    await page.waitForFunction((x) => {
      const box = document.querySelector(".drag-clone").getBoundingClientRect();
      return Math.abs(box.x + box.width / 2 - x) < 2;
    }, target.x + target.width / 2);
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
    await page.waitForFunction(() => document.activeElement?.name === "amount");
    assert.equal(await page.locator("#tag-picker").isVisible(), false);
    assert.ok((await page.locator("#dialog").boundingBox()).height < 480, "The movement stays compact with the visible tag box");
    assert.equal(
      await page.locator('#dialog [name="to"] option:checked').innerText(),
      "Efectivo",
    );
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    // Mouse uses the same immediate Pointer Events path.
    const bankCircle = await card("Banco")
      .locator(".entity-mark")
      .boundingBox();
    const foodCircle = await card("Comida")
      .locator(".entity-mark")
      .boundingBox();
    await page.mouse.move(bankCircle.x + 24, bankCircle.y + 24);
    await page.mouse.down();
    await page.mouse.move(bankCircle.x + 25, bankCircle.y + 24);
    await page.locator(".drag-clone").waitFor();
    await page.mouse.move(foodCircle.x + 24, foodCircle.y + 24, { steps: 8 });
    await page.mouse.up();
    await page.getByRole("heading", { name: "Nuevo movimiento" }).waitFor();
    await page.waitForFunction(() => document.activeElement?.name === "amount");
    assert.equal(await page.locator("#tag-picker").isVisible(), false);
    assert.ok((await page.locator("#dialog").boundingBox()).height < 480, "The movement stays compact with the visible tag box");
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
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: box.x + 32, y: box.y + 24 }],
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
    // Additional sources/accounts stay on one row and can be swiped independently.
    for (let i = 2; i <= 6; i++) await add("sources", `Fuente extra ${i}`);
    for (let i = 3; i <= 33; i++) await add("accounts", `Cuenta extra ${i}`);
    assert.equal(await page.locator('.row-1 .entity-card').count(), 33);
    assert.equal(await card("Categoría 2 nombre largo").locator(".entity-planned").count(), 0);
    assert.equal(await card("Categoría 2 nombre largo").locator(".entity-mark.budget-gray").count(), 1);
    // Native vertical scrolling begins on names, amounts and card padding, even
    // with 33 horizontally scrollable accounts. Circles now start dragging immediately.
    for (const selector of [".entity-name", "strong", ""]) {
      await page.evaluate(() => window.scrollTo(0, 0));
      const box = await (selector ? card("Banco").locator(selector) : card("Banco")).boundingBox();
      const before = await page.evaluate(() => scrollY);
      const point = { x: box.x + (selector ? box.width / 2 : 2), y: box.y + box.height / 2 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
      // Non-circle movement keeps native vertical scrolling available.
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ x: point.x, y: point.y - 14 }],
      });
      for (let delta = 40; delta <= 120; delta += 40) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove", touchPoints: [{ x: point.x, y: point.y - delta }],
        });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      assert.ok(await page.evaluate(() => scrollY) > before + 30, `vertical page scroll from ${selector}`);
      assert.equal(await page.locator(".drag-clone, .entity-detail").count(), 0);
      assert.equal(await page.locator("#entity-edit-bar").isVisible(), false);
    }

    async function resetStrip(strip) {
      // Native swipes can keep moving after touchend; stop after momentum settles.
      await strip.evaluate(e => new Promise(resolve => {
        let previous = e.scrollLeft, stable = 0;
        function frame() {
          const current = e.scrollLeft;
          stable = Math.abs(current - previous) < 0.5 ? stable + 1 : 0;
          previous = current;
          if (stable >= 6) { e.scrollLeft = 0; resolve(); }
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }));
    }
    async function swipeRow(row) {
      const strip = page.locator(`.row-${row} .entity-strip`);
      await strip.scrollIntoViewIfNeeded();
      const box = await strip.locator(".entity-name").nth(1).boundingBox();
      const before = await page.evaluate(() => scrollY);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: box.x + box.width / 2 - 80, y: box.y + box.height / 2 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      assert.ok((await strip.evaluate((e) => e.scrollLeft)) > 30);
      assert.equal(
        await page.locator(".drag-clone, .entity-detail").count(),
        0,
      );
      assert.equal(await page.evaluate(() => scrollY), before);
      await resetStrip(strip);
    }
    for (const row of [0, 1]) {
      const strip = page.locator(`.row-${row} .entity-strip`);
      assert.ok(await strip.evaluate((e) => e.scrollWidth > e.clientWidth));
      const positions = await strip
        .locator(".entity-wrap")
        .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().y));
      assert.ok(positions.every((y) => Math.abs(y - positions[0]) < 1));
      await swipeRow(row);
    }
    // The create control follows every entity and is reached by swiping the row.
    for (const row of [0, 1]) {
      const strip = page.locator(`.row-${row} .entity-strip`);
      await strip.scrollIntoViewIfNeeded();
      assert.equal(await strip.locator(':scope > .entity-add').count(), 1);
      assert.ok(await strip.evaluate(e => e.lastElementChild.matches('.entity-add')));
      const add = strip.locator('.entity-add');
      const stripBox = await strip.boundingBox();
      assert.ok((await add.boundingBox()).x >= stripBox.x + stripBox.width, 'Create is initially off-screen after more than three entities');
      for (let swipe = 0; swipe < 15; swipe++) {
        const visible = await strip.evaluate(e => {
          const a = e.querySelector('.entity-add').getBoundingClientRect(), b = e.getBoundingClientRect();
          return a.left >= b.left && a.right <= b.right + 1;
        });
        if (visible) break;
        const grip = await strip.locator('.entity-card .entity-name').evaluateAll(marks => {
          const b = marks[0].closest('.entity-strip').getBoundingClientRect();
          return marks.map(e => e.getBoundingClientRect()).filter(r => r.left >= b.left + 5 && r.right < b.right - 5).at(-1).toJSON();
        });
        const point = {x: grip.x + grip.width / 2, y: grip.y + grip.height / 2};
        await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[point]});
        await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x: point.x - stripBox.width * 0.65, y: point.y}]});
        await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
      }
      assert.ok(await strip.evaluate(e => {
        const a = e.querySelector('.entity-add').getBoundingClientRect(), b = e.getBoundingClientRect();
        return a.left >= b.left && a.right <= b.right + 1;
      }), 'Swiping reveals the final create button');
      assert.equal(await page.locator('.drag-clone, .entity-detail').count(), 0);
      await add.tap();
      await page.getByRole('heading', {name: row === 0 ? 'Crear fuente' : 'Crear cuenta', exact:true}).waitFor();
      await page.getByRole('button', {name:'Cancelar', exact:true}).click();
      await resetStrip(strip);
    }
    // A one-pixel vertical move also starts immediately in an overflowing row.
    await card("Banco").scrollIntoViewIfNeeded();
    const bank = await card("Banco").locator(".entity-mark").boundingBox();
    const cash = await card("Efectivo").locator(".entity-mark").boundingBox();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: bank.x + 24, y: bank.y + 24 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: bank.x + 24, y: bank.y + 25 }],
    });
    await page.locator(".drag-clone").waitFor();
    assert.equal(await page.locator('.row-1 .entity-strip').evaluate(e => e.scrollLeft), 0);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: cash.x + 24, y: cash.y + 24 }],
    });
    await page.locator(".drag-clone").waitFor();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page
      .getByRole("heading", { name: "Nuevo movimiento", exact: true })
      .waitFor();
    assert.equal(
      await page.locator('#dialog [name="to"] option:checked').innerText(),
      "Efectivo",
    );
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    // Editing mode also allows exploration of entities that are off-screen.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: bank.x + 24, y: bank.y + 24 }],
    });
    await page.locator("#entity-edit-bar").waitFor();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await swipeRow(1);
    await page.getByRole("button", { name: "Listo", exact: true }).click();
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
      const corner = await page.locator(".row-2 .entity-add").boundingBox();
      const gridBox = await categoryGrid.boundingBox();
      const lastCategoryY = await categoryGrid
        .locator(".entity-wrap")
        .last()
        .evaluate((e) => e.getBoundingClientRect().y);
      assert.ok(
        Math.abs(corner.x - gridBox.x) < 1,
      );
      assert.ok(corner.y >= lastCategoryY);
      for (const row of [0, 1]) {
        const tops = await page
          .locator(`.row-${row} .entity-strip .entity-wrap`)
          .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().y));
        assert.ok(tops.every((y) => Math.abs(y - tops[0]) < 1));
      }
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
    await page.locator(".entity-section.row-2").scrollIntoViewIfNeeded();
    assert.ok((await page.locator(".app-header").boundingBox()).y <= 1);
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
    await go("Importar/Exportar", dp);
    await dp.locator(".import-options > summary").click();
    await dp.locator("#import-budget-month").fill("2026-01");
    await dp
      .locator("#csv-file")
      .setInputFiles(path.join(__dirname, "fixtures/coinkeeper.csv"));
    await dp.locator('#dialog [name="confirm"]').check();
    await dp.getByRole("button", { name: "Importar y reemplazar" }).click();
    await dp.locator("#dialog").waitFor({ state: "hidden" });
    await go("Inicio", dp);
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
      "PASS: instant one-pixel circle dragging, native text swipes and vertical scroll with 33 accounts, budget icon fill thresholds, header menu, long-press tools, icons, amount focus, subtle create buttons at scrollable row ends and category grid end, entity history/charts/deletion, notices, pointer drag, budgets, JSON/CSV, concurrency and offline persistence.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
