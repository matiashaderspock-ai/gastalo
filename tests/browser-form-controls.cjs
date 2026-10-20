/* Borderless pickers and keyboard viewport resizing; Chromium cannot open a real phone keyboard. */
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const A = require('../app.js');
const base = process.env.GASTALO_URL || 'http://127.0.0.1:4173/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  let page;
  try {
    const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-BO', reducedMotion: 'reduce' });
    page = await context.newPage();
    // Simulate the visual viewport events from keyboard opening, closing and iOS panning.
    await page.addInitScript(() => {
      const viewport = window.visualViewport;
      let height, top;
      const nativeHeight = Object.getOwnPropertyDescriptor(VisualViewport.prototype, 'height').get;
      const nativeTop = Object.getOwnPropertyDescriptor(VisualViewport.prototype, 'offsetTop').get;
      Object.defineProperties(viewport, {
        height: { get: () => height ?? nativeHeight.call(viewport) },
        offsetTop: { get: () => top ?? nativeTop.call(viewport) },
      });
      window.setKeyboardViewport = (h, t = 0, event = 'resize') => {
        height = h; top = t; viewport.dispatchEvent(new Event(event));
      };
    });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + '/fixtures/coinkeeper.csv', 'utf8'), '2026-01');
    await page.evaluate(data => new Promise(resolve => {
      const r = indexedDB.open('gastalo');
      r.onsuccess = () => { const db = r.result, tx = db.transaction('state', 'readwrite'); tx.objectStore('state').put({ data, revision: 1 }, 'main'); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), state);
    await page.reload();
    await page.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    async function checkPickers() {
      const fields = await page.locator('select, input[type="date"], input[type="month"]').evaluateAll(es => es.map(e => {
        const style = getComputedStyle(e);
        return { id: e.id || e.name, border: style.borderTopWidth, background: style.backgroundColor };
      }));
      assert.ok(fields.length > 0);
      for (const field of fields) {
        assert.equal(field.border, '0px', `${field.id} is borderless`);
        assert.equal(field.background, 'rgba(0, 0, 0, 0)', `${field.id} is unboxed`);
      }
    }
    async function bounds(height, top = 0, event = 'resize', focused) {
      await page.evaluate(({ height, top, event }) => window.setKeyboardViewport(height, top, event), { height, top, event });
      await settle();
      const box = await page.locator('#dialog').boundingBox();
      assert.ok(box.y >= top + 10, `Dialog top ${box.y} above viewport ${top}`);
      assert.ok(box.y + box.height <= top + height - 10, 'Dialog stays above the keyboard');
      if (focused) {
        const input = await page.locator(focused).boundingBox();
        assert.ok(input.y >= box.y && input.y + input.height <= box.y + box.height, 'Focused field is reachable above the keyboard');
      }
    }
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.locator('#app-menu > summary').click();
      await page.getByRole('button', { name: 'Historial', exact: true }).click();
      await page.locator('.filters > summary').click();
      await checkPickers();
      assert.equal(await page.locator('#f-text').evaluate(e => getComputedStyle(e).borderTopWidth), '1px');
      await page.locator('#app-menu > summary').click();
      await page.getByRole('button', { name: 'Inicio', exact: true }).click();
      await page.locator('[data-action="movement"]').first().click();
      await checkPickers();
      await page.locator('[name="amount"]').fill('12,34');
      await bounds(500, 0, 'resize', '[name="amount"]');
      await bounds(360, 120, 'resize', '[name="amount"]');
      await bounds(360, 180, 'scroll', '[name="amount"]');
      await page.locator('.movement-extras > summary').click();
      await page.locator('[name="note"]').fill('Teclado abierto');
      await bounds(300, 80, 'resize', '[name="note"]');
      assert.equal(await page.locator('[name="note"]').evaluate(e => getComputedStyle(e).borderTopWidth), '1px');
      await page.locator('#dialog').evaluate(e => { e.scrollTop = 0; });
      await page.locator('#tag-picker-toggle').click();
      await page.locator('#tag-search').fill('cafe');
      await bounds(300, 140, 'scroll', '#tag-search');
      await page.locator('#tag-picker-done').click();
      await settle();
      await page.locator('#dialog').evaluate(e => { e.scrollTop = e.scrollHeight; });
      const save = await page.locator('#dialog button[type="submit"]').boundingBox();
      const dialog = await page.locator('#dialog').boundingBox();
      assert.ok(save.y >= dialog.y && save.y + save.height <= dialog.y + dialog.height, 'Save can be reached by scrolling the card');
      await bounds(844);
      assert.equal(await page.locator('[name="amount"]').inputValue(), '12,34');
      assert.equal(await page.locator('[name="note"]').inputValue(), 'Teclado abierto');
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    }
    assert.deepEqual(errors, []);
    const fallback = await context.newPage();
    await fallback.addInitScript(() => Object.defineProperty(window, 'visualViewport', { value: undefined }));
    await fallback.setViewportSize({ width: 320, height: 360 });
    await fallback.goto(base);
    await fallback.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
    await fallback.locator('[data-action="movement"]').first().click();
    const fallbackBox = await fallback.locator('#dialog').boundingBox();
    assert.ok(fallbackBox.y >= 10 && fallbackBox.y + fallbackBox.height <= 350, 'Small-screen fallback works without VisualViewport');
    await fallback.close();
    console.log('PASS: borderless dropdowns/date pickers, boxed text entry, keyboard resize/pan/close, focused fields, tag search and scrollable save at 320/390/1280px.');
  } catch (error) { if (page) await page.screenshot({ path: '/tmp/gastalo-form-controls-error.png', fullPage: true }); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
