const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const A = require('../app.js');
const { openMovementFromMenu } = require('./browser-helpers.cjs');
const base = process.env.GASTALO_URL || 'http://127.0.0.1:4173/';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  let page;
  try {
    const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-BO', reducedMotion: 'reduce' });
    page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-02-15T12:00:00Z'));
    await page.goto(base);
    await page.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + '/fixtures/coinkeeper.csv', 'utf8'), '2026-01');
    const [source, account, category] = [state.sources[0], state.accounts[0], state.categories[0]];
    for (let i = 0; i < 28; i++) {
      state.accounts.push({ ...account, id: `extra-account-${i}`, name: `Cuenta ${i}`, opening_balance_cents: 0 });
      state.categories.push({ ...category, id: `extra-category-${i}`, name: `Categoría ${i}` });
      state.tags.push({ id: `tag-${i}`, name: `Etiqueta ${i}`, archived_at: null });
    }
    A.validateState(state);
    await page.evaluate(data => new Promise(resolve => {
      const request = indexedDB.open('gastalo');
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state', 'readwrite');
        tx.objectStore('state').put({ data, revision: 1 }, 'main');
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    }), state);
    await page.reload();
    await page.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
    const cdp = await context.newCDPSession(page);
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const touch = (type, points = []) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    async function swipe(locator, { dx = 160, dy = 0, cancel = false } = {}) {
      await locator.scrollIntoViewIfNeeded();
      const box = await locator.boundingBox();
      const start = { x: box.x + Math.min(24, box.width / 3), y: box.y + Math.min(12, box.height / 2) };
      await touch('touchStart', [start]);
      for (const progress of [.01, .03, .05, .07, .1, .2, .4, .6, .8, 1])
        await touch('touchMove', [{ x: start.x + dx * progress, y: start.y + dy * progress }]);
      await touch(cancel ? 'touchCancel' : 'touchEnd');
      await settle();
    }
    async function go(name) {
      await page.locator('#app-menu > summary').click();
      await page.getByRole('button', { name, exact: true }).click();
    }
    const entity = item => page.locator(`[data-entity="${item.id}"]`);
    const back = () => page.getByRole('button', { name: 'Volver a Inicio', exact: true });
    const saved = () => page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open('gastalo');
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state');
        tx.objectStore('state').get('main').onsuccess = event => resolve(event.target.result.data);
        tx.oncomplete = () => db.close();
      };
    }));
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const item of [source, account, category]) {
        await entity(item).tap();
        await page.getByRole('heading', { name: item.name, exact: true }).waitFor();
        assert.equal(await page.locator('#app-menu').isVisible(), false, 'Every entity detail omits the menu');
        const header = await page.locator('.app-header').boundingBox(), arrow = await back().boundingBox();
        assert.ok(arrow.x - header.x < 35, 'The back arrow uses the leftmost header space');
        await swipe(back(), { dx: 30 });
        assert.equal(await page.locator('.entity-detail').count(), 1, 'A short swipe on the back button cannot activate it');
        await swipe(page.locator('.detail-totals'), { dx: -50 });
        assert.equal(await page.locator('.entity-detail').count(), 1, 'Left gestures never navigate back');
        await swipe(page.locator('.detail-totals'), { cancel: true });
        assert.equal(await page.locator('.entity-detail').count(), 1, 'Cancelled gestures never navigate');
        await swipe(page.locator('.detail-totals'));
        await page.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
        assert.equal(await page.locator('#app-menu').isVisible(), true);
      }
    }
    // Returning restores both page and horizontal entity-strip position.
    const strip = page.locator('.row-1 .entity-strip');
    await strip.evaluate(element => { element.scrollLeft = 300; });
    const visibleAccount = await strip.locator('[data-entity]').evaluateAll(elements => {
      const bounds = elements[0].closest('.entity-strip').getBoundingClientRect();
      return elements.find(element => { const r = element.getBoundingClientRect(); return r.left >= bounds.left && r.right <= bounds.right; }).dataset.entity;
    });
    const stripOffset = await strip.evaluate(element => element.scrollLeft);
    await page.locator(`[data-entity="${visibleAccount}"]`).tap();
    await swipe(page.locator('.detail-totals'));
    assert.ok(Math.abs(await strip.evaluate(element => element.scrollLeft) - stripOffset) < 2);
    // A swipe on a menu button closes the menu without navigating or activating it.
    await page.locator('#app-menu > summary').tap();
    await swipe(page.getByRole('button', { name: 'Historial', exact: true }));
    assert.equal(await page.locator('#app-menu').evaluate(element => element.open), false);
    assert.equal(await page.locator('.home-totals').count(), 1);
    await go('Historial');
    await go('Límites de categoría');
    await page.locator('#month').fill('2026-03');
    await page.evaluate(() => scrollTo(0, 350));
    await settle();
    const budgetScroll = await page.evaluate(() => scrollY);
    await go('Gráficos');
    await go('Importar/Exportar');
    await swipe(page.locator('.page-heading'));
    await page.getByRole('heading', { name: 'Gráficos', exact: true }).waitFor();
    await swipe(page.locator('.page-heading'));
    await page.getByRole('heading', { name: 'Límites de categoría', exact: true }).waitFor();
    assert.equal(await page.locator('#month').inputValue(), '2026-03');
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - budgetScroll) < 2, 'Previous page scroll is restored');
    await swipe(page.locator('.page-heading'));
    await page.getByRole('heading', { name: 'Historial', exact: true }).waitFor();
    await swipe(page.locator('.page-heading'));
    await page.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
    // Nested selectors return to their form first and preserve staged input.
    await entity(category).tap();
    await page.getByRole('button', { name: '+ Movimiento', exact: true }).click();
    await page.locator('[name="amount"]').fill('12,34');
    await swipe(page.locator('[name="amount"]'), { dx: 130 });
    assert.equal(await page.locator('#dialog').evaluate(element => element.open), true, 'Input text gestures do not close the form');
    await page.locator('#tag-picker-toggle').click();
    await page.locator('#tag-search').fill('Sin guardar');
    await page.locator('#tag-create').click();
    await swipe(page.locator('.dialog-heading'));
    assert.equal(await page.locator('#dialog').evaluate(element => element.open), true);
    assert.equal(await page.locator('#tag-picker').isVisible(), false);
    assert.equal(await page.locator('[name="amount"]').inputValue(), '12,34');
    assert.equal(await page.locator('#movement-tag-chips input:checked').count(), 1);
    // Horizontal tag scrolling retains the form and its own gesture.
    await swipe(page.locator('#movement-tag-chips'), { dx: 130 });
    assert.equal(await page.locator('#dialog').evaluate(element => element.open), true);
    await swipe(page.locator('.movement-extras > summary'));
    assert.equal(await page.locator('#dialog').evaluate(element => element.open), false);
    assert.equal(await page.locator('.entity-detail').count(), 1);
    await page.locator('.detail-toolbar [data-action="edit-entity"]').click();
    await page.locator('[name="name"]').fill('Cambio sin guardar');
    await page.locator('[data-action="toggle-icons"]').click();
    await swipe(page.locator('.dialog-heading'));
    assert.equal(await page.locator('#dialog').evaluate(element => element.open), true);
    assert.equal(await page.locator('#icon-picker').isVisible(), false);
    assert.equal(await page.locator('[name="name"]').inputValue(), 'Cambio sin guardar');
    await swipe(page.locator('.dialog-heading'));
    assert.equal(await page.locator('#dialog').evaluate(element => element.open), false);
    // Charts and movement rows retain their gestures rather than navigating.
    await swipe(page.locator('.chart-plot'));
    assert.equal(await page.locator('.entity-detail').count(), 1);
    await page.getByRole('button', { name: 'Todo el historial', exact: true }).click();
    await swipe(page.locator('.transaction').first());
    assert.equal(await page.locator('.entity-detail').count(), 1);
    await swipe(page.locator('.detail-totals'));
    await go('Importar/Exportar');
    await page.getByRole('button', { name: 'Restablecer todo', exact: true }).click();
    await page.locator('[name="confirm-reset"]').check();
    await swipe(page.locator('.dialog-heading'));
    assert.equal(await page.locator('#dialog').evaluate(element => element.open), false, 'Back cancels a destructive confirmation');
    // Native vertical scrolling remains available and never navigates back.
    await page.evaluate(() => scrollTo(0, 0));
    await swipe(page.locator('.page-heading'), { dx: 2, dy: -100 });
    assert.equal(await page.getByRole('heading', { name: 'Importar/Exportar', exact: true }).count(), 1);
    await page.waitForFunction(() => scrollY > 20);
    await swipe(page.locator('.page-heading'));
    await page.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
    // Explicit Inicio clears the navigation trail; root swipes stay inside the app.
    await go('Historial');
    await go('Inicio');
    await swipe(page.locator('.home-totals'));
    assert.equal(await page.locator('.home-totals').count(), 1);
    assert.ok(page.url().startsWith(base), 'A root swipe stays inside the application');
    await entity(account).scrollIntoViewIfNeeded();
    const mark = await entity(account).locator('.entity-mark').boundingBox();
    await touch('touchStart', [{ x: mark.x + 20, y: mark.y + 20 }]);
    await page.locator('#entity-edit-bar').waitFor();
    await touch('touchEnd');
    await swipe(page.locator('.home-totals'));
    assert.equal(await page.locator('#entity-edit-bar').isVisible(), false, 'Back exits entity editing without rearranging anything');
    await openMovementFromMenu(page);
    await swipe(page.locator('.movement-extras > summary'));
    assert.equal(await page.locator('#dialog').evaluate(element => element.open), false);
    assert.deepEqual(await saved(), state, 'Navigation never saves staged forms, deletes data or changes financial state');
    assert.deepEqual(errors, []);
    console.log('PASS: source/account/category headers, right-swipe back, short/left/cancelled gestures, menu-button click suppression, view stack, scroll/month restoration, nested tags/icons, form cancellation, chart/row gesture isolation and unchanged financial data at 320/390px.');
  } catch (error) {
    if (page) await page.screenshot({ path: '/tmp/gastalo-back-navigation-error.png', fullPage: true });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
