# Gesture responsiveness validation

Cloud-local change based on `2a4667bdba0a3f589c516eae1c3a08401c919bca` (main checked on 2026-11-02). App shell assets advance together from v58 to v59. All data below came from synthetic fixtures in isolated browser contexts.

## Confirmed causes and changes

`app.js` → `startBackVisual()` previously captured the entire current page from inside the first `touchmove`, serialized it, built two closed shadow roots, and parsed the stylesheet into each. This stalled the first movement increasingly as rendered history grew. The foreground is now the live `#app-page` in `index.html`; only transform and shading values change while dragging. The previous-screen preview is prepared during idle time. If a swipe wins the race with preparation, or a deep navigation entry no longer has a snapshot, it uses a plain background instead of parsing a large preview on input. The current route stays live until a completed release commits navigation. Snapshots remain inert and inaccessible to focus and app queries.

Back and card movement is coalesced with `requestAnimationFrame` and uses the most recent position. Release flushes the final position before settling; cleanup cancels pending frames on rendering, blur, resize, page hide, or document hiding. A returning card or page can be caught with a new touch at its current presentation position. Pointer events are blocked only during a completed navigation's settle. The dialog's entrance animation uses the independent CSS `translate` property so it cannot override the swipe's `transform`.

`app.js` → `paintPointer()` previously centered a transaction drag ghost at `(fingerX, fingerY - 40px)`, irrespective of where it was grabbed. `positionDragClone()` now preserves the actual grab point as the mark scales to 1.4. It uses viewport coordinates and the real mark dimensions rather than hard-coded offsets. The first movement positions the clone before insertion; release flushes the final pointer coordinate. The ghost already had `transition: none`; no movement easing was removed.

The old drag loop hit-tested and rewrote the ghost transform every animation frame while stationary. It now schedules frames when input changes or edge scrolling actually moves content. It reads geometry before the foreground transform write, skips unchanged scroll writes, and checks valid source/destination types directly using the shared `canDrop()` rule instead of repeatedly scanning the stored entity lists for each card. Circle activation, long-press editing, normal scrolling from names/amounts, valid drop rules, and explicit transaction confirmation are retained.

## Reproducible measurements

Local tools: Chromium 154.0.8037.57, Playwright 1.62.1, Linux cloud environment, iPhone 13 viewport/touch configuration. These are browser workload measurements, not physical iPhone frame rate or touch latency. Before/after runs used the same scripts against separate local servers; the baseline server contained the exact main commit above. Timing assertions are deliberately avoided; regressions assert observable behavior and work counts.

| Measurement | Main baseline | Changed code |
| --- | ---: | ---: |
| First back movement handler, median / p95, 8 swipes with 1,000 rendered history rows | 289 / 412 ms | 5 / 6 ms |
| Current-screen clones during those 8 first movements | 24 top/main/footer clones | 0 |
| Shadow roots built during those input handlers | 16 | 0 |
| Burst of 80 back movement events | Per-event transform writes | 1 foreground write on the next frame |
| Maximum transaction grab-point error, trusted touches | 40 px | < 0.01 px |
| Hit tests during 120 ms stationary away from an edge | 7 | 0 |
| Transaction pointer handler p95 / maximum across the same synthetic journey | 6 / 7.1 ms | 2.5 / 3.1 ms |

A final standalone back regression also measured 16 ms median / 19 ms p95 browser frame intervals during movement after activation. Intervals exclude initial activation and include cloud scheduling noise; they do not establish 60 or 120 fps on iOS.

With the README's local server and Playwright installation:

```sh
node --test tests/*.test.cjs
node tests/browser-back-navigation.cjs
GASTALO_ANIMATE_BACK=1 node tests/browser-back-navigation.cjs
node tests/browser-gesture-performance.cjs
node tests/browser-drag-tracking.cjs
```

The animated back-navigation journey invokes both new regression modules, so the existing required CI browser command covers them without a workflow change. To compare an unchanged checkout served on another port, use the same current scripts in measurement-only mode:

```sh
GASTALO_PROFILE_ONLY=1 GASTALO_URL=http://127.0.0.1:4174/ node tests/browser-gesture-performance.cjs
GASTALO_PROFILE_ONLY=1 GASTALO_URL=http://127.0.0.1:4174/ node tests/browser-drag-tracking.cjs
```

## Functional coverage and limitations

The new synthetic back regression checks four-pixel activation, preserved live DOM, burst coalescing, repeated cancellation, cold preparation, blur/resize/page-hide cleanup, the entrance-animation conflict, catching a returning card (including trusted touch hit-testing), draft recovery without transaction writes, and native browser Back/Forward entries. The existing navigation journey checks slow, held, reversed, cancelled and interrupted swipes; menu and nested selector behavior; focus restoration; reduced motion; native vertical scrolling; and preservation of months, horizontal rows and financial state at 320/390 px.

The new transaction regression uses 17 trusted-touch drags covering source → account, account → category, and account → another account, in both motion modes, before and after horizontal/vertical scrolling. It checks first-pixel activation, centered and off-center contact points, subsequent movement, correct prefilled forms, cancelled forms/drops, repeated gestures, stationary work and stationary edge scrolling. It compares the complete saved synthetic state with the starting state. Existing smoke and reorder checks cover native name/amount scrolling, pointer and mouse input, invalid directions, reorder groups, horizontal/vertical edge scrolling, keyboard reordering, persistence and financial invariants. Existing movement checks cover full-width tags, compact forms, keyboard viewport changes, backdrop dismissal, accessibility/focus, and recovery of staged tags and drafts.

WebKit was not available. `PLAYWRIGHT_BROWSERS_PATH=/tmp/gastalo-browsers playwright install webkit` failed because the download destinations returned HTTP 403 `Domain forbidden` under this environment's network policy. This is a denied browser-download action, not a failed WebKit test or an automatic approval-review denial. No physical iPhone or installed iOS PWA was tested. Safari-specific compositing, blur cost, browser edge gestures, the real keyboard, and sustained 60/120 Hz performance still require device validation. Nothing in this change publishes, pushes or deploys the app.
