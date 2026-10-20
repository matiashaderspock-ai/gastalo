/* Real touch gestures, IndexedDB and compact movement tags, using synthetic data. */
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
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + '/fixtures/coinkeeper.csv', 'utf8'), '2026-01');
    for (const [key, count] of [['sources', 16], ['accounts', 20], ['categories', 8]])
      while (state[key].length < count) {
        const i = state[key].length;
        state[key].push({ ...state[key][0], id: `${key}-${i}`, name: `${key} ${i}` });
      }
    ['Habitual', 'Café', 'Mercado', 'Viajes', 'Extra A', 'Extra B', 'Extra C', 'Rara'].forEach((name, i) => state.tags.push({ id: `tag-${i}`, name, archived_at: null }));
    for (let i = 0; i < 20; i++) state.transactions.push({ ...state.transactions[2], id: `usage-${i}`, tag_ids: [i < 14 ? 'tag-0' : 'tag-1', i < 5 ? 'tag-2' : 'tag-3'] });
    await page.evaluate(data => new Promise(resolve => {
      const r = indexedDB.open('gastalo');
      r.onsuccess = () => { const db = r.result, tx = db.transaction('state', 'readwrite'); tx.objectStore('state').put({ data, revision: 1 }, 'main'); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), state);
    await page.reload();
    await page.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
    const saved = () => page.evaluate(() => new Promise(resolve => {
      const r = indexedDB.open('gastalo');
      r.onsuccess = () => { const db = r.result, tx = db.transaction('state'); tx.objectStore('state').get('main').onsuccess = e => resolve(e.target.result.data); tx.oncomplete = () => db.close(); };
    }));
    const position = () => page.evaluate(() => ({ x: [...document.querySelectorAll('.entity-strip')].map(e => e.scrollLeft), y: scrollY }));
    async function samePosition(before, label) {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const after = await position();
      before.x.forEach((x, i) => assert.ok(Math.abs(x - after.x[i]) < 3, `${label}: row ${i} moved ${x} -> ${after.x[i]}`));
      assert.ok(Math.abs(before.y - after.y) < 32, `${label}: page moved ${before.y} -> ${after.y}`);
    }
    async function submit() { await page.locator('#dialog button[type="submit"]').click(); await page.locator('#dialog').waitFor({ state: 'hidden' }); }
    async function scrolled() {
      await page.locator('.row-0 .entity-strip').evaluate(e => { e.scrollLeft = 700; });
      await page.locator('.row-1 .entity-strip').evaluate(e => { e.scrollLeft = 750; });
    }
    await scrolled();
    const before = await position();
    await page.locator('[data-action="movement"]').first().click();
    assert.equal(await page.locator('#tag-picker').isVisible(), false);
    assert.equal(await page.locator('#movement-tag-chips label').count(), 6);
    assert.equal(await page.locator('#movement-tag-chips input:checked').count(), 0, 'Suggestions are not automatically selected');
    assert.deepEqual((await page.locator('#movement-tag-chips label').allTextContents()).slice(0, 4), ['Viajes', 'Habitual', 'Café', 'Mercado']);
    assert.ok(await page.locator('.movement-tags').evaluate(e => Boolean(e.compareDocumentPosition(document.querySelector('[name="from"]')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    await page.locator('[name="from"]').selectOption('accounts-11');
    await page.locator('[name="to"]').selectOption(state.categories[0].id);
    await page.locator('[name="amount"]').fill('12,34');
    await page.locator('#movement-tag-chips [value="tag-0"]').check();
    await page.locator('#tag-picker-toggle').click();
    await page.locator('#tag-search').fill('cafe');
    assert.equal(await page.locator('#tag-picker-list label').innerText(), 'Café');
    await page.locator('#tag-search').fill('rara');
    await page.locator('#tag-picker-list input').check();
    await page.locator('#tag-search').fill('Peaje');
    await page.locator('#tag-create').click();
    assert.equal((await saved()).tags.some(t => t.name === 'Peaje'), false, 'Tag creation is staged until the movement is saved');
    await page.locator('#tag-search').fill('Peaje');
    assert.equal(await page.locator('#tag-create').isVisible(), false, 'No duplicate tag creation');
    await page.locator('#tag-search').fill('');
    await page.screenshot({ path: '/tmp/gastalo-tag-picker.png' });
    await page.locator('#tag-picker-done').click();
    await page.screenshot({ path: '/tmp/gastalo-movement-tags.png' });
    await submit();
    await samePosition(before, 'expense with tags');
    let data = await saved();
    const expense = data.transactions.at(-1), created = data.tags.find(t => t.name === 'Peaje');
    assert.equal(expense.kind, 'expense');
    assert.equal(expense.amount_cents, 1234);
    assert.deepEqual(expense.tag_ids.sort(), ['tag-0', 'tag-7', created.id].sort());
    // A staged tag disappears if the movement is cancelled.
    await page.locator('[data-action="movement"]').first().click();
    await page.locator('#tag-picker-toggle').click();
    await page.locator('#tag-search').fill('Never saved');
    await page.locator('#tag-search').press('Enter');
    assert.equal(await page.locator('#dialog').isVisible(), true);
    await page.locator('.dialog-heading [data-action="close"]').click();
    assert.equal(await page.locator('#tag-picker').isVisible(), false, 'Picker close returns to the movement form');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal((await saved()).tags.some(t => t.name === 'Never saved'), false);
    const cdp = await context.newCDPSession(page);
    const mark = id => page.locator(`[data-entity="${id}"] .entity-mark`);
    const center = async id => { const b = await mark(id).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    async function drag(from, to, edge = false) {
      await scrolled();
      await mark(from).scrollIntoViewIfNeeded();
      await mark(to).scrollIntoViewIfNeeded();
      const initial = await position(), p = await center(from), q = await center(to);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
      for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + (q.x - p.x) * i / 8, y: p.y + (q.y - p.y) * i / 8 }] });
      if (edge) {
        const strip = page.locator('.row-1 .entity-strip'), box = await strip.boundingBox();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width - 6, y: box.y + 60 }] });
        const start = (await position()).x[1];
        await page.waitForFunction(x => document.querySelector('.row-1 .entity-strip').scrollLeft > x + 100, start);
        const destination = await strip.locator('.entity-mark').evaluateAll(es => { const row = es[0].closest('.entity-strip').getBoundingClientRect(); return es.map(e => e.getBoundingClientRect()).filter(r => r.left > row.left + 35 && r.right < row.right - 35).at(-1).toJSON(); });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: destination.x + destination.width / 2, y: destination.y + destination.height / 2 }] });
      }
      const expected = await position(); expected.y = initial.y;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.getByRole('heading', { name: 'Nuevo movimiento', exact: true }).waitFor();
      await page.locator('[name="amount"]').fill('1,25');
      await submit();
      await samePosition(expected, edge ? 'edge-scrolled transfer' : 'dragged movement');
    }
    await drag('sources-11', 'accounts-12');
    await drag('accounts-11', 'accounts-12');
    await drag('accounts-11', state.categories[1]?.id || state.categories[0].id);
    await drag('sources-11', 'accounts-12', true);
    data = await saved();
    assert.deepEqual(data.transactions.slice(-4).map(t => t.kind), ['income', 'transfer', 'expense', 'income']);
    assert.ok(data.transactions.slice(-4).every(t => t.amount_cents === 125 && t.tag_ids.length === 0));
    await page.locator('#app-menu > summary').click();
    await page.getByRole('button', { name: 'Historial', exact: true }).click();
    await page.locator(`[data-action="edit-transaction"][data-id="${expense.id}"]`).click();
    assert.equal(await page.locator('#movement-tag-chips input:checked').count(), 3, 'Editing preserves selected uncommon and new tags');
    await submit();
    assert.deepEqual((await saved()).transactions.find(t => t.id === expense.id).tag_ids.sort(), expense.tag_ids.sort());
    assert.deepEqual(errors, []);
    console.log('PASS: popular tag chips, search/accent matching, multi-select, staged creation/cancel, edit round-trip, expense/income/transfer and edge-scroll position retention.');
  } catch (error) { if (page) await page.screenshot({ path: '/tmp/gastalo-movement-error.png', fullPage: true }); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
