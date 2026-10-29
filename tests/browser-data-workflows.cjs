const { openDisclosure } = require("./browser-helpers.cjs");
const { setHomeMonth } = require("./browser-helpers.cjs");
/* Uses synthetic data and intercepted GitHub requests; never contacts a real backup repo. */
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
    const context = await browser.newContext({ ...devices["iPhone 13"], locale: "es-BO", acceptDownloads: true });
    const syncCalls = [];
    let holdRead = false, releaseRead, readStarted, remoteBackup = A.emptyState(), largeContents = false, blobReads = 0;
    await context.route("https://api.github.com/**", async route => {
      const method = route.request().method();
      syncCalls.push(method);
      if (method === "GET" && holdRead) {
        readStarted();
        await new Promise(resolve => { releaseRead = resolve; });
      }
      if (method === "PUT") remoteBackup = A.restore(Buffer.from(route.request().postDataJSON().content, "base64").toString("utf8"));
      const blob = new URL(route.request().url()).pathname.endsWith("/git/blobs/test-backup");
      if (blob) blobReads++;
      const body = largeContents && method === "GET" && !blob
        ? { sha: "test-backup", encoding: "none", content: "" } // Contents API shape for files >1 MB.
        : { sha: "test-backup", encoding: "base64", content: A.utf8Base64(A.backup(remoteBackup)).replace(/.{76}/g, "$&\n") };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }).catch(() => {});
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.clock.install();
    await page.goto(base);
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    async function go(name) {
      await page.locator("#app-menu > summary").click();
      await page.getByRole("button", { name, exact: true }).click();
    }
    async function records() {
      return page.evaluate(() => new Promise((resolve, reject) => {
        const request = indexedDB.open("gastalo");
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction("state"), store = tx.objectStore("state"), values = {};
          for (const key of ["main", "sync_config"])
            store.get(key).onsuccess = e => { values[key] = e.target.result; };
          tx.oncomplete = () => { db.close(); resolve(values); };
          tx.onerror = () => reject(tx.error);
        };
      }));
    }
    await go("Importar/Exportar");
    assert.equal(await page.locator("#import-month").count(), 0);
    assert.equal(await page.locator(".import-options").evaluate(e => e.open), false);
    const csv = fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8")
      .replaceAll("2026", "2021").replace('"2/1/2021"', '"2/1/2025"');
    const file = { name: "historial-2021-2025.csv", mimeType: "text/csv", buffer: Buffer.from(csv) };
    await page.locator("#csv-file").setInputFiles(file);
    await page.getByRole("heading", { name: "Revisar importación" }).waitFor();
    const summary = await page.locator(".import-summary").innerText();
    assert.match(summary, /05\/01\/21/);
    assert.match(summary, /01\/02\/25/);
    assert.match(summary, /Sin límites/);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    assert.equal((await records()).main, undefined);
    async function importFile() {
      await page.locator("#csv-file").setInputFiles(file);
      await page.locator('#dialog [name="confirm"]').check();
      await page.getByRole("button", { name: "Importar y reemplazar" }).click();
      await page.locator("#dialog").waitFor({ state: "hidden" });
    }
    await importFile();
    await importFile();
    let saved = (await records()).main.data;
    assert.equal(saved.transactions.length, 4, "Repeated import replaces without duplicates");
    assert.equal(saved.budgets.length, 0);
    assert.equal(saved.accounts[0].opening_date, "2021-01-05");
    assert.equal(saved.transactions.at(-1).occurred_on, "2025-02-01");
    await go("Inicio");
    await setHomeMonth(page, "2025-01");
    await go("Límites de categoría");
    async function setLimit(value) {
      await page.getByRole("button", { name: "Editar límite de Comida", exact: true }).click();
      await page.locator('#dialog [name="limit"]').fill(value);
      await page.locator('#dialog button[type="submit"]').click();
      await page.locator("#dialog").waitFor({ state: "hidden" });
    }
    await setLimit("200");
    await page.getByRole("button", { name: "Mes siguiente", exact: true }).click();
    assert.match(await page.locator(".budget-card").innerText(), /150,00/);
    await page.getByRole("button", { name: "Mes siguiente", exact: true }).click();
    await setLimit("300");
    await page.locator("#month").fill("2028-04");
    assert.match(await page.locator(".budget-card").innerText(), /300,00/);
    await go("Inicio");
    assert.match(await page.locator(".home-totals .stat").last().innerText(), /300,00/);
    assert.equal(await page.locator(".entity-planned").innerText(), "300,00");
    await go("Importar/Exportar");
    // Clearing an inherited limit from category editing must create an explicit change.
    await page.locator(".manage-row").filter({ hasText: "Comida" }).locator("button").evaluate(button => { button.closest("details").open = true; });
    await page.locator(".manage-row").filter({ hasText: "Comida" }).getByRole("button", { name: "Editar", exact: true }).click();
    await page.locator('#dialog [name="limit"]').fill("");
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    await go("Límites de categoría");
    await page.locator("#month").fill("2028-05");
    assert.match(await page.locator(".budget-card").innerText(), /Sin límite/);
    await setLimit("0");
    await page.locator("#month").fill("2028-06");
    assert.doesNotMatch(await page.locator(".budget-card").innerText(), /Sin límite/);
    await setLimit("");
    await page.locator("#month").fill("2028-07");
    assert.match(await page.locator(".budget-card").innerText(), /Sin límite/);
    saved = (await records()).main.data;
    const category = saved.categories[0].id;
    assert.equal(A.budgetLimit(saved, category, "2025-01"), 20000);
    assert.equal(A.budgetLimit(saved, category, "2025-03"), 30000);
    assert.equal(A.budgetLimit(saved, category, "2028-04"), null);
    assert.equal(A.budgetLimit(saved, category, "2028-05"), 0);
    assert.equal(A.budgetLimit(saved, category, "2030-01"), null);
    await go("Importar/Exportar");
    await page.locator('[data-action="reset-app"]').click();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    assert.deepEqual((await records()).main.data, saved);
    // Enable a synthetic backup and verify reset is atomic against concurrent writes.
    await openDisclosure(page, "#backup-settings");
    await page.locator("#sync-token").fill("synthetic-reset-test");
    await openDisclosure(page, "#backup-settings");
    await page.getByRole("button", { name: "Sincronizar ahora", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#sync-status").textContent.includes("Última sincronización"));
    await page.locator('[data-action="reset-app"]').click();
    await page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open("gastalo");
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("state", "readwrite"), store = tx.objectStore("state");
        store.get("main").onsuccess = e => store.put({ ...e.target.result, revision: e.target.result.revision + 1 }, "main");
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    }));
    await page.locator('[name="confirm-reset"]').check();
    await page.locator('#dialog button[type="submit"]').click();
    await page.getByText("Otra pestaña cambió tus datos. Recarga antes de guardar.", { exact: true }).waitFor();
    assert.deepEqual((await records()).main.data, saved);
    assert.ok((await records()).sync_config.token, "A failed reset retains sync settings");
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    await go("Importar/Exportar");
    // Hold a synthetic request open so reset also exercises in-flight sync cancellation.
    holdRead = true;
    const started = new Promise(resolve => { readStarted = resolve; });
    await openDisclosure(page, "#backup-settings");
    await page.locator("#sync-token").fill("synthetic-reset-test-changed");
    await openDisclosure(page, "#backup-settings");
    await page.getByRole("button", { name: "Sincronizar ahora", exact: true }).click();
    await started;
    await page.locator('[data-action="reset-app"]').click();
    await page.locator('#dialog button[type="submit"]').click();
    assert.equal(await page.locator("#dialog").isVisible(), true, "Reset requires confirmation");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar respaldo antes de borrar", exact: true }).click();
    const downloaded = await downloadPromise;
    assert.deepEqual(A.restore(fs.readFileSync(await downloaded.path(), "utf8")), saved);
    await page.screenshot({ path: "/tmp/gastalo-reset-confirmation.png" });
    const revision = (await records()).main.revision;
    await page.locator('[name="confirm-reset"]').check();
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator("#dialog").waitFor({ state: "hidden" });
    holdRead = false;
    releaseRead();
    const requestCount = syncCalls.length;
    await page.clock.fastForward(31000);
    const reset = await records();
    assert.deepEqual(reset.main, { revision: revision + 1, data: A.emptyState() });
    assert.equal(reset.sync_config.token, "synthetic-reset-test-changed", "Reset preserves the saved token by default");
    assert.equal(reset.sync_config.checkAfterReset, true);
    assert.equal(syncCalls.length, requestCount, "No empty backup is uploaded after reset");
    assert.equal(await page.locator("#sync-token").getAttribute("placeholder"), "••••nged");
    assert.equal(await page.locator("#undo-button").isVisible(), false);
    largeContents = true;
    await page.reload();
    await page.getByRole("heading", { name: "Un mes más claro." }).waitFor();
    assert.equal(await page.locator(".entity-card").count(), 0);
    assert.deepEqual((await records()).main.data, A.emptyState());
    await page.getByRole("heading", { name: "Confirmar reemplazo del respaldo" }).waitFor();
    assert.match(await page.locator("#dialog-body").innerText(), /tiene 4 movimientos y aquí hay 0/);
    assert.equal(blobReads, 1, "Large backup guard counts movements from Git Blobs");
    await page.screenshot({ path: "/tmp/gastalo-sync-guard.png" });
    const putsBefore = syncCalls.filter(method => method === "PUT").length;
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.clock.fastForward(31000);
    assert.equal((await records()).sync_config.paused, true);
    assert.equal(syncCalls.filter(method => method === "PUT").length, putsBefore);
    await go("Importar/Exportar");
    await openDisclosure(page, "#backup-settings");
    await page.getByRole("button", { name: "Sincronizar ahora", exact: true }).click();
    await page.getByRole("heading", { name: "Confirmar reemplazo del respaldo" }).waitFor();
    await page.getByRole("button", { name: "Reemplazar", exact: true }).click();
    await page.clock.runFor(100);
    await page.waitForFunction(() => document.querySelector("#sync-status").textContent.includes("Última sincronización"));
    assert.equal(syncCalls.filter(method => method === "PUT").length, putsBefore + 1);
    assert.equal(blobReads, 3, "Manual retry and explicit replacement both re-read the blob");
    assert.deepEqual(remoteBackup, A.emptyState());
    assert.deepEqual(errors, []);
    console.log("PASS: multi-year CSV without month, preview/cancel/repeated import, recurring limits and monthly spending, historical edits, zero/unlimited, category edits, reset confirmation/export/cancel/concurrency, local config preservation, in-flight sync cancellation, reload and >1 MB Contents/Git Blobs fallback.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
