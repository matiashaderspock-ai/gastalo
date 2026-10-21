# Instructions for Codex

Nunca mergees un PR vos mismo (ni web ni API). Solo el workflow Auto-merge mergea. Si un PR tiene needs-matias, dejalo abierto y pará.

## Codex PR failure reporting

This rule applies to every PR created or updated by Codex in `matiashaderspock-ai/gastalo`, `matiashaderspock-ai/courier-sentiment-bot`, `matiashaderspock-ai/tradier-readonly`, and `matiashaderspock-ai/cumpafit`.

- Check required CI checks, auto-merge activation/completion, and deployments after merging before considering PR delivery complete.
- If a required check fails, auto-merge cannot activate or complete for a reason other than `needs-matias`, or a deployment fails after the merge, leave ONE PR comment beginning exactly with `[codex-fail]`.
- After that prefix, include the failed check or step, the link to its workflow run, and the actual error line. Quote observed errors; do not invent a log line or run URL, and redact any secrets.
- Before commenting, read the existing PR comments. Group failures from the same unresolved incident into that single comment; update it if necessary instead of posting duplicates on retries or repeated checks.
- Do not post status comments when everything passes or when the PR is only waiting for `needs-matias`. Pending/running checks alone are not failures.
- If the failure is fixed in the same PR, verify the fix and leave another comment beginning exactly with `[codex-fixed]`, identifying the recovered check or step and linking the successful run.

Failure comment format:

`[codex-fail] <failed check or step> — <workflow run URL> — <actual error line>`
