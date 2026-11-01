const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const { openMovementFromMenu, openRowActions } = require('./browser-helpers.cjs');
const A = require('../app.js');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ ...devices['iPhone 13'], reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.GASTALO_URL || 'http://127.0.0.1:4173/');
    await page.locator('#main h1').waitFor();
    const state = A.demoState(new Date().toISOString().slice(0, 10));
    await page.evaluate(data => new Promise(resolve => {
      const r = indexedDB.open('gastalo'); r.onsuccess = () => {
        const db = r.result, tx = db.transaction('state', 'readwrite');
        tx.objectStore('state').put({ data, revision: 1 }, 'main'); tx.oncomplete = () => { db.close(); resolve(); };
      };
    }), state);
    const saved = () => page.evaluate(() => new Promise(resolve => {
      const r = indexedDB.open('gastalo'); r.onsuccess = () => {
        const db = r.result, tx = db.transaction('state');
        tx.objectStore('state').get('main').onsuccess = e => resolve(e.target.result.data); tx.oncomplete = () => db.close();
      };
    }));
    await page.reload();
    async function navigate(view) { await page.locator('#app-menu > summary').click(); await page.locator(`[data-view="${view}"]`).click(); }
    await openMovementFromMenu(page);
    await page.locator('#movement-tag-chips label').click();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.waitForFunction(() => !document.activeElement.closest('#dialog'));
    await navigate('settings');
    await page.locator('[data-manage-key="tags"] > summary').click();
    const archive = page.locator('[data-action="archive-tags"]');
    await archive.click();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.deepEqual(await saved(), state);
    await archive.click();
    await page.locator('#dialog button[type="submit"]').click();
    assert.equal(await page.locator('#dialog').isVisible(), true, 'Confirmation required');
    await page.locator('[name="confirm-archive-tags"]').check();
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator('#dialog').waitFor({ state: 'hidden' });
    assert.deepEqual((await saved()).transactions, state.transactions);
    assert.ok((await saved()).tags.every(t => t.archived_at));
    await page.reload();
    await openMovementFromMenu(page);
    await page.locator('#recover-draft').click();
    assert.equal(await page.locator('#movement-tag-chips input').count(), 0, 'Recovering a draft cannot revive archived tags');
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.evaluate(() => {
        const rect = s => document.querySelector(s).getBoundingClientRect();
        const tags = rect('.movement-tags'), body = rect('#dialog-body'), close = rect('.dialog-actions [data-action="close"]');
        return { width: tags.width, bodyWidth: body.width, top: tags.top, closeHeight: close.height, closeWidth: close.width, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.ok(Math.abs(layout.width - layout.bodyWidth) < 1);
      assert.ok(layout.closeHeight >= 44);
      assert.ok(layout.closeWidth >= 44);
      assert.equal(layout.overflow, false);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '/tmp/gastalo-archive-tags-layout.png' });
    await page.locator('#tag-picker-toggle').click();
    await page.locator('#tag-search').fill('Sample data');
    assert.equal(await page.locator('#tag-picker-list input').count(), 0, 'Search cannot revive archived tags');
    await page.locator('#tag-create').click();
    await page.locator('#tag-picker-done').click();
    await page.locator('[name="from"]').selectOption(state.accounts[0].id);
    await page.locator('[name="to"]').selectOption(state.categories[0].id);
    await page.locator('[name="amount"]').fill('2');
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator('#dialog').waitFor({ state: 'hidden' });
    const data = await saved(), newTag = data.tags.find(t => !t.archived_at);
    assert.equal(newTag.name, 'Sample data'); assert.notEqual(newTag.id, 'demo-sample');
    assert.deepEqual(data.transactions.slice(0, state.transactions.length), state.transactions);
    assert.deepEqual(data.transactions.at(-1).tag_ids, [newTag.id]);
    await navigate('history');
    assert.ok(await page.locator('.transaction .tags').filter({ hasText: 'Sample data' }).count());
    await page.locator('#shared-filters > summary').click();
    await page.locator('#f-tags').selectOption('demo-sample');
    await page.locator('[data-action="apply-filters"]').click();
    assert.equal(await page.locator('.transaction').count(), state.transactions.length);
    const edit = page.locator(`[data-action="edit-transaction"][data-id="${state.transactions[0].id}"]`);
    await openRowActions(edit); await edit.click();
    assert.equal(await page.locator('#movement-tag-chips input[value="demo-sample"]:checked').count(), 1);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    for (const close of ['cancel', 'escape']) {
      await openMovementFromMenu(page);
      await page.locator('#tag-picker-toggle').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#tag-picker').isVisible(), false);
      if (close === 'cancel') await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      else await page.keyboard.press('Escape');
      await page.locator('#dialog').waitFor({ state: 'hidden' });
      await page.waitForFunction(() => !document.activeElement.closest('#dialog'));
    }
    assert.deepEqual(errors, []);
    console.log('PASS archive confirmation/cancel, durable empty active list, historical display/filter/edit, reused name, full-width 320/390/768 and repeated dismissal');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
