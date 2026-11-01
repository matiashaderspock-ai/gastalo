# Engineering and UI/UX review, 31 October 2026

Baseline: `9b51324` on `main`. Scope: integer money calculations and validation, persistence/revision protection, backup import/export and sync boundaries, home entities, transaction creation/edit/Undo, filters/history, category limits, charts, dialog focus, navigation/gestures, responsive layouts, demo isolation and offline update behavior.

## Findings and changes

| Priority | Finding | Outcome |
| --- | --- | --- |
| Medium | Saving a category limit re-renders its invoking button. Native dialog focus restoration then falls back to the document. Reproduced in the live English demo by saving Food's existing limit. | Shared modal handling identifies the replacement trigger and returns focus to it after close. If it is no longer visible/available, focus moves to main content. The same behavior applies to shared source/account/category forms. |
| Medium | The active month was initialized once at startup. An installed app resumed in a later month continued showing the old month's spending and limits. | Track the last observed calendar month in the profile time zone. Advance periods that still follow the current month independently; preserve deliberately selected historical periods. Check on resume, foreground, rendering and a visible-view timer. |
| Medium | Refreshing a month must not discard a form or change the period it edits. | Defer timer/foreground rendering while dialogs, editing or gestures are active. The existing budget-form period snapshot stays fixed. Filter and sync-settings drafts are not replaced by the timer. |

The established compact layout is retained because the repository already contains a substantial recent UI/performance review and regression coverage. No speculative redesign, storage migration, monetary-rule change, backup-format change or synchronization change is included. App-shell JS/CSS and the public demo link advance to v55.

### Follow-up: month boundary while closing without saving

Cancel and other modal actions could advance the observed month without rendering, leaving October visible while the next editor used November. Month synchronization now retains a pending refresh until rendering consumes it. Dialog close refreshes before resolving the replacement focus target, so Escape/native dismissal cannot detach the restored target. Existing form-period snapshots, historical selections and draft/gesture refresh guards are retained.

The Node harness now dispatches dialog close callbacks. Cancel and an intervening action followed by native close fail against the previous PR head (`40db256`) and pass with the correction. Browser regressions cover Cancel, Escape, native close and an intervening dispatcher action, checking November on screen and in the next editor, discarded edits, and focus on the connected replacement button. The existing October save-period regression remains in place. CI run 41267641292 exposed an existing timing assumption in the save-focus assertion: hiding a dialog does not await its queued close event. Browser save-focus checks now wait for the expected focused trigger before asserting; they retain the same focus requirement.

## Verification

- Baseline: 132/132 Node tests. Initial PR: 134/134. Follow-up close regression fix: 137/137. Both new month-boundary checks fail against the exact baseline source and pass after the fix, using the actual application with a controlled clock and synthetic IndexedDB boundary.
- `node --check app.js`, `node --check sw.js`, `node --check tests/browser-review.cjs` and `git diff --check` pass.
- The existing required CI browser suite now also checks focus after a budget save, Bolivia's October/November boundary with an open form, retaining that form's October save period, independent historical limits, and 320/390/768/1280 px overflow checks across Home, History, Limits, Charts and Import/Export.
- Existing CI browser coverage remains enabled for movements, drafts, imports, demo isolation, back navigation, charts, offline operation and update transitions.
- The initial review executor blocked Chromium socket operations. The follow-up executor passed the full required browser suite locally with Playwright 1.58.2 and Chromium 154: review, demo, back navigation with and without animation, entity charts, and app updates. Final PR CI outcomes are reported separately. Physical-device behavior is not established by those runs.
- Publication was subsequently authorized. Draft PR #50 runs the required CI browser suite and records its outcomes. The final delivery message distinguishes passing checks from any pending or failed checks. This task leaves the PR in draft without merging or deploying.
- No user financial dataset, synchronization token or private backup repository was accessed during review. Synthetic fixtures and isolated demo contexts are used by the checks.

## Remaining risks and follow-up

- Full-state validation and writes still scale with dataset size. The earlier measured optimizations in `review-validation.md` remain relevant, but were not re-benchmarked here; no performance gain is claimed.
- Custom drag, swipe and back-navigation interactions remain a substantial maintenance surface. The existing keyboard alternatives and gesture regressions help; physical iPhone interaction and VoiceOver remain necessary checks.
- The current-month behavior preserves periods whose value differs from the previously observed current month. Deliberately navigating to another period remains a view choice, not a financial-data mutation.
- GitHub backup credentials remain browser-local under the existing design. This review does not expand their permissions or alter synchronization.
- Physical iPhone safe areas, native date pickers, keyboard behavior, suspension and installed-PWA updating are not established by Chromium emulation.
