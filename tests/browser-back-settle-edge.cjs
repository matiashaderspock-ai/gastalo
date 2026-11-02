/* Synthetic pixels and trusted touches; recording observations are documented separately. */
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const A = require('../app.js');
const fs = require('node:fs');
const base = process.env.GASTALO_URL || 'http://127.0.0.1:4173/';
async function verifyBackSettleAndEdge(browser) {
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-BO', serviceWorkers: 'block', reducedMotion: 'no-preference' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Test-only observation of closed visual copies; application queries remain isolated.
  await page.addInitScript(() => {
    window.__previewRoots = new WeakMap();
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (...args) {
      const root = attach.apply(this, args); window.__previewRoots.set(this, root); return root;
    };
  });
  try {
    await page.clock.setFixedTime(new Date('2026-02-15T12:00:00Z'));
    await page.goto(base); await page.locator('.entity-grid').first().waitFor();
    const state = A.demoState('2026-02-15');
    for (const [key, count] of [['sources', 12], ['accounts', 40], ['categories', 28]]) {
      while (state[key].length < count) {
        const i = state[key].length;
        state[key].push({ ...state[key][0], id: `edge-${key}-${i}`, name: `Synthetic ${key} ${i}` });
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
    const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    const cdp = await context.newCDPSession(page);
    const touch = (type, points = []) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    const card = id => page.locator(`[data-entity="${id}"]`);
    const point = async id => {
      const b = await card(id).locator('.entity-mark').boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    const colors = root => [...root.querySelectorAll('[data-entity] .entity-mark')].map(mark => ({
      id: mark.closest('[data-entity]').dataset.entity,
      backgroundImage: getComputedStyle(mark).backgroundImage, backgroundColor: getComputedStyle(mark).backgroundColor,
      color: getComputedStyle(mark).color, stroke: mark.querySelector('svg') && getComputedStyle(mark.querySelector('svg')).stroke,
    }));
    const readColors = () => page.evaluate(source => eval('(' + source + ')')(document), colors.toString());
    const original = await readColors();
    const categoryIds = state.categories.slice(0, 3).map(item => item.id);
    const clips = await Promise.all(categoryIds.map(id => card(id).locator('.entity-mark').boundingBox()));
    const pixels = [];
    for (const [i, clip] of clips.entries()) {
      const image = await page.screenshot({ clip, scale: 'css' });
      pixels.push(image); fs.writeFileSync(`/tmp/gastalo-preview-before-${i}.png`, image);
    }
    const openDetail = async () => { await card(state.accounts[0].id).tap(); await page.waitForTimeout(350); };
    await openDetail();
    const box = await page.locator('.detail-totals').boundingBox(), start = { x: box.x + 24, y: box.y + 12 };
    await touch('touchStart', [start]); await touch('touchMove', [{ x: start.x + 120, y: start.y }]);
    await frame(); await page.waitForTimeout(200); // Explicitly release at rest, not as a flick.
    const preview = await page.evaluate(source => eval('(' + source + ')')(window.__previewRoots.get(document.querySelector('.back-swipe-underlay'))), colors.toString());
    assert.deepEqual(preview, original, 'Every preview icon keeps its real budget gradient and SVG colors');
    await page.screenshot({ path: '/tmp/gastalo-followup-colored-preview.png' });
    await page.evaluate(() => {
      window.__settleFrames = [];
      document.addEventListener('touchend', () => {
        window.__release = performance.now();
        window.__settleTiming = document.querySelector('#app-page').getAnimations()[0]?.effect.getTiming();
        const sample = () => {
          const stage = document.querySelector('.back-swipe-stage');
          const home = !!document.querySelector('.entity-grid');
          window.__settleFrames.push({ time: performance.now() - window.__release,
            offset: new DOMMatrixReadOnly(getComputedStyle(document.querySelector('#app-page')).transform).m41,
            stage: !!stage, home });
          if (home && !stage) window.__settleDone = true; else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }, { once: true });
    });
    await touch('touchEnd');
    await page.waitForFunction(() => window.__settleDone);
    const settle = await page.evaluate(() => ({ frames: window.__settleFrames, timing: window.__settleTiming }));
    const controls = settle.timing.easing.slice(settle.timing.easing.indexOf('(') + 1, -1).split(',').map(Number);
    assert.equal(controls[1], 0, 'A held release starts at rest instead of acquiring artificial speed');
    assert.equal(controls[3], 1, 'The settle arrives with zero velocity');
    const handoffFrames = settle.frames.filter(f => f.home && f.stage && Math.abs(f.offset - page.viewportSize().width) < 1);
    assert.ok(handoffFrames.length >= 2, 'Keep the destination preview across two frame boundaries while the real route renders offscreen');
    assert.deepEqual(await readColors(), original, 'The final live page has the same colors as the settled preview');
    assert.equal(await page.locator('.back-swipe-stage, .back-swipe-front').count(), 0);
    assert.equal(await card(state.accounts[0].id).evaluate(element => element === document.activeElement), true, 'Commit restores focus to the actual entity');
    // At the fully revealed end state, budget icons should match pixel for pixel.
    await openDetail();
    await page.evaluate(() => {
      const target = document.querySelector('.detail-totals'), b = target.getBoundingClientRect();
      window.__fullPreviewTarget = target;
      window.__sendFullPreview = type => {
        const p = new Touch({ identifier: 81, target, clientX: b.x + 24 + (type === 'touchstart' ? 0 : innerWidth), clientY: b.y + 12 });
        target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
          touches: type === 'touchend' ? [] : [p], changedTouches: [p] }));
      };
      window.__sendFullPreview('touchstart'); window.__sendFullPreview('touchmove');
    });
    await frame();
    for (let i = 0; i < clips.length; i++) {
      const image = await page.screenshot({ clip: clips[i], scale: 'css' });
      fs.writeFileSync(`/tmp/gastalo-preview-after-${i}.png`, image);
      if (!image.equals(pixels[i])) console.error(await page.evaluate(({ clips, id }) => {
        const mark = window.__previewRoots.get(document.querySelector('.back-swipe-underlay')).querySelector(`[data-entity="${id}"] .entity-mark`);
        return { clips, actual: mark.getBoundingClientRect().toJSON(), bodyScroll: scrollY };
      }, { clips, id: categoryIds[i] }));
      assert.ok(image.equals(pixels[i]), `Preview pixels preserve the ${categoryIds[i]} budget icon`);
    }
    await page.evaluate(() => window.__sendFullPreview('touchend'));
    await page.waitForFunction(() => !document.documentElement.classList.contains('back-swipe-settling'));
    // A resize during the handoff cleans the cover without undoing the committed route.
    await openDetail();
    const interrupted = await page.evaluate(() => new Promise(resolve => {
      const observer = new MutationObserver(() => {
        if (!document.querySelector('.entity-grid')) return;
        observer.disconnect();
        const covered = !!document.querySelector('.back-swipe-stage');
        window.dispatchEvent(new Event('resize'));
        requestAnimationFrame(() => requestAnimationFrame(() => resolve({ covered,
          home: !!document.querySelector('.entity-grid'), stage: !!document.querySelector('.back-swipe-stage'),
          active: document.documentElement.classList.contains('back-swipe-active') })));
      });
      observer.observe(document.querySelector('#main'), { childList: true });
      const target = document.querySelector('.detail-totals'), b = target.getBoundingClientRect();
      for (const [type, dx] of [['touchstart', 0], ['touchmove', 120], ['touchend', 120]]) {
        const p = new Touch({ identifier: 83, target, clientX: b.x + 24 + dx, clientY: b.y + 12 });
        target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
          touches: type === 'touchend' ? [] : [p], changedTouches: [p] }));
      }
    }));
    assert.deepEqual(interrupted, { covered: true, home: true, stage: false, active: false });
    // Reduced motion still tracks the finger; release has zero automatic duration.
    await page.emulateMedia({ reducedMotion: 'reduce' }); await openDetail();
    const reduced = await page.evaluate(async () => {
      const target = document.querySelector('.detail-totals'), b = target.getBoundingClientRect();
      const send = (type, dx) => {
        const p = new Touch({ identifier: 82, target, clientX: b.x + 24 + dx, clientY: b.y + 12 });
        target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [p], changedTouches: [p] }));
      };
      send('touchstart', 0); send('touchmove', 120); await new Promise(resolve => requestAnimationFrame(resolve));
      const parallax = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.back-swipe-underlay')).transform).m41;
      send('touchend', 120);
      return { parallax, durations: document.querySelector('#app-page').getAnimations().map(a => a.effect.getTiming().duration) };
    });
    assert.equal(reduced.parallax, 0); assert.ok(reduced.durations.every(duration => duration === 0));
    await page.waitForFunction(() => !document.documentElement.classList.contains('back-swipe-settling'));
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    let edgeTrials = 0;
    const cleanDrag = async () => { await page.locator('.drag-clone').waitFor({ state: 'detached' }); await frame(); };
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const horizontal of ['inner', 'row-edge', 'padding', 'screen-edge']) for (const vertical of ['above', 'center', 'below']) {
        await page.evaluate(() => { scrollTo(0, 0); document.querySelector('.row-1 .entity-strip').scrollLeft = 0; });
        const row = await page.locator('.row-1 .entity-strip').boundingBox(), origin = await point(state.accounts[0].id);
        const x = { inner: row.x + row.width - 60, 'row-edge': row.x + row.width - 2, padding: row.x + row.width + 6, 'screen-edge': width - 1 }[horizontal];
        const y = { above: row.y - 16, center: row.y + row.height / 2, below: row.y + row.height + 16 }[vertical];
        await touch('touchStart', [origin]); await touch('touchMove', [{ x: origin.x + 1, y: origin.y }]);
        await touch('touchMove', [{ x, y }]);
        await page.waitForFunction(() => document.querySelector('.row-1 .entity-strip').scrollLeft > 20, null, { timeout: 3000 });
        await touch('touchCancel'); await cleanDrag(); edgeTrials++;
        assert.equal(await page.locator('#dialog').evaluate(dialog => dialog.open), false, 'Edge exploration does not create a transaction');
      }
    }
    // Jitter near the activation boundary stays latched; moving inward stops it.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.row-1 .entity-strip').evaluate(row => { row.scrollLeft = 0; });
    const row = await page.locator('.row-1 .entity-strip').boundingBox(), origin = await point(state.accounts[0].id);
    await touch('touchStart', [origin]); await touch('touchMove', [{ x: origin.x + 1, y: origin.y }]);
    await touch('touchMove', [{ x: row.x + row.width - 68, y: origin.y }]);
    await page.waitForFunction(() => document.querySelector('.row-1 .entity-strip').scrollLeft > 20);
    const beforeJitter = await page.locator('.row-1 .entity-strip').evaluate(row => row.scrollLeft);
    await touch('touchMove', [{ x: row.x + row.width - 80, y: origin.y }]);
    await page.waitForFunction(before => document.querySelector('.row-1 .entity-strip').scrollLeft > before + 20, beforeJitter);
    await touch('touchMove', [{ x: 195, y: origin.y }]); await frame(); await frame();
    const stopped = await page.locator('.row-1 .entity-strip').evaluate(row => row.scrollLeft);
    await page.waitForTimeout(120);
    assert.equal(await page.locator('.row-1 .entity-strip').evaluate(row => row.scrollLeft), stopped, 'Returning to the center stops edge scrolling');
    await touch('touchCancel'); await cleanDrag();
    // Reordering uses the same physical edge zone for source and account rows.
    for (const key of ['sources', 'accounts']) {
      await page.evaluate(() => { scrollTo(0, 0); document.querySelectorAll('.entity-strip').forEach(row => { row.scrollLeft = 0; }); });
      let origin = await point(state[key][0].id);
      await touch('touchStart', [origin]); await page.locator('#entity-edit-bar').waitFor(); await touch('touchEnd');
      origin = await point(state[key][0].id);
      const selector = key === 'sources' ? '.row-0 .entity-strip' : '.row-1 .entity-strip';
      await touch('touchStart', [origin]); await touch('touchMove', [{ x: origin.x + 1, y: origin.y }]);
      await touch('touchMove', [{ x: 389, y: origin.y }]);
      await page.waitForFunction(selector => document.querySelector(selector).scrollLeft > 20, selector);
      await touch('touchCancel'); await cleanDrag();
      await page.getByRole('button', { name: 'Listo', exact: true }).click();
    }
    // Categories retain their four-column grid; reaching more rows remains a
    // vertical reorder edge gesture, including near either side of the screen.
    let categoryEdgeTrials = 0;
    for (const x of [329, 369, 389]) {
      await page.evaluate(() => scrollTo(0, 0));
      let origin = await point(state.categories[0].id);
      await touch('touchStart', [origin]); await page.locator('#entity-edit-bar').waitFor(); await touch('touchEnd');
      origin = await point(state.categories[0].id);
      const before = await page.evaluate(() => scrollY);
      await touch('touchStart', [origin]); await touch('touchMove', [{ x: origin.x + 1, y: origin.y }]);
      await touch('touchMove', [{ x, y: 838 }]);
      await page.waitForFunction(before => scrollY > before + 30, before);
      await touch('touchCancel'); await cleanDrag();
      assert.equal(await page.locator('#dialog').evaluate(dialog => dialog.open), false);
      await page.getByRole('button', { name: 'Listo', exact: true }).click();
      categoryEdgeTrials++;
    }
    assert.equal(await page.locator('.row-2 .entity-grid').evaluate(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length), 4, 'Category grid keeps four columns and its existing vertical layout');
    const saved = await page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open('gastalo'); request.onsuccess = () => {
        const db = request.result, tx = db.transaction('state'); tx.objectStore('state').get('main').onsuccess = event => resolve(event.target.result.data);
        tx.oncomplete = () => db.close();
      };
    }));
    assert.deepEqual(saved, state, 'Navigation, edge exploration and cancelled reorders preserve all synthetic financial data');
    assert.deepEqual(errors, []);
    const firstAdvancing = settle.frames.find(f => f.offset > 120 && !f.home);
    const result = { budgetPreviewPixelsMatch: 3, previewColorsMatch: original.length, heldReleaseDurationMs: settle.timing.duration,
      firstAdvancingOffsetPx: firstAdvancing?.offset, destinationPaintFrames: settle.frames.filter(f => f.home && f.stage).length,
      edgeTrials, categoryEdgeTrials, widths: [320, 390, 430], hysteresis: true,
      sourceAndAccountReorder: true, interruptedHandoff: true, reducedMotion: true };
    console.log('PASS release continuity, preview colors and edge scrolling: ' + JSON.stringify(result));
    return result;
  } catch (error) {
    await page.screenshot({ path: '/tmp/gastalo-back-settle-edge-error.png' }); throw error;
  } finally { await context.close(); }
}
module.exports = { verifyBackSettleAndEdge };
if (require.main === module) {
  (async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try { await verifyBackSettleAndEdge(browser); } finally { await browser.close(); }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
