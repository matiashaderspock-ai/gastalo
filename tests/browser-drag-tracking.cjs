/* Trusted Chromium touches and synthetic financial data; no real device claims. */
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const A = require('../app.js');
const base = process.env.GASTALO_URL || 'http://127.0.0.1:4173/';
const profileOnly = process.env.GASTALO_PROFILE_ONLY === '1';
async function verifyDragTracking(browser) {
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-BO', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base); await page.locator('.entity-grid').first().waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + '/fixtures/coinkeeper.csv', 'utf8'), '2026-01');
    for (const [key, count] of [['sources', 10], ['accounts', 24], ['categories', 28]]) {
      while (state[key].length < count) {
        const i = state[key].length;
        state[key].push({ ...state[key][0], id: `drag-${key}-${i}`, name: `Synthetic ${key} ${i}` });
      }
    }
    A.validateState(state);
    await page.evaluate(data => new Promise(resolve => {
      const request = indexedDB.open('gastalo'); request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state', 'readwrite');
        tx.objectStore('state').put({ data, revision: 1 }, 'main'); tx.oncomplete = () => { db.close(); resolve(); };
      };
    }), state);
    await page.reload(); await page.locator('.entity-grid').first().waitFor();
    await page.evaluate(() => {
      window.__dragHandlerTimes = [];
      window.__dragEvents = [];
      for (const type of ['pointerdown', 'pointermove', 'pointercancel', 'pointerup'])
        document.addEventListener(type, event => { window.__dragEvents.push({ type, x: event.clientX, y: event.clientY, target: event.target.className?.baseVal || event.target.className }); }, true);
      document.addEventListener('pointermove', () => { window.__dragEventStart = performance.now(); }, true);
      document.addEventListener('pointermove', () => { window.__dragHandlerTimes.push(performance.now() - window.__dragEventStart); });
    });
    const cdp = await context.newCDPSession(page);
    const touch = (type, points = []) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    const card = id => page.locator(`[data-entity="${id}"]`);
    async function point(id, grab = [.5, .5]) {
      const box = await card(id).locator('.entity-mark').boundingBox();
      return { x: box.x + box.width * grab[0], y: box.y + box.height * grab[1] };
    }
    const positions = () => page.evaluate(() => ({ y: scrollY, strips: [...document.querySelectorAll('.entity-strip')].map(strip => strip.scrollLeft) }));
    const maxErrors = [];
    async function follows(position, grab) {
      await frame();
      const tracking = await page.locator('.drag-clone').evaluate((element, { position, grab }) => {
        const box = element.getBoundingClientRect(), style = getComputedStyle(element);
        return { x: box.x + box.width * grab[0] - position.x, y: box.y + box.height * grab[1] - position.y, transition: style.transitionDuration };
      }, { position, grab });
      maxErrors.push(Math.hypot(tracking.x, tracking.y));
      if (!profileOnly) assert.ok(Math.abs(tracking.x) < 2 && Math.abs(tracking.y) < 2, `Grab point follows finger: ${JSON.stringify(tracking)}`);
      assert.equal(tracking.transition, '0s', 'The moving clone has no CSS easing');
    }
    const clean = async () => {
      await page.locator('.drag-clone').waitFor({ state: 'detached' });
      assert.equal(await page.locator('html').evaluate(element => element.classList.contains('is-dragging')), false);
      assert.equal(await page.evaluate(() => document.body.style.top), '');
    };
    let idleHitTests;
    const pairs = [['sources', 0, 'accounts', 1, 'income'], ['accounts', 0, 'categories', 0, 'expense'], ['accounts', 0, 'accounts', 1, 'transfer'],
      ['sources', 5, 'accounts', 6, 'income'], ['accounts', 5, 'categories', 0, 'expense'], ['accounts', 5, 'accounts', 6, 'transfer']];
    for (const motion of ['no-preference', 'reduce']) {
      await page.emulateMedia({ reducedMotion: motion });
      for (const [trial, [fromKey, fromIndex, toKey, toIndex, kind]] of pairs.entries()) {
        const scrolled = trial >= 3, grab = trial % 2 ? [.25, .7] : [.5, .5];
        await page.evaluate(scrolled => {
          document.querySelectorAll('.entity-strip').forEach(strip => { strip.scrollLeft = scrolled ? 320 : 0; });
          scrollTo(0, scrolled ? 28 : 0);
        }, scrolled);
        const from = state[fromKey][fromIndex].id, to = state[toKey][toIndex].id;
        await page.evaluate(trial => { window.__dragTrial = trial; }, { motion, trial, kind });
        const before = await positions(), start = await point(from, grab), end = await point(to);
        await touch('touchStart', [start]);
        let current = { x: start.x + 1, y: start.y };
        await touch('touchMove', [current]);
        await follows(current, grab);
        if (trial === 0 && motion === 'no-preference') {
          // Once a centered drag is stationary, there is no reason to hit-test at 60fps.
          await page.evaluate(() => {
            window.__idleHitTests = 0;
            window.__originalElementFromPoint = document.elementFromPoint;
            document.elementFromPoint = function (...args) { window.__idleHitTests++; return window.__originalElementFromPoint.apply(this, args); };
          });
          await page.waitForTimeout(120);
          idleHitTests = await page.evaluate(() => {
            document.elementFromPoint = window.__originalElementFromPoint;
            return window.__idleHitTests;
          });
          if (!profileOnly) assert.equal(idleHitTests, 0, 'Stationary non-edge drag stops the hit-test loop');
        }
        for (const progress of [.15, .35, .6, .8, 1]) {
          current = { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress };
          await touch('touchMove', [current]); await follows(current, grab);
        }
        await touch('touchEnd');
        await page.locator('#dialog').waitFor({ state: 'visible' }); await clean();
        assert.equal(await page.locator('#dialog [name="from"]').inputValue(), from, `${kind} origin`);
        assert.equal(await page.locator('#dialog [name="to"]').inputValue(), to, `${kind} destination`);
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await page.locator('#dialog').waitFor({ state: 'hidden' });
        await frame(); await frame(); // Let the dialog close event restore its saved scroll.
        const after = await positions();
        assert.ok(Math.abs(after.y - before.y) < 2, 'Page scroll survives a transaction drag');
        after.strips.forEach((left, i) => assert.ok(Math.abs(left - before.strips[i]) < 2, 'Scrolled entity rows retain their position'));
      }
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // Repeated cancelled and invalid drops never open a form or write a movement.
    for (const cancelled of [true, false, true, false]) {
      await page.evaluate(() => { scrollTo(0, 0); document.querySelectorAll('.entity-strip').forEach(strip => { strip.scrollLeft = 0; }); });
      const start = await point(state.accounts[0].id);
      await touch('touchStart', [start]); await touch('touchMove', [{ x: start.x + 1, y: start.y }]);
      await touch('touchMove', [{ x: 3, y: 110 }]);
      await touch(cancelled ? 'touchCancel' : 'touchEnd'); await clean();
      assert.equal(await page.locator('#dialog').evaluate(dialog => dialog.open), false);
    }
    // A stationary edge drag still scrolls destinations; the clone stays under the same finger.
    await page.evaluate(() => document.querySelector('.row-1 .entity-strip').scrollLeft = 0);
    const start = await point(state.accounts[0].id), strip = await page.locator('.row-1 .entity-strip').boundingBox();
    const edge = { x: strip.x + strip.width - 6, y: start.y };
    await touch('touchStart', [start]); await touch('touchMove', [{ x: start.x + 1, y: start.y }]);
    await touch('touchMove', [edge]);
    await page.waitForFunction(() => document.querySelector('.row-1 .entity-strip').scrollLeft > 80);
    await follows(edge, [.5, .5]);
    await touch('touchCancel'); await clean();
    assert.ok(await page.locator('.row-1 .entity-strip').evaluate(strip => strip.scrollLeft) > 80, 'Cancelled edge drag preserves the discovered row position');
    const saved = await page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open('gastalo'); request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state'); tx.objectStore('state').get('main').onsuccess = event => resolve(event.target.result.data);
        tx.oncomplete = () => db.close();
      };
    }));
    assert.deepEqual(saved, state, 'Drag initiation, cancelled forms and cancelled drops do not change financial data');
    assert.deepEqual(errors, []);
    const times = await page.evaluate(() => window.__dragHandlerTimes.sort((a, b) => a - b));
    const result = { trustedTouchDrags: 17, supportedPairs: 3, reducedMotion: true, scrolledOrigins: true,
      maxGrabPointErrorPx: +Math.max(...maxErrors).toFixed(2), idleHitTestsIn120ms: idleHitTests,
      handlerMs: { median: +times[Math.floor(times.length / 2)].toFixed(2), p95: +times[Math.ceil(times.length * .95) - 1].toFixed(2), max: +times.at(-1).toFixed(2) } };
    console.log((profileOnly ? 'PROFILE drag tracking' : 'PASS drag tracking') + ': ' + JSON.stringify(result));
    return result;
  } catch (error) {
    console.error(await page.evaluate(() => ({ trial: window.__dragTrial, events: window.__dragEvents.slice(-12) })));
    await page.screenshot({ path: '/tmp/gastalo-drag-tracking-error.png' }); throw error;
  } finally { await context.close(); }
}
module.exports = { verifyDragTracking };
if (require.main === module) {
  (async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try { await verifyDragTracking(browser); } finally { await browser.close(); }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
