const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const { openMovementFromMenu, openRowActions } = require('./browser-helpers.cjs');
const A = require('../app.js');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    await verifyOrganization(browser);
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

// All writes below are confined to a fresh browser context with synthetic data.
async function verifyOrganization(browser) {
  for (const demo of [false, true]) {
    const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const database = demo ? 'gastalo-demo' : 'gastalo';
    const base = process.env.GASTALO_URL || 'http://127.0.0.1:4173/';
    await page.goto(demo ? new URL('?demo=1', base).href : base);
    await page.locator('#main h1').waitFor();
    const state = A.demoState(new Date().toISOString().slice(0, 10));
    for (const key of ['sources', 'accounts', 'categories']) state[key][0].archived_at = '2026-01-01';
    state.tags.unshift(...Array.from({ length: 118 }, (_, i) => ({
      id: `old-${i}`, name: i === 0 ? '<Archived> ' + 'Long name '.repeat(6) : `Old tag ${i}`, archived_at: '2026-01-01',
    })));
    const saved = () => page.evaluate(database => new Promise(resolve => {
      const r = indexedDB.open(database); r.onsuccess = () => {
        const db = r.result, tx = db.transaction('state');
        tx.objectStore('state').get('main').onsuccess = e => resolve(e.target.result.data);
        tx.oncomplete = () => db.close();
      };
    }), database);
    async function seed(data) {
      await page.evaluate(({ data, database }) => new Promise(resolve => {
        const r = indexedDB.open(database); r.onsuccess = () => {
          const db = r.result, tx = db.transaction('state', 'readwrite');
          tx.objectStore('state').put({ data, revision: 1 }, 'main');
          tx.oncomplete = () => { db.close(); resolve(); };
        };
      }), { data, database });
      await page.reload();
    }
    async function navigate(view) {
      await page.locator('#app-menu > summary').click();
      await page.locator(`[data-view="${view}"]`).click();
    }
    const tags = page.locator('[data-manage-key="tags"]');
    const archived = page.locator('#archived-tags');
    const activeRows = tags.locator(':scope > div > .manage-row');
    async function openTags() {
      await navigate('settings');
      if (!await tags.evaluate(el => el.open)) await tags.locator(':scope > summary').click();
    }
    const edit = id => tags.locator(`[data-action="edit-entity"][data-id="${id}"]`);
    const restore = id => archived.locator(`[data-action="restore-entity"][data-id="${id}"]`);
    async function saveEdit(archive) {
      await page.locator('[name="archived"]').setChecked(archive);
      await page.locator('#dialog button[type="submit"]').click();
      await page.locator('#dialog').waitFor({ state: 'hidden' });
    }
    await seed(state);
    await openTags();
    assert.equal(await tags.locator(':scope > summary').innerText(), demo ? 'Tags (1)' : 'Etiquetas (1)');
    assert.equal(await archived.evaluate(el => el.open), false);
    assert.equal(await archived.locator('> summary').innerText(), demo ? 'Archived (118)' : 'Archivadas (118)');
    assert.equal(await activeRows.count(), 1);
    assert.equal(await activeRows.first().locator('span').innerText(), 'Sample data');
    assert.equal(await archived.locator('.manage-row:visible').count(), 0);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await archived.locator('> summary').scrollIntoViewIfNeeded();
      const rect = await archived.locator('> summary').boundingBox();
      const activeRect = await activeRows.first().boundingBox();
      assert.ok(rect.height >= 44 && activeRect.y + activeRect.height <= 844, 'Active tag is reachable without scrolling past archives');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width === 390 && !demo) await page.screenshot({ path: '/tmp/gastalo-active-tags.png' });
    }
    await archived.locator('> summary').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#archived-tags').open);
    assert.equal(await archived.locator('.manage-row:visible').count(), 118);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const button of [restore('old-0'), edit('old-0')]) {
        const rect = await button.boundingBox();
        assert.ok(rect.width >= 44 && rect.height >= 44);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    if (!demo) await page.screenshot({ path: '/tmp/gastalo-archived-tags.png' });
    // Editing in the archive must retain archive state and disclosure state.
    await edit('old-0').click();
    await page.locator('[name="name"]').fill('Renamed archived tag');
    await saveEdit(true);
    assert.equal(await archived.evaluate(el => el.open), true);
    assert.match(await archived.locator('.manage-row').first().innerText(), /Renamed archived tag/);
    assert.equal((await saved()).tags[0].archived_at, '2026-01-01');
    // Repeated archive/restore moves the same linked record between both lists.
    for (let i = 0; i < 3; i++) {
      await archived.locator('> summary').click();
      await edit('demo-sample').click();
      await saveEdit(true);
      assert.equal(await activeRows.count(), 0);
      assert.match(await tags.locator(':scope > div').innerText(), demo ? /No active tags/ : /No hay etiquetas activas/);
      assert.equal(await tags.locator('[data-action="archive-tags"]').isDisabled(), true);
      assert.equal(await archived.evaluate(el => el.open), false);
      await archived.locator('> summary').click();
      assert.equal(await restore('demo-sample').isVisible(), true);
      await restore('demo-sample').click();
      await page.waitForFunction(() => document.querySelector('[data-manage-key="tags"] > summary').textContent.includes('(1)'));
      assert.equal(await activeRows.count(), 1);
      assert.equal(await restore('demo-sample').count(), 0);
      assert.equal(await archived.evaluate(el => el.open), true);
      assert.deepEqual((await saved()).transactions, state.transactions);
      assert.equal((await saved()).tags.length, 119);
    }
    await archived.locator('> summary').click();
    const beforeBulk = await saved();
    await tags.locator('[data-action="archive-tags"]').click();
    await page.locator('[name="confirm-archive-tags"]').check();
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator('#dialog').waitFor({ state: 'hidden' });
    assert.equal(await activeRows.count(), 0);
    await page.locator('#undo-button').click();
    await page.waitForFunction(() => document.querySelector('[data-manage-key="tags"] > summary').textContent.includes('(1)'));
    assert.deepEqual(await saved(), beforeBulk);
    // Navigation returns to a collapsed archive; browsing never writes state.
    await archived.locator('> summary').click();
    await navigate('home'); await openTags();
    assert.equal(await archived.evaluate(el => el.open), false);
    assert.deepEqual(await saved(), beforeBulk);
    for (const key of ['sources', 'accounts', 'categories']) {
      const group = page.locator(`[data-manage-key="${key}"]`);
      await group.locator('> summary').click();
      assert.equal(await group.locator('.manage-row:visible').count(), state[key].length);
      assert.equal(await group.locator(`[data-action="restore-entity"][data-id="${state[key][0].id}"]`).isVisible(), true);
    }
    await page.reload(); await openTags();
    assert.equal(await archived.evaluate(el => el.open), false);
    assert.equal(await activeRows.count(), 1);
    // Completely empty lists still offer creation and an explicit archive empty state.
    const empty = A.emptyState(); await seed(empty); await openTags();
    assert.equal(await tags.locator('[data-action="archive-tags"]').isDisabled(), true);
    await archived.locator('> summary').click();
    assert.match(await archived.innerText(), demo ? /No archived tags/ : /No hay etiquetas archivadas/);
    await tags.locator('[data-action="add"]').click();
    await page.locator('[name="name"]').fill('Created from empty');
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator('#dialog').waitFor({ state: 'hidden' });
    assert.equal(await activeRows.locator('span').innerText(), 'Created from empty');
    assert.match(await archived.locator('> summary').innerText(), /\(0\)/);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('PASS tag organization in Spanish/English: 118 archives hidden, counts, keyboard, 320/390/768, edit, 3 archive/restore cycles, bulk undo, persistence, navigation, empty/create and other entities');
}
