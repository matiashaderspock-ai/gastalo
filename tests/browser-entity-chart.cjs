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
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-10-25T12:00:00Z'));
    await page.goto(base);
    await page.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + '/fixtures/coinkeeper.csv', 'utf8'), '2026-01');
    const category = state.categories[0], sample = state.transactions.find(t => t.kind === 'expense');
    const months = A.entityEvolution(state, category.id, '2026-10').map(point => point.month);
    state.transactions = months.map((month, i) => ({ ...sample, id: `expense-${i}`, to_id: category.id,
      occurred_on: `${month}-08`, amount_cents: (i + 1) * 1234, note: '', tag_ids: [] }));
    state.transactions.push({ ...state.transactions.at(-1), id: 'known-hour', occurred_time: '13:20:00', occurred_timezone: 'America/La_Paz', amount_cents: 100 });
    state.accounts.push({ ...state.accounts[0], id: 'negative', name: 'Deuda', opening_balance_cents: -12345, opening_date: '2026-01-01' });
    state.categories.push({ id: 'empty-category', name: 'Sin gastos', currency: 'BOB', archived_at: null });
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
    const saved = () => page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open('gastalo');
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state');
        tx.objectStore('state').get('main').onsuccess = event => resolve(event.target.result.data);
        tx.oncomplete = () => db.close();
      };
    }));
    const cdp = await context.newCDPSession(page);
    const plot = page.locator('.chart-plot'), bubble = page.locator('.chart-tooltip');
    const point = async index => {
      const box = await plot.boundingBox();
      return { x: box.x + (90 + index * 45) / 610 * box.width, y: box.y + box.height * .55 };
    };
    const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [] });
    const readout = async (index, value) => {
      await page.waitForFunction(index => document.querySelector('.chart-plot').getAttribute('aria-valuenow') === String(index), index);
      assert.equal(await plot.getAttribute('aria-valuenow'), String(index));
      assert.equal(await bubble.innerText(), `${A.formatMonth(months[index])} · Bs ${new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100).replace('-', '−')}`);
      const tip = await bubble.boundingBox(), box = await plot.boundingBox();
      assert.ok(tip.x >= box.x - 1 && tip.x + tip.width <= box.x + box.width + 1, 'Tooltip stays inside the chart');
    };
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.locator(`[data-entity="${category.id}"]`).click();
      assert.equal(await page.getByText('Ver datos del gráfico', { exact: true }).count(), 0);
      assert.equal(await page.locator('.chart-data tbody tr').count(), 12, 'Screen readers retain the full data table');
      assert.deepEqual(await page.locator('.history-day h3').allTextContents(), ['08/10/26']);
      assert.deepEqual(await page.locator('.transaction-info > span').allTextContents(), ['13:20 · Gasto', 'Gasto'], 'Category rows show hour and type without repeating the date');
      assert.equal(await page.locator('.transaction').count(), 2, 'Legacy hours remain unknown while the movement type is shown');
      assert.equal(await bubble.isVisible(), false);
      await plot.scrollIntoViewIfNeeded();
      await touch('touchStart', await point(0));
      await readout(0, 1234);
      for (let index = 1; index < 12; index++) {
        await touch('touchMove', await point(index));
        await readout(index, (index + 1) * 1234 + (index === 11 ? 100 : 0));
      }
      await touch('touchEnd');
      await plot.focus();
      await plot.press('Home');
      await readout(0, 1234);
      await plot.press('ArrowRight');
      await readout(1, 2468);
      await plot.press('End');
      await readout(11, 14908);
      await plot.press('ArrowRight');
      await readout(11, 14908);
      await plot.press('Escape');
      assert.equal(await bubble.isVisible(), false);
      // Mouse hover does not require a button press.
      const middle = await point(4);
      await page.mouse.move(middle.x, middle.y);
      await readout(4, 6170);
      await page.mouse.move(0, 0);
      assert.equal(await bubble.isVisible(), false);
      await touch('touchStart', await point(7));
      await touch('touchCancel');
      assert.equal(await bubble.isVisible(), false, 'Cancellation clears the selection');
      if (width === 390) {
        await touch('touchStart', await point(9));
        await page.screenshot({ path: '/tmp/gastalo-category-chart.png', fullPage: true });
        await touch('touchEnd');
      }
      await page.getByRole('button', { name: 'Mes anterior', exact: true }).click();
      assert.equal(await bubble.isVisible(), false, 'Changing the month discards the old selection');
      await plot.focus();
      await plot.press('End');
      assert.match(await bubble.innerText(), /^09\/26/);
      await page.getByRole('button', { name: 'Mes siguiente', exact: true }).click();
      await page.getByRole('button', { name: 'Volver a Inicio', exact: true }).click();
    }
    // Vertical touch gestures continue scrolling the page instead of trapping it.
    await page.setViewportSize({ width: 390, height: 400 });
    await page.locator(`[data-entity="${category.id}"]`).click();
    await plot.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => scrollY), start = await point(5);
    await touch('touchStart', start);
    for (let i = 1; i <= 6; i++) await touch('touchMove', { x: start.x, y: start.y - i * 12 });
    await touch('touchEnd');
    await page.waitForFunction(before => scrollY > before + 20, scrollBefore);
    assert.equal(await bubble.isVisible(), false, 'Native scrolling cancels the chart selection');
    await page.getByRole('button', { name: 'Volver a Inicio', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    // Flat and negative series remain usable, with accurate accounting values.
    for (const [id, amount] of [['empty-category', 0], ['negative', -12345]]) {
      await page.locator(`[data-entity="${id}"]`).click();
      await plot.focus();
      await plot.press('End');
      await readout(11, amount);
      assert.ok(Number.isFinite(Number(await page.locator('.chart-selection circle').getAttribute('cy'))));
      await page.getByRole('button', { name: 'Volver a Inicio', exact: true }).click();
    }
    await page.locator('#app-menu > summary').click();
    await page.getByRole('button', { name: 'Historial', exact: true }).click();
    assert.match(await page.locator('.transaction-info > span').first().innerText(), /^08\/10\/26 · 13:20 · Gasto$/, 'General history retains date and movement type');
    assert.deepEqual(await saved(), state, 'Exploring the chart never writes financial data');
    assert.deepEqual(errors, []);
    console.log('PASS: category metadata, touch scrubbing of 12 months, mouse hover, keyboard, bounds, cancellation, month changes, zero/negative series, accessible table and unchanged financial data at 320/390/1280px.');
  } catch (error) {
    if (page) await page.screenshot({ path: '/tmp/gastalo-entity-chart-error.png', fullPage: true });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
