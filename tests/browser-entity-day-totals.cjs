const { openRowActions } = require("./browser-helpers.cjs");
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
    await page.clock.setFixedTime(new Date('2026-02-15T12:00:00Z'));
    await page.goto(base);
    await page.getByRole('heading', { name: 'Un mes más claro.' }).waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + '/fixtures/coinkeeper.csv', 'utf8'));
    const [bank, cash] = state.accounts, source = state.sources[0], category = state.categories[0], sample = state.transactions[0];
    state.transactions = [];
    const add = (id, kind, from, to, amount, date = '2026-02-10', time = '') => state.transactions.push({ ...sample,
      id, kind, from_id: from.id, to_id: to.id, amount_cents: amount, occurred_on: date, note: '', tag_ids: [],
      ...A.transactionTimeFields(time, 'America/La_Paz') });
    for (let i = 0; i < 120; i++) add(`income-${i}`, 'income', source, bank, 100, '2026-02-10', i === 0 ? '09:15:00' : '');
    add('expense', 'expense', bank, category, 3500, '2026-02-10', '19:00:00');
    add('transfer-out', 'transfer', bank, cash, 2500, '2026-02-10', '18:00:00');
    add('transfer-in', 'transfer', cash, bank, 1000, '2026-02-10', '17:00:00');
    add('zero-income', 'income', source, bank, 1000, '2026-02-11');
    add('zero-expense', 'expense', bank, category, 1000, '2026-02-11');
    add('old-expense', 'expense', bank, category, 777, '2026-01-03');
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
    const day = date => page.locator(`.history-day:has(time[datetime="${date}"])`);
    const total = date => day(date).locator('.history-day-total');
    const row = id => page.locator(`[data-swipe-transaction="${id}"]`);
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const [item, expected, tone] of [[bank, 'Bs 70,00', 'positive'], [cash, 'Bs 15,00', 'positive'], [source, 'Bs 120,00', 'positive'], [category, 'Bs 35,00', 'negative']]) {
        await page.locator(`[data-entity="${item.id}"]`).click();
        assert.equal(await total('2026-02-10').innerText(), expected);
        assert.equal(await total('2026-02-10').getAttribute('aria-label'), `Total neto del día: ${tone === "positive" ? "positivo" : "negativo"}, ${expected}`);
        assert.equal(await total('2026-02-10').evaluate(element => getComputedStyle(element).color), tone === 'positive' ? 'rgb(35, 99, 82)' : 'rgb(163, 49, 49)');
        const amounts = await page.locator('[data-swipe-transaction]').evaluateAll(rows => rows.map(row => {
          const amount = row.querySelector('.transaction-end > strong');
          return { id: row.dataset.swipeTransaction, text: amount.textContent,
            color: getComputedStyle(amount).color, label: amount.getAttribute('aria-label') };
        }));
        for (const amount of amounts) {
          const transaction = state.transactions.find(t => t.id === amount.id);
          const positive = A.entityMovementAmount(transaction, item.id) > 0;
          assert.match(amount.text, /^Bs \d/);
          assert.doesNotMatch(amount.text, /[+−-]/);
          assert.equal(amount.color, positive ? 'rgb(35, 99, 82)' : 'rgb(163, 49, 49)');
          assert.match(amount.label, positive ? /positivo/ : /negativo/);
        }
        assert.equal(await day('2026-02-10').locator('h3').innerText(), '10/02/26');
        const dateBox = await day('2026-02-10').locator('h3').boundingBox(), amountBox = await total('2026-02-10').boundingBox();
        assert.ok(Math.abs(dateBox.y - amountBox.y) < 2 && amountBox.x > dateBox.x + dateBox.width, 'Date and net amount share one line');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        for (const metadata of await page.locator('.transaction-info > span').allTextContents()) {
          assert.match(metadata, /^(?:\d{2}:\d{2} · )?(Ingreso|Gasto|Transferencia)$/);
          assert.doesNotMatch(metadata, /\d{2}\/\d{2}\/\d{2}/);
        }
        if (item.id === bank.id) {
          assert.equal(await total('2026-02-11').innerText(), 'Bs 0,00');
          assert.equal(await total('2026-02-11').evaluate(element => getComputedStyle(element).color), 'rgb(82, 98, 87)');
          assert.equal(await total('2026-02-11').getAttribute('aria-label'), 'Total neto del día: cero, Bs 0,00');
          assert.equal(await page.locator('.transaction').count(), 100);
          assert.equal(await row('expense').locator('.transaction-info > span').innerText(), '19:00 · Gasto');
          assert.equal(await row('transfer-out').locator('.transaction-info > span').innerText(), '18:00 · Transferencia');
          assert.equal(await row('income-0').locator('.transaction-info > span').innerText(), '09:15 · Ingreso');
          await page.getByRole('button', { name: 'Mostrar 100 más', exact: true }).click();
          assert.equal(await page.locator('.transaction').count(), 125);
          assert.equal(await total('2026-02-10').innerText(), 'Bs 70,00', 'Loading more does not change the complete-day total');
          if (width === 390) {
            await day('2026-02-10').locator('.history-day-heading').scrollIntoViewIfNeeded();
            await page.screenshot({ path: '/tmp/gastalo-entity-day-totals.png' });
          }
        }
        await page.getByRole('button', { name: 'Volver a Inicio', exact: true }).click();
      }
    }
    await page.locator(`[data-entity="${bank.id}"]`).click();
    await openRowActions(row('expense').locator('[data-action="edit-transaction"]'));
    await row('expense').locator('[data-action="edit-transaction"]').click();
    await page.locator('[name="amount"]').fill('45,00');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.locator('#dialog').waitFor({ state: 'hidden' });
    assert.equal(await total('2026-02-10').innerText(), 'Bs 60,00');
    await openRowActions(row('transfer-in').locator('[data-action="delete-transaction"]'));
    await row('transfer-in').locator('[data-action="delete-transaction"]').click();
    await page.waitForFunction(() => document.querySelector('.history-day:has(time[datetime="2026-02-10"]) .history-day-total').textContent === 'Bs 50,00');
    await page.locator('#toast [data-action="undo"]').click();
    await page.waitForFunction(() => document.querySelector('.history-day:has(time[datetime="2026-02-10"]) .history-day-total').textContent === 'Bs 60,00');
    await page.getByRole('button', { name: 'Mes anterior', exact: true }).click();
    assert.equal(await total('2026-01-03').innerText(), 'Bs 7,77');
    await page.getByRole('button', { name: 'Mes siguiente', exact: true }).click();
    assert.equal(await total('2026-02-10').innerText(), 'Bs 60,00');
    await page.getByRole('button', { name: 'Todo el historial', exact: true }).click();
    await page.getByRole('button', { name: 'Mostrar 100 más', exact: true }).click();
    assert.equal(await total('2026-01-03').innerText(), 'Bs 7,77');
    assert.equal(await total('2026-02-10').innerText(), 'Bs 60,00');
    await openRowActions(row('expense').locator('[data-action="edit-transaction"]'));
    await row('expense').locator('[data-action="edit-transaction"]').click();
    await page.locator('[name="amount"]').fill('135,00');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.locator('#dialog').waitFor({ state: 'hidden' });
    assert.equal(await total('2026-02-10').innerText(), 'Bs 30,00');
    assert.equal(await total('2026-02-10').evaluate(element => getComputedStyle(element).color), 'rgb(163, 49, 49)', 'Editing can turn a green net into a red net');
    assert.equal(await total('2026-02-10').getAttribute('aria-label'), 'Total neto del día: negativo, Bs 30,00');
    await page.getByRole('button', { name: 'Volver a Inicio', exact: true }).click();
    await page.locator('#app-menu > summary').click();
    await page.getByRole('button', { name: 'Historial', exact: true }).click();
    const generalAmounts = await page.locator('.transaction').evaluateAll(rows => rows.map(row => ({
      kind: row.querySelector('.transaction-symbol').className.split(' ').at(-1),
      text: row.querySelector('.transaction-end > strong').textContent,
      color: getComputedStyle(row.querySelector('.transaction-end > strong')).color,
    })));
    assert.ok(generalAmounts.some(amount => amount.kind === 'transfer'));
    for (const amount of generalAmounts) {
      assert.doesNotMatch(amount.text, /[+−-]/);
      assert.equal(amount.color, { income: 'rgb(35, 99, 82)', expense: 'rgb(163, 49, 49)', transfer: 'rgb(82, 98, 87)' }[amount.kind]);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: signless red/green/neutral amounts and accessible polarity across all entities and general history; complete daily totals, pagination, sign-changing edits, deletion/undo and month/all-history scopes at 320/390/1280px.');
  } catch (error) {
    if (page) await page.screenshot({ path: '/tmp/gastalo-day-totals-error.png', fullPage: true });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
