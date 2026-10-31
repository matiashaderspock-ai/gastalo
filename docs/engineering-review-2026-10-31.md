# Engineering and UI/UX review, 31 October 2026

Baseline: `9b51324` on `main`. Scope: integer money calculations and validation, persistence/revision protection, backup import/export and sync boundaries, home entities, transaction creation/edit/Undo, filters/history, category limits, charts, dialog focus, navigation/gestures, responsive layouts, demo isolation and offline update behavior.

## Findings and changes

| Priority | Finding | Outcome |
| --- | --- | --- |
| Medium | Saving a category limit re-renders its invoking button. Native dialog focus restoration then falls back to the document. Reproduced in the live English demo by saving Food's existing limit. | Shared modal handling identifies the replacement trigger and returns focus to it after close. If it is no longer visible/available, focus moves to main content. The same behavior applies to shared source/account/category forms. |
| Medium | The active month was initialized once at startup. An installed app resumed in a later month continued showing the old month's spending and limits. | Track the last observed calendar month in the profile time zone. Advance periods that still follow the current month independently; preserve deliberately selected historical periods. Check on resume, foreground, rendering and a visible-view timer. |
| Medium | Refreshing a month must not discard a form or change the period it edits. | Defer timer/foreground rendering while dialogs, editing or gestures are active. The existing budget-form period snapshot stays fixed. Filter and sync-settings drafts are not replaced by the timer. |

The established compact layout is retained because the repository already contains a substantial recent UI/performance review and regression coverage. No speculative redesign, storage migration, monetary-rule change, backup-format change or synchronization change is included. App-shell JS/CSS and the public demo link advance to v54.

## Verification

- Baseline and post-change Node suite: 132/132 tests.
- `node --check app.js`, `node --check sw.js`, `node --check tests/browser-review.cjs` and `git diff --check` pass.
- The existing required CI browser suite now also checks focus after a budget save, Bolivia's October/November boundary with an open form, retaining that form's October save period, independent historical limits, and 320/390/768/1280 px overflow checks across Home, History, Limits, Charts and Import/Export.
- Existing CI browser coverage remains enabled for movements, drafts, imports, demo isolation, back navigation, charts, offline operation and update transitions.
- Local automated Chromium launch failed because this executor denies its required socket operation. Automated browser outcomes must be taken from PR CI. Live production interactions were inspected using the available interactive cloud browser.
- No user financial dataset, synchronization token or private backup repository was accessed during review. Synthetic fixtures and isolated demo contexts are used by the checks.

## Remaining risks and follow-up

- Full-state validation and writes still scale with dataset size. The earlier measured optimizations in `review-validation.md` remain relevant, but were not re-benchmarked here; no performance gain is claimed.
- Custom drag, swipe and back-navigation interactions remain a substantial maintenance surface. The existing keyboard alternatives and gesture regressions help; physical iPhone interaction and VoiceOver remain necessary checks.
- The current-month behavior preserves periods whose value differs from the previously observed current month. Deliberately navigating to another period remains a view choice, not a financial-data mutation.
- GitHub backup credentials remain browser-local under the existing design. This review does not expand their permissions or alter synchronization.
- Physical iPhone safe areas, native date pickers, keyboard behavior, suspension and installed-PWA updating are not established by Chromium emulation.
