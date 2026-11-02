# Gesture responsiveness validation

The initial v59 change was based on `2a4667bdba0a3f589c516eae1c3a08401c919bca` and published as `81d9ae99d0d6fec2b37c82bf30e9dd31ffdf986a`. The v60 follow-up was published as `e8df0c2a456bbc410f6425062b521b8bbf55f4b4`. The v61 recognition follow-up below is based on that main commit. All measurements and screenshots use synthetic fixtures in isolated browser contexts.

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
node tests/browser-back-settle-edge.cjs
node tests/browser-short-back.cjs
```

The animated back-navigation journey invokes all four gesture regression modules, so the existing required CI browser command covers them without a workflow change. To compare an unchanged checkout served on another port, use the same current scripts in measurement-only mode:

```sh
GASTALO_PROFILE_ONLY=1 GASTALO_URL=http://127.0.0.1:4174/ node tests/browser-gesture-performance.cjs
GASTALO_PROFILE_ONLY=1 GASTALO_URL=http://127.0.0.1:4174/ node tests/browser-drag-tracking.cjs
```

## v60 follow-up: release, preview and edge continuity

The release curve in v59 ignored the incoming finger velocity. Its fixed easing starts at a slope of approximately 3.18, giving a held 120 px drag an immediate speed of approximately 5.17 px/ms toward the edge. A synthetic reproduction first advanced from 120 to approximately 207 px after release. `backSwipeTransition()` now derives duration from remaining distance and incoming velocity, uses a Hermite curve with the measured initial tangent and a zero final tangent, and bounds the tangent to avoid overshooting on fast near-edge flicks. The held reproduction first advanced to approximately 122 px instead. Unit tests check release and arrival velocities, including held, fast, reversed and near-edge cases; this is not a physical iPhone timing measurement.

A completed page keeps its settled, inert preview visible across two animation-frame boundaries while the actual destination renders offscreen and restores scroll/focus. Only then are the foreground transform and preview removed together. Resize, blur, page hide and other aborts still clean pending work. A resize specifically during the handoff is covered by the new browser journey. Reduced motion keeps direct finger tracking, has no parallax, and uses zero automatic animation duration.

The reddish preview icons were reproduced in Chromium, not merely inferred from computed color inheritance. Serializing `.budget-mark` through `CSSRule.cssText` drops its variable-based `background` shorthand after the `background-origin` and `background-repeat` overrides; the resulting preview rule has an empty `background-image`. Every budget icon consequently reveals the category row's rust background. Using an explicit `background-image` declaration preserves the gradient through serialization without changing its financial meaning.

Strict screenshot comparison then exposed another real discontinuity: preview icons were 5 CSS px too low. Positioning the copied `main` absolutely changed the first section's margin collapsing. Making `main` a flow root preserves the same child-margin geometry in live and copied pages. The regression requires exact PNG equality for representative red, green and orange budget marks at the fully revealed endpoint, plus exact computed gradients and SVG colors across 80 entity marks. No pixel tolerance is applied.

Rightward drag scrolling previously rejected points beyond the row's right edge, even in the gap before the physical screen edge. Its quadratic speed also allowed weak fractional first steps to round to no movement and stop the frame loop. The shared horizontal helper now uses a 72 px entry band extending through the screen-edge gap, 24 px vertical thumb tolerance (32 px while active), and 16 px exit hysteresis. Speed has a small floor, and active intent keeps scheduling frames until the pointer leaves the zone or the scroll limit is reached. A half-pixel endpoint tolerance stops needless work at fractional limits. Native row scrolling, circle activation and valid drop rules are unchanged.

`browser-back-settle-edge.cjs` exercises 36 horizontal account-edge locations across 320/390/430 px, boundary jitter and stopping in the center, source/account reorder scrolling at the physical edge, and category reorder scrolling near the bottom at multiple horizontal positions. Categories retain their four-column grid and vertical continuation; no horizontal category layout is introduced. All edge gestures are cancelled and the complete saved synthetic state is compared with its starting value. The existing smoke and reorder journeys also cover category row/column movement, native scrolling, keyboard input and cancelled drops. The new journey runs through the existing animated navigation CI command.

## v61 follow-up: short back recognition

v60 did not explicitly require a full-width swipe. It required at least 36 px, no more than 64 px vertical movement, horizontal dominance above 1.7, and distance plus 180 ms of projected positive velocity reaching `min(110, max(64, 0.22 * width))`. It also cancelled whenever the final 120 ms velocity was below -0.15 px/ms, regardless of total progress. That rejected slow short releases after a pause and could reject an otherwise complete gesture after a small lift retreat. Conversely, a deliberate reversal followed by a pause could be forgotten when the velocity window expired. These are code and synthetic-trace findings; they do not establish the exact path of a particular iPhone gesture.

The distance gate is now `min(64, max(48, 0.14 * width))`. Positive flick projection, the minimum 36 px movement, vertical safeguards and early gesture arbitration are retained. Meaningful direction is tracked separately from the velocity window, so a deliberate reversal still cancels after a pause and forward movement can explicitly resume. A small retreat can retain a crossed threshold. Motion tracking is constant-space, and the v60 velocity-continuous settle, preview colors/layout and edge-scroll code are unchanged.

| Phone width | v60 slow/held distance gate | v61 slow/held distance gate |
| --- | ---: | ---: |
| 320 px | 70.4 px | 48 px |
| 360 px | 79.2 px | 50.4 px |
| 375 px | 82.5 px | 52.5 px |
| 390 px | 85.8 px | 54.6 px |
| 393 px | 86.46 px | 55.02 px |
| 414 px | 91.08 px | 57.96 px |
| 430 px | 94.6 px | 60.2 px |

`browser-short-back.cjs` exercises slow short drags followed by a pause, actual fast input traces with explicit CDP input timestamps, small movements, lift retreat, deliberate reversal with a pause, rapid reversal, resumed forward intention, repeated/system-cancelled/interrupted gestures, vertical motion, reduced motion, nested selectors, recovered expense drafts, browser Back/Forward and complete synthetic financial integrity. Fast traces assert that the observed DOM-event velocity is genuinely forward and at least 0.3 px/ms; they do not rely on wall-clock tool dispatch overhead to simulate a flick. The module runs inside the existing animated navigation CI command. Set `GASTALO_SHORT_BACK_PROFILE=1` and point `GASTALO_URL` at a baseline checkout to record outcomes without asserting the new recognition contract.

Back still commits on release. Crossing a threshold while the finger remains down does not navigate, so holding, cancellation and reversal remain available. New v61 code has not been verified on a physical iPhone or in WebKit.

## Functional coverage and limitations

The new synthetic back regression checks four-pixel activation, preserved live DOM, burst coalescing, repeated cancellation, cold preparation, blur/resize/page-hide cleanup, the entrance-animation conflict, catching a returning card (including trusted touch hit-testing), draft recovery without transaction writes, and native browser Back/Forward entries. The existing navigation journey checks slow, held, reversed, cancelled and interrupted swipes; menu and nested selector behavior; focus restoration; reduced motion; native vertical scrolling; and preservation of months, horizontal rows and financial state at 320/390 px.

The new transaction regression uses 17 trusted-touch drags covering source → account, account → category, and account → another account, in both motion modes, before and after horizontal/vertical scrolling. It checks first-pixel activation, centered and off-center contact points, subsequent movement, correct prefilled forms, cancelled forms/drops, repeated gestures, stationary work and stationary edge scrolling. It compares the complete saved synthetic state with the starting state. Existing smoke and reorder checks cover native name/amount scrolling, pointer and mouse input, invalid directions, reorder groups, horizontal/vertical edge scrolling, keyboard reordering, persistence and financial invariants. Existing movement checks cover full-width tags, compact forms, keyboard viewport changes, backdrop dismissal, accessibility/focus, and recovery of staged tags and drafts.

WebKit was not available. `PLAYWRIGHT_BROWSERS_PATH=/tmp/gastalo-browsers playwright install webkit` failed because the download destinations returned HTTP 403 `Domain forbidden` under this environment's network policy. This is a denied browser-download action, not a failed WebKit test or an automatic approval-review denial. This cloud workflow did not test a physical iPhone or installed iOS PWA. Safari-specific compositing, blur cost, browser edge gestures, the real keyboard, and sustained 60/120 Hz performance still require device validation. Publication is verified separately through exact-head PR checks, post-merge checks and the GitHub Pages workflow.
