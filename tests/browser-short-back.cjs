/* Trusted-touch recognition traces and synthetic financial state only. */
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const A = require('../app.js');
const { openMovementFromMenu } = require('./browser-helpers.cjs');
const base = process.env.GASTALO_URL || 'http://127.0.0.1:4173/';
const profileOnly = process.env.GASTALO_SHORT_BACK_PROFILE === '1';
async function verifyShortBack(browser) {
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-BO', serviceWorkers: 'block', reducedMotion: 'no-preference' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.clock.setFixedTime(new Date('2026-02-15T12:00:00Z'));
    await page.goto(base); await page.locator('.entity-grid').first().waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + '/fixtures/coinkeeper.csv', 'utf8'), '2026-01');
    const expense = state.transactions.find(t => t.kind === 'expense');
    state.transactions = Array.from({ length: 120 }, (_, i) => ({ ...expense, id: `short-back-${i}` }));
    A.validateState(state);
    await page.evaluate(data => new Promise(resolve => {
      const request = indexedDB.open('gastalo'); request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state', 'readwrite');
        tx.objectStore('state').put({ data, revision: 1 }, 'main'); tx.oncomplete = () => { db.close(); resolve(); };
      };
    }), state);
    await page.reload(); await page.locator('.entity-grid').first().waitFor();
    const cdp = await context.newCDPSession(page);
    const touch = (type, points = []) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    const ensureDetail = async () => {
      if (!await page.locator('.entity-detail').count()) {
        await page.locator(`[data-entity="${expense.from_id}"]`).tap();
        await page.getByRole('button', { name: 'Todo el historial', exact: true }).click();
      }
      await page.evaluate(() => scrollTo(0, 0));
    };
    const results = [];
    async function gesture(name, points, { width = 390, pause = 0, expected = 'back', cancel = false, locator, mode = 'no-preference', timedStepMs = 0 } = {}) {
      await page.emulateMedia({ reducedMotion: mode });
      await page.setViewportSize({ width, height: 844 });
      if (!locator) await ensureDetail();
      const target = locator || page.locator('.detail-totals');
      await target.scrollIntoViewIfNeeded();
      const b = await target.boundingBox(), start = { x: b.x + Math.min(24, b.width / 3), y: b.y + Math.min(12, b.height / 2) };
      await page.evaluate(() => {
        window.__shortTrace = [];
        const handlers = {};
        for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
          const listener = event => {
            const p = event.changedTouches[0];
            if (p) window.__shortTrace.push({ x: p.clientX, y: p.clientY, time: event.timeStamp, type });
            if (type === 'touchend' || type === 'touchcancel') {
              document.removeEventListener('touchstart', handlers.touchstart, true);
              document.removeEventListener('touchmove', handlers.touchmove, true);
              document.removeEventListener('touchend', handlers.touchend, true);
              document.removeEventListener('touchcancel', handlers.touchcancel, true);
            }
          };
          handlers[type] = listener;
          document.addEventListener(type, listener, true);
        }
      });
      let timestamp = Date.now() / 1000;
      const send = (type, points) => timedStepMs
        ? cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points, timestamp }) : touch(type, points);
      await send('touchStart', [start]);
      let last = 0;
      for (const [dx, wait = 0, dy = 0] of points) {
        last = dx;
        if (timedStepMs) timestamp += timedStepMs / 1000;
        await send('touchMove', [{ x: start.x + dx, y: start.y + dy }]);
        if (wait) await page.waitForTimeout(wait);
      }
      if (pause) {
        await page.waitForTimeout(pause);
        if (!profileOnly && !locator) assert.equal(await page.locator('.entity-detail').count(), 1, 'Crossing the threshold never commits while the finger remains down');
      }
      if (timedStepMs) timestamp += .015;
      await send(cancel ? 'touchCancel' : 'touchEnd', []);
      await frame();
      await page.waitForFunction(() => !document.documentElement.classList.contains('back-swipe-settling'));
      const outcome = locator ? await page.locator('#dialog').evaluate(dialog => dialog.open ? 'open' : 'closed')
        : await page.locator('.entity-detail').count() ? 'cancel' : 'back';
      const trace = await page.evaluate(() => window.__shortTrace);
      const samples = trace.filter(p => p.type !== 'touchcancel');
      const velocity = A.backSwipeVelocity(samples);
      const result = { name, width, dx: last, pause, mode, outcome, releaseVelocity: +velocity.toFixed(3) };
      results.push(result);
      if (!profileOnly) assert.equal(outcome, expected, JSON.stringify(result));
      if (timedStepMs) assert.ok(velocity >= .3, 'Fast-flick input timestamps must actually exercise forward velocity: ' + JSON.stringify({ result, trace }));
      return outcome;
    }
    const widths = profileOnly ? [390] : [320, 360, 375, 390, 393, 414, 430];
    for (const width of widths) {
      const short = width === 320 ? 48 : width <= 393 ? 56 : 64;
      await gesture('slow short drag, pause, release', [[12, 55], [24, 55], [short - 8, 55], [short]], { width, pause: 200 });
      await gesture('short flick', [[20], [54]], { width, timedStepMs: 25 });
      if (!profileOnly) {
        await gesture('tiny movement held', [[12], [24], [32]], { width, pause: 200, expected: 'cancel' });
        await gesture('slow short drag with reduced motion', [[12, 40], [short - 8, 40], [short]], { width, pause: 180, mode: 'reduce' });
      }
    }
    await gesture('small lift retreat after a clear drag', [[20, 40], [60, 40], [90, 160], [104], [90]], { pause: 0 });
    await gesture('small retreat after crossing short threshold', [[20, 50], [40, 50], [56], [50]], { pause: 180 });
    await gesture('deliberate reversal survives a pause', [[20, 40], [100, 40], [150, 40], [110]], { pause: 200, expected: 'cancel' });
    await gesture('rapid reversal is not hidden by earlier forward velocity', [[20], [90], [60]], { expected: 'cancel' });
    await gesture('forward intention resumes after a reversal', [[20, 40], [100, 40], [60, 40], [80]], { pause: 200 });
    if (!profileOnly) {
      await gesture('eligible movement cancelled by system', [[20], [60]], { pause: 500, expected: 'cancel', cancel: true });
      await gesture('short drag after cancelled gesture', [[20, 40], [56]], { pause: 200 });
      await gesture('mostly vertical motion', [[2, 35, -30], [4, 35, -80], [6, 35, -120]], { expected: 'cancel' });
      await page.waitForTimeout(180);
      await page.evaluate(() => scrollTo(0, 0));
      // A resize interrupts an eligible, unreleased short gesture without committing it.
      await ensureDetail();
      let b = await page.locator('.detail-totals').boundingBox();
      let start = { x: b.x + 24, y: b.y + 12 };
      await touch('touchStart', [start]); await touch('touchMove', [{ x: start.x + 60, y: start.y }]);
      await frame(); await page.setViewportSize({ width: 400, height: 844 }); await touch('touchCancel'); await frame();
      assert.equal(await page.locator('.entity-detail').count(), 1);
      assert.equal(await page.locator('.back-swipe-stage, .back-swipe-front').count(), 0);
      await page.setViewportSize({ width: 390, height: 844 });
      await gesture('short gesture after interrupted gesture', [[20, 40], [56]], { pause: 200 });
      // Short dismissal keeps the same staged tag and expense draft safeguards.
      await openMovementFromMenu(page);
      await page.locator('[name="amount"]').fill('12,34');
      await page.locator('#tag-picker-toggle').click();
      await page.locator('#tag-search').fill('Synthetic short-swipe draft');
      await page.locator('#tag-create').click();
      await gesture('short selector dismissal', [[20, 40], [56]], { pause: 200, locator: page.locator('.dialog-heading'), expected: 'open' });
      assert.equal(await page.locator('#tag-picker').isVisible(), false);
      assert.equal(await page.locator('[name="amount"]').inputValue(), '12,34');
      assert.equal(await page.locator('#movement-tag-chips input:checked').count(), 1);
      await gesture('short card dismissal', [[20, 40], [56]], { pause: 200, locator: page.locator('.movement-extras > summary'), expected: 'closed' });
      await frame(); await frame();
      await openMovementFromMenu(page); await page.locator('#recover-draft').click();
      assert.equal(await page.locator('[name="amount"]').inputValue(), '12,34');
      assert.equal(await page.locator('#movement-tag-chips input:checked').count(), 1);
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); await frame(); await frame();
      const url = page.url();
      await page.goto(base + '?short-back-browser-history=1'); await page.goBack();
      await page.locator('.entity-grid').first().waitFor(); assert.equal(page.url(), url);
      await page.goForward(); await page.locator('.entity-grid').first().waitFor();
      assert.equal(new URL(page.url()).searchParams.get('short-back-browser-history'), '1');
    }
    const saved = await page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open('gastalo'); request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state'); tx.objectStore('state').get('main').onsuccess = event => resolve(event.target.result.data);
        tx.oncomplete = () => db.close();
      };
    }));
    assert.deepEqual(saved, state, 'Recognition, cancellations, selectors and recovered drafts never modify financial data');
    assert.deepEqual(errors, []);
    console.log((profileOnly ? 'PROFILE' : 'PASS') + ' short back recognition: ' + JSON.stringify({ profileOnly, widths, cases: results }));
    return results;
  } catch (error) {
    await page.screenshot({ path: '/tmp/gastalo-short-back-error.png' }); throw error;
  } finally { await context.close(); }
}
module.exports = { verifyShortBack };
if (require.main === module) {
  (async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try { await verifyShortBack(browser); } finally { await browser.close(); }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
