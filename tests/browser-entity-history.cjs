/* Synthetic entities only; no screenshot names, amounts or transaction data. */
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const A = require('../app.js');
const base = process.env.GASTALO_URL || 'http://127.0.0.1:4173/';

async function verifyEntityHistory(browser) {
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-BO', reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.clock.setFixedTime(new Date('2026-02-15T12:00:00Z'));
    await page.goto(base); await page.locator('.entity-grid').first().waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + '/fixtures/coinkeeper.csv', 'utf8'));
    const [bank, cash] = state.accounts, source = state.sources[0], category = state.categories[0], sample = state.transactions[0];
    bank.name = 'Desde Banco & <reserva>'; source.name = 'Desde Ingreso "sintético"';
    cash.name = 'Cuenta auxiliar'; category.name = 'Compras sintéticas';
    state.transactions = [];
    for (const [i, month] of ['2026-01', '2026-02'].entries()) {
      for (const [kind, from, to] of [['income', source, bank], ['expense', bank, category], ['transfer', bank, cash]]) {
        state.transactions.push({ ...sample, id: `${kind}-${i}`, kind, from_id: from.id, to_id: to.id,
          occurred_on: `${month}-10`, amount_cents: 1000 + i * 100, note: 'Nota sintética', tag_ids: [] });
      }
    }
    for (let i = 0; i < 104; i++) state.transactions.push({ ...state.transactions[1], id: `older-${i}` });
    A.validateState(state);
    await page.evaluate(data => new Promise(resolve => {
      const request = indexedDB.open('gastalo'); request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state', 'readwrite');
        tx.objectStore('state').put({ data, revision: 1 }, 'main');
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    }), state);
    await page.reload(); await page.locator('.entity-grid').first().waitFor();
    const go = async name => {
      await page.locator('#app-menu > summary').click();
      await page.getByRole('button', { name, exact: true }).click();
    };
    const open = item => page.locator(`[data-entity="${item.id}"]`).click();
    const back = () => page.getByRole('button', { name: 'Volver a Inicio', exact: true }).click();
    const scope = name => page.getByRole('button', { name, exact: true });
    const rows = () => page.locator('.entity-history .transaction');
    const title = id => page.locator(`[data-swipe-transaction="${id}"] .transaction-info > strong`);
    const relevant = item => state.transactions.filter(t => t.from_id === item.id || t.to_id === item.id);
    const checks = [];
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const item of [bank, cash, source, category]) {
        await open(item);
        if (!checks.length) console.log('Entity history observation: ' + JSON.stringify({
          allPressed: await scope('Todo el historial').getAttribute('aria-pressed'),
          incomingLabel: await title('income-1').textContent(), expectedSourceName: source.name,
        }));
        assert.equal(await scope('Todo el historial').getAttribute('aria-pressed'), 'true');
        assert.equal(await scope('Este mes').getAttribute('aria-pressed'), 'false');
        assert.equal(await rows().count(), Math.min(100, relevant(item).length));
        const summary = await page.locator('.detail-totals').innerText();
        const chart = await page.locator('.entity-chart tbody').innerText();
        if (item.id === bank.id) {
          assert.equal(await title('income-1').textContent(), source.name, 'Only the generated prefix is removed; literal Desde and punctuation in names survive');
          assert.equal(await title('expense-1').textContent(), 'A ' + category.name, 'Outgoing rows keep their destination direction');
          assert.equal(await title('transfer-1').textContent(), 'A ' + cash.name);
        } else if (item.id === cash.id) assert.equal(await title('transfer-1').textContent(), bank.name);
        else if (item.id === category.id) assert.equal(await title('expense-1').textContent(), bank.name);
        else assert.equal(await title('income-1').textContent(), 'A ' + bank.name);
        if (relevant(item).length > 100) {
          await scope('Mostrar 100 más').click();
          assert.equal(await rows().count(), relevant(item).length);
        }
        await scope('Este mes').click();
        assert.equal(await rows().count(), relevant(item).filter(t => t.occurred_on.startsWith('2026-02')).length);
        assert.equal(await page.locator('.detail-totals').innerText(), summary, 'History scope does not change monthly totals');
        assert.equal(await page.locator('.entity-chart tbody').innerText(), chart, 'History scope does not change chart dates');
        await back(); await open(item);
        assert.equal(await scope('Todo el historial').getAttribute('aria-pressed'), 'true', 'Reopening after a manual month selection resets the default');
        assert.equal(await rows().count(), Math.min(100, relevant(item).length), 'Reopening also resets pagination');
        assert.equal(await page.locator('#month').inputValue(), '2026-02');
        await back(); checks.push({ width, type: item === category ? 'category' : item === source ? 'source' : 'account' });
      }
    }
    // Existing shared date/kind filters stay independent of entity history defaults.
    await go('Historial'); await page.locator('#shared-filters > summary').click();
    await page.locator('#f-start').fill('2026-01-01'); await page.locator('#f-end').fill('2026-01-31');
    await page.locator('#f-kind').selectOption('income'); await scope('Aplicar filtros').click();
    assert.equal(await page.locator('.transaction').count(), 1);
    assert.equal(await page.locator('.transaction-info > strong').textContent(), source.name + ' → ' + bank.name);
    assert.equal(await page.locator('#shared-filters label').first().evaluate(label => label.firstChild.textContent), 'Desde', 'The date-filter label is retained');
    await go('Inicio'); await open(bank);
    assert.equal(await scope('Todo el historial').getAttribute('aria-pressed'), 'true');
    assert.equal(await rows().count(), 100, 'General date/kind filters do not narrow entity history');
    await scope('Mes anterior').click();
    assert.equal(await page.locator('#month').inputValue(), '2026-01');
    assert.equal(await scope('Este mes').getAttribute('aria-pressed'), 'true', 'Manually selecting a month retains its existing month-scoped behavior');
    await scope('Mes siguiente').click(); await back();
    await go('Historial');
    assert.equal(await page.locator('#f-start').inputValue(), '2026-01-01');
    assert.equal(await page.locator('#f-end').inputValue(), '2026-01-31');
    assert.equal(await page.locator('#f-kind').inputValue(), 'income');
    assert.equal(await page.locator('.transaction').count(), 1);
    const saved = await page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open('gastalo'); request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state'); tx.objectStore('state').get('main').onsuccess = event => resolve(event.target.result);
        tx.oncomplete = () => db.close();
      };
    }));
    assert.deepEqual(saved, { data: state, revision: 1 }, 'Labels and history navigation never write financial data');
    assert.deepEqual(errors, []);
    console.log('PASS entity history defaults and labels: ' + JSON.stringify({ checks, reopenedAllHistory: checks.length, financialStateUnchanged: true, independentFilters: true, pagination: true }));
  } catch (error) {
    await page.screenshot({ path: '/tmp/gastalo-entity-history-error.png' }); throw error;
  } finally { await context.close(); }
}
module.exports = { verifyEntityHistory };
if (require.main === module) (async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try { await verifyEntityHistory(browser); } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
