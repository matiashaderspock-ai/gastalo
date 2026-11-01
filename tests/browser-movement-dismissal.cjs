/* Synthetic state only: compact layout, deliberate backdrop taps and draft safety. */
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const A = require('../app.js');
const { openMovementFromMenu } = require('./browser-helpers.cjs');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  let page;
  try {
    page = await browser.newPage({ ...devices['iPhone 13'], reducedMotion: 'reduce' });
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
    const dialog = page.locator('#dialog');
    const cancel = page.getByRole('button', { name: 'Cancelar', exact: true });
    const closed = async () => {
      await dialog.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => !document.activeElement.closest('#dialog'));
      assert.deepEqual(await saved(), state, 'Dismissing never saves a transaction or pending tag');
    };
    const tapOutside = async () => {
      const box = await dialog.boundingBox();
      await page.touchscreen.tap(5, box.y + 20);
    };
    await openMovementFromMenu(page);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.evaluate(() => {
        const rect = s => document.querySelector(s).getBoundingClientRect();
        const tags = rect('.movement-tags'), body = rect('#dialog-body'), heading = rect('.dialog-heading'), close = rect('.dialog-actions [data-action="close"]');
        return { width: tags.width, bodyWidth: body.width, top: tags.top, bodyTop: body.top, headingHeight: heading.height,
          cancelHeight: close.height, overflow: document.documentElement.scrollWidth > innerWidth,
          name: document.querySelector('#dialog-title').textContent, cardHeight: rect('#dialog').height };
      });
      assert.equal(layout.headingHeight, 0);
      assert.equal(layout.top, layout.bodyTop);
      assert.ok(Math.abs(layout.width - layout.bodyWidth) < 1);
      assert.ok(layout.cancelHeight >= 44);
      assert.equal(layout.overflow, false);
      assert.equal(layout.name, 'Nuevo movimiento');
      assert.ok(layout.cardHeight <= 320, 'No empty close row');
      assert.equal(await page.locator('.dialog-heading [data-action="close"]').isVisible(), false);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '/tmp/gastalo-v58-compact-movement.png' });
    // Dialog padding is inside the card even though its click target is the dialog.
    let box = await dialog.boundingBox();
    await page.mouse.click(box.x + 3, box.y + 3);
    assert.ok(await dialog.isVisible());
    async function drag(points) {
      await page.mouse.move(...points[0]); await page.mouse.down();
      for (const point of points.slice(1)) await page.mouse.move(...point, { steps: 4 });
      await page.mouse.up(); assert.ok(await dialog.isVisible(), 'A crossing/drag must not dismiss');
    }
    await drag([[5, box.y + 20], [box.x + 8, box.y + 20]]);
    await drag([[box.x + 8, box.y + 20], [5, box.y + 20]]);
    await drag([[5, box.y + 20], [box.x + 8, box.y + 20], [5, box.y + 20]]);
    await drag([[5, box.y + 20], [5, box.y + 90]]);
    // Touch swipes beginning on the backdrop must not enter back-navigation.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 5, y: box.y + 20 }] });
    for (let x = 25; x < 220; x += 25) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: box.y + 20 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(await dialog.isVisible());
    await page.locator('[name="from"]').selectOption(state.accounts[0].id);
    await page.locator('[name="to"]').selectOption(state.categories[0].id);
    await page.locator('[name="amount"]').fill('12,34');
    await page.locator('.movement-extras > summary').click();
    await page.locator('[name="note"]').fill('Unsaved synthetic note');
    await page.locator('#tag-picker-toggle').click();
    await page.locator('#tag-search').fill('Pending synthetic tag');
    await page.locator('#tag-create').click();
    assert.ok(await page.locator('.dialog-heading [data-action="close"]').isVisible());
    await tapOutside();
    assert.ok(await dialog.isVisible(), 'Backdrop closes picker before form');
    assert.equal(await page.locator('#tag-picker').isVisible(), false);
    assert.equal(await page.locator('[name="amount"]').inputValue(), '12,34');
    await tapOutside(); await closed();
    await page.reload();
    for (const method of ['cancel', 'escape', 'backdrop']) {
      await openMovementFromMenu(page);
      await page.locator('#recover-draft').click();
      assert.equal(await page.locator('[name="amount"]').inputValue(), '12,34');
      assert.equal(await page.locator('[name="note"]').inputValue(), 'Unsaved synthetic note');
      assert.equal(await page.locator('[name="from"]').inputValue(), state.accounts[0].id);
      assert.equal(await page.locator('[name="to"]').inputValue(), state.categories[0].id);
      assert.equal(await page.locator('#movement-tag-chips label').filter({ hasText: 'Pending synthetic tag' }).locator('input').isChecked(), true);
      await page.locator('#tag-picker-toggle').click();
      await page.locator('.dialog-heading [data-action="close"]').click();
      assert.ok(await dialog.isVisible());
      assert.equal(await page.locator('#tag-picker').isVisible(), false);
      // Keyboard tabbing stays inside the native modal.
      await cancel.focus(); await page.keyboard.press('Tab');
      assert.ok(await page.evaluate(() => !!document.activeElement.closest('#dialog')));
      if (method === 'cancel') { await cancel.focus(); await page.keyboard.press('Enter'); }
      else if (method === 'escape') await page.keyboard.press('Escape');
      else await tapOutside();
      await closed();
    }
    assert.deepEqual(errors, []);
    console.log('PASS compact 320/390/768 layout; inside/crossing/drag/touch safety; backdrop picker-first dismissal; persistent drafts including pending tags; keyboard Cancel/Escape/focus and no transaction writes.');
  } catch (e) {
    if (page) await page.screenshot({ path: '/tmp/gastalo-dismissal-error.png' });
    throw e;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
