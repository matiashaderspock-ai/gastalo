/* Synthetic histories and touches. Timings describe this browser, not an iPhone. */
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const A = require('../app.js');
const base = process.env.GASTALO_URL || 'http://127.0.0.1:4173/';
const profileOnly = process.env.GASTALO_PROFILE_ONLY === '1';

async function verifyGesturePerformance(browser) {
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-BO', reducedMotion: 'no-preference', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.clock.setFixedTime(new Date('2026-02-15T12:00:00Z'));
    await page.goto(base);
    await page.locator('.entity-grid').first().waitFor();
    const state = A.importCSV(fs.readFileSync(__dirname + '/fixtures/coinkeeper.csv', 'utf8'), '2026-01');
    const expense = state.transactions.find(transaction => transaction.kind === 'expense');
    state.transactions = Array.from({ length: 1000 }, (_, i) => ({ ...expense, id: `gesture-synthetic-${i}` }));
    await page.evaluate(data => new Promise(resolve => {
      const request = indexedDB.open('gastalo');
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state', 'readwrite');
        tx.objectStore('state').put({ data, revision: 1 }, 'main');
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    }), state);
    await page.reload();
    await page.locator(`[data-entity="${expense.from_id}"]`).tap();
    await page.getByRole('button', { name: 'Todo el historial', exact: true }).click();
    for (let i = 1; i < 10; i++) await page.locator('[data-action="more"]').click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(350); // Allow idle preview preparation before measuring input.
    const measurements = await page.evaluate(async profileOnly => {
      const check = (value, message) => { if (!value) throw new Error(message); };
      const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
      const settled = async () => {
        for (let i = 0; i < 90 && document.documentElement.classList.contains('back-swipe-settling'); i++) await frame();
        check(!document.documentElement.classList.contains('back-swipe-settling'), 'Gesture must settle within 90 browser frames');
      };
      const offset = element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
      let target, x, y;
      function touch(type, dx = 0) {
        const point = new Touch({ identifier: 81, target, clientX: x + dx, clientY: y });
        return new TouchEvent(type, { bubbles: true, cancelable: true,
          touches: /end|cancel/.test(type) ? [] : [point], changedTouches: [point] });
      }
      function start(element) {
        target = element;
        const box = target.getBoundingClientRect();
        x = box.x + 24; y = box.y + Math.min(12, box.height / 2);
        target.dispatchEvent(touch('touchstart'));
      }
      function dispatch(type, dx) { target.dispatchEvent(touch(type, dx)); }
      const front = document.querySelector('#app-page'), liveDetail = document.querySelector('.entity-detail');
      check(document.querySelectorAll('.transaction').length === 1000, 'Exercise a large rendered history');
      const historyLength = history.length;
      let writes = 0;
      if (!profileOnly) {
        // Small movements track immediately instead of jumping at a later threshold.
        start(document.querySelector('.detail-totals'));
        dispatch('touchmove', 4);
        await frame();
        check(Math.abs(offset(front) - 4) < .5, 'The live page follows a four-pixel movement');
        check(front.classList.contains('back-swipe-front'), 'Transform the original page instead of a cloned screen');
        check(document.querySelector('.entity-detail') === liveDetail, 'Preserve the live route and focused DOM');
        const observer = new MutationObserver(records => { writes += records.length; });
        observer.observe(front, { attributes: true, attributeFilter: ['style'] });
        for (let dx = 5; dx <= 84; dx++) dispatch('touchmove', dx);
        check(Math.abs(offset(front) - 4) < .5, 'A burst waits for the next animation frame');
        await frame(); await Promise.resolve(); observer.disconnect();
        check(writes === 1, 'Coalesce 80 input events into one foreground transform write');
        check(Math.abs(offset(front) - 84) < .5, 'The frame uses the latest finger position');
        dispatch('touchcancel', 84); await settled();
        check(front.style.transform === '' && !front.classList.contains('back-swipe-front'), 'Cancellation restores the live page');
      }

      const cloneNode = Node.prototype.cloneNode, attachShadow = Element.prototype.attachShadow;
      let clones = 0, shadows = 0, measuring = false;
      Node.prototype.cloneNode = function (...args) { if (measuring) clones++; return cloneNode.apply(this, args); };
      Element.prototype.attachShadow = function (...args) { if (measuring) shadows++; return attachShadow.apply(this, args); };
      const activation = [], move = [], frames = [];
      try {
        for (let trial = 0; trial < 8; trial++) {
          start(document.querySelector('.detail-totals'));
          let began = performance.now(); measuring = true;
          dispatch('touchmove', 20); measuring = false; activation.push(performance.now() - began);
          await frame();
          let lastFrame = performance.now();
          for (let dx = 26; dx <= 74; dx += 6) {
            began = performance.now(); measuring = true;
            dispatch('touchmove', dx); measuring = false; move.push(performance.now() - began);
            await frame();
            frames.push(performance.now() - lastFrame); lastFrame = performance.now();
          }
          dispatch('touchcancel', 74); await settled();
        }
      } finally { Node.prototype.cloneNode = cloneNode; Element.prototype.attachShadow = attachShadow; }
      if (!profileOnly) {
        check(clones === 0 && shadows === 0, 'Input handlers cannot clone histories or parse shadow previews');
        // A pending frame must not resurrect styles after a blur/resize/page hide.
        for (const event of ['blur', 'resize', 'pagehide']) {
          start(document.querySelector('.detail-totals')); dispatch('touchmove', 40);
          window.dispatchEvent(new Event(event)); await frame();
          check(front.style.transform === '' && !document.querySelector('.back-swipe-stage'), `${event} cancels queued work`);
          dispatch('touchcancel', 40);
        }
        check(history.length === historyLength, 'Custom back gestures cannot push or consume browser history');
      }
      if (!profileOnly) {
        // Force a render and touch in the same task, before idle preparation can
        // run. A cold swipe must also avoid parsing the previous history.
        document.querySelector('[data-action="detail-scope"][data-scope="all"]').click();
        let coldShadows = 0;
        Element.prototype.attachShadow = function (...args) { coldShadows++; return attachShadow.apply(this, args); };
        try {
          start(document.querySelector('.detail-totals')); dispatch('touchmove', 4);
        } finally { Element.prototype.attachShadow = attachShadow; }
        check(coldShadows === 0, 'An immediate swipe must not synchronously build a shadow preview');
        await frame();
        check(Math.abs(offset(front) - 4) < .5, 'An immediate swipe still follows the finger');
        dispatch('touchcancel', 4); await settled();
      }
      return { activation, move, frames, clones, shadows, coalescedEvents: profileOnly ? 0 : 80, transformWrites: writes };
    }, profileOnly);
    // Exercise a card while its 150ms opening animation is still running.
    const card = profileOnly ? {} : await page.evaluate(async () => {
      const check = (value, message) => { if (!value) throw new Error(message); };
      const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
      const settled = async () => { for (let i = 0; i < 90 && document.documentElement.classList.contains('back-swipe-settling'); i++) await frame(); };
      const offset = element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
      document.querySelector('#app-menu').open = true;
      document.querySelector('#app-menu [data-action="movement"]').click();
      const dialog = document.querySelector('#dialog'), target = document.querySelector('.movement-extras > summary');
      const amount = dialog.querySelector('[name="amount"]');
      amount.value = '12,34'; amount.dispatchEvent(new Event('input', { bubbles: true }));
      const opening = dialog.getAnimations().find(animation => animation.animationName === 'appear');
      check(opening && opening.playState === 'running', 'The test starts during the card entrance animation');
      const box = target.getBoundingClientRect(), x = box.x + 24, y = box.y + 12;
      const send = (type, dx = 0) => {
        const point = new Touch({ identifier: 91, target, clientX: x + dx, clientY: y });
        target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
          touches: /end|cancel/.test(type) ? [] : [point], changedTouches: [point] }));
      };
      send('touchstart'); send('touchmove', 20); await frame();
      check(Math.abs(offset(dialog) - 20) < .5, 'Opening animation must not override the swipe transform');
      send('touchmove', 60); await frame(); send('touchcancel', 60);
      const before = offset(dialog);
      send('touchstart'); await frame();
      check(document.documentElement.classList.contains('back-swipe-active'), 'Retouch takes ownership from a returning card');
      check(!document.documentElement.classList.contains('back-swipe-settling'), 'Retouch interrupts the old settle');
      check(Math.abs(offset(dialog) - before) < 2, 'Retouch preserves the current presentation position');
      send('touchmove', 30); await frame();
      check(Math.abs(offset(dialog) - before - 30) < 2, 'A caught card continues from the finger');
      send('touchcancel', 30); await settled();
      check(dialog.open && amount.value === '12,34', 'Cancelled and repeated gestures preserve unsaved input');
      check(dialog.style.transform === '' && !dialog.classList.contains('back-swipe-clipping'), 'No transient card styles remain');
      const closed = new Promise(resolve => dialog.addEventListener('close', resolve, { once: true }));
      send('touchstart'); send('touchmove', 160); await frame(); send('touchend', 160); await settled(); await closed;
      check(!dialog.open, 'A completed swipe dismisses the card');
      document.querySelector('#app-menu').open = true;
      document.querySelector('#app-menu [data-action="movement"]').click();
      check(document.querySelector('#recover-draft'), 'Reopening offers the preserved expense draft');
      document.querySelector('#recover-draft').click();
      check(dialog.querySelector('[name="amount"]').value === '12,34', 'Recover restores the expense draft');
      return { entranceConflict: false, retouchPreservesPosition: true, draftPreserved: true };
    });
    if (!profileOnly) {
      // Trusted touch hit-testing must also reach a card during its return.
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('.detail-period [data-action="entity-movement"]').click();
      const session = await context.newCDPSession(page);
      const box = await page.locator('.movement-extras > summary').boundingBox();
      const start = { x: box.x + 24, y: box.y + 12 };
      const touch = (type, points = []) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      await touch('touchStart', [start]);
      await touch('touchMove', [{ x: start.x + 60, y: start.y }]);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      await touch('touchCancel');
      await touch('touchStart', [{ x: start.x + 60, y: start.y }]);
      const caught = await page.evaluate(() => ({ active: document.documentElement.classList.contains('back-swipe-active'), settling: document.documentElement.classList.contains('back-swipe-settling') }));
      assert.deepEqual(caught, { active: true, settling: false }, 'A trusted retouch catches the returning card through normal hit-testing');
      await touch('touchMove', [{ x: start.x + 80, y: start.y }]);
      await touch('touchCancel');
      await page.waitForFunction(() => !document.documentElement.classList.contains('back-swipe-settling'));
      assert.equal(await page.locator('#dialog').evaluate(dialog => dialog.open), true);
      await session.detach();
    }
    const saved = await page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open('gastalo');
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state');
        tx.objectStore('state').get('main').onsuccess = event => resolve(event.target.result.data);
        tx.oncomplete = () => db.close();
      };
    }));
    assert.deepEqual(saved, state, 'No gesture saves or changes a transaction');
    await page.goto(base + '?browser-history-check=1');
    await page.goBack(); await page.locator('.entity-grid').first().waitFor();
    await page.goForward(); await page.locator('.entity-grid').first().waitFor();
    assert.equal(new URL(page.url()).searchParams.get('browser-history-check'), '1', 'Browser Back and Forward keep their native entries');
    assert.equal(await page.locator('.back-swipe-stage, .back-swipe-front, .back-swipe-clipping').count(), 0);
    assert.deepEqual(errors, []);
    const stats = values => {
      const sorted = [...values].sort((a, b) => a - b);
      return { median: +sorted[Math.floor(sorted.length / 2)].toFixed(2), p95: +sorted[Math.ceil(sorted.length * .95) - 1].toFixed(2), max: +sorted.at(-1).toFixed(2) };
    };
    const result = { profileOnly, renderedRows: 1000, syntheticTrials: 8, activationMs: stats(measurements.activation), moveHandlerMs: stats(measurements.move), browserFrameIntervalMs: stats(measurements.frames), ...card,
      clonesDuringInput: measurements.clones, shadowsDuringInput: measurements.shadows, coalescedEvents: measurements.coalescedEvents, transformWrites: measurements.transformWrites };
    console.log((profileOnly ? 'PROFILE' : 'PASS gesture performance and lifecycle') + ': ' + JSON.stringify(result));
    return result;
  } catch (error) {
    await page.screenshot({ path: '/tmp/gastalo-gesture-performance-error.png' });
    throw error;
  } finally { await context.close(); }
}
module.exports = { verifyGesturePerformance };
if (require.main === module) {
  (async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try { await verifyGesturePerformance(browser); } finally { await browser.close(); }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
