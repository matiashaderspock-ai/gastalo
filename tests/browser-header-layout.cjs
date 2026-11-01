/* Synthetic local state only; Chromium viewport emulation, not a physical iPhone. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const A = require('../app.js');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const demo of [false, true]) {
      const context = await browser.newContext({ locale: 'es-BO', reducedMotion: 'reduce' });
      await context.route('https://**', route => route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto((process.env.GASTALO_URL || 'http://127.0.0.1:4173/') + (demo ? '?demo=1' : ''));
      await page.locator('.home-totals').waitFor();
      if (!demo) {
        await page.evaluate(data => new Promise(resolve => {
          const q = indexedDB.open('gastalo');
          q.onsuccess = () => {
            const db = q.result, tx = db.transaction('state', 'readwrite');
            tx.objectStore('state').put({ data, revision: 1 }, 'main');
            tx.oncomplete = () => { db.close(); resolve(); };
          };
        }), A.demoState('2026-11-01'));
        await page.reload();
      }
      const go = async view => {
        await page.locator('#app-menu > summary').click();
        await page.locator(`#app-menu [data-view="${view}"]`).click();
        assert.equal(await page.locator('#app-menu').evaluate(e => e.open), false);
      };
      for (const width of [320, 360, 375, 390, 430, 768, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await go('home');
        const stats = await page.locator('.home-totals .stat').evaluateAll(nodes => nodes.map(e => {
          const label = e.querySelector(':scope > span'), value = e.querySelector('strong');
          return { height: label.getBoundingClientRect().height, line: parseFloat(getComputedStyle(label).lineHeight), top: value.getBoundingClientRect().top,
            right: e.getBoundingClientRect().right, scroll: e.scrollWidth, width: e.clientWidth };
        }));
        for (const s of stats) {
          assert.ok(s.height <= s.line + 1, `Single-line label: ${width}, demo=${demo}`);
          assert.ok(Math.abs(s.top - stats[0].top) < 1, `Aligned values: ${width}`);
          assert.ok(s.scroll <= s.width + 1 && s.right <= width, `Unclipped stat: ${width}: ${JSON.stringify(s)}`);
        }
        for (const view of ['home', 'history', 'budgets', 'reports', 'settings']) {
          if (view !== 'home') await go(view);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow: ${view}, ${width}, demo=${demo}`);
          if (view !== 'home') {
            const title = await page.locator('#header-totals > h1').boundingBox();
            const menu = await page.locator('#app-menu > summary').boundingBox();
            assert.ok(title.x >= menu.x + menu.width, `Title beside hamburger: ${view}`);
            assert.ok(Math.abs(title.y + title.height / 2 - menu.y - menu.height / 2) < 1, `Same row: ${view}`);
            assert.ok(title.x + title.width <= width, `Unclipped title: ${view}`);
            assert.equal(await page.locator('h1').count(), 1);
          }
          if (width === 320 && !demo) await page.screenshot({ path: `/tmp/gastalo-${view}-320.png`, fullPage: true });
        }
        console.log(`PASS ${demo ? 'English demo' : 'Spanish synthetic'} ${width}px: all five tabs, titles, stats, overflow and menu navigation`);
      }
      // Native details supports keyboard open/close and retains focus.
      await page.locator('#app-menu > summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#app-menu').evaluate(e => e.open), true);
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#app-menu').evaluate(e => e.open), false);
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
