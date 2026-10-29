# Review improvements — validation

This change keeps the label and calculation of **Gastos planeados** intact. Archived category limits continue to contribute under the existing rules; the limits page now discloses active and archived contributions. No migration or financial-backup schema change is required.

## Functional checks

- 120 unit tests, including independent BigInt accounting over 5,000 mixed posted/deleted records and equivalence of prepared monthly budgets with archived categories.
- Mobile browser coverage for filters, grouped dates, contextual transaction actions, optional dates/times, session draft recovery including reload of an open form, edit/Undo restoring every collection, budget states and invalid JSON preservation.
- Existing flows cover income/expense/transfers, imports, recurring historical limits, deletion/Undo, ordering and edge scrolling, charts, concurrency, reset/sync guards and offline updates.
- Browser update regression holds a version response in flight while a new foreground event arrives, ensuring the new check is queued instead of dropped.
- Chromium accessibility scan of Home, History, Limits, Reports and Import/Export found no violations for the WCAG 2 A/AA, WCAG 2.1 AA and best-practice rules exercised in the synthetic 390 px scenario. This is not a VoiceOver or complete accessibility certification.

## Measurements

Same local desktop runtime, Chromium iPhone viewport, CPU throttled 4×, synthetic data with 30 categories. Navigation is the median synchronous handler/render task over three actions; startup and save are one observation per size. These are not physical-device or production-network measurements.

| Records | Startup before → after | Home task before → after | Save before → after |
| ---: | ---: | ---: | ---: |
| 10,000 | 923 → 469 ms | 464 → 42 ms | 560 → 413 ms |
| 50,000 | 3,938 → 906 ms | 2,817 → 57 ms | 2,628 → 1,670 ms |

A warmed shell against a local origin deliberately configured not to respond loaded in 86 ms, compared with 4,051 ms before (one sample each). The immutable installed shell paints from cache; version checks and explicit newer releases still use the network. Offline, version-transition and open-form protection tests remain in place.

The initial cold load is not universally faster: an earlier three-sample run of this change measured about 287 ms locally and 1.92 s with 150 ms latency, 1.6 Mbps download and CPU 4×, versus 230 ms / 1.69 s in the original audit. The main gains are repeated work, large datasets and degraded-connectivity startup.

The complete state is still validated and written atomically with revision checks. Ordinary movement changes structurally copy their changed collections instead of serializing every untouched record; original records remain immutable so Undo and in-flight backups retain their prior snapshots. Safe-integer checks and overflow rejection remain active.

History's first record moved from about y=581 to y=348 at 390 px; the expense pie moved from about y=661 to y=369. The smaller layout retains larger touch targets and readable secondary colors.

## Limits

Physical iPhone/PWA touch, keyboard, memory and VoiceOver verification remain outstanding. Drafts live in the browser tab's session storage, with an in-memory fallback; they are not posted movements or backups and are not guaranteed after the browser/PWA is fully closed. Importing a different dataset or resetting clears them. Real user records and backup credentials were not used during validation.
