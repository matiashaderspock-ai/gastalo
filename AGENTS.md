# Instructions for Codex

Por defecto, dejá que el workflow Auto-merge fusione los PRs. La etiqueta `needs-matias` requiere revisión de Matias: sin autorización explícita, dejá el PR abierto.

Si Matias indica que revisó un PR y pide fusionarlo (por ejemplo, «ya lo revisé, mergealo»), esa instrucción autoriza a Codex a fusionar ese PR por API o web, incluso si conserva `needs-matias`. No vuelvas a pedir confirmación por esta regla o por esa etiqueta. La autorización se aplica al PR indicado, no a otros PRs pendientes o futuros.

Antes de fusionar, verificá que los checks requeridos estén aprobados, que no haya conflictos y que el commit a fusionar sea el revisado. Usá el SHA esperado de la cabecera para impedir fusionar cambios posteriores sin revisar. Conservá las protecciones de rama, los checks y el guard de cambios sensibles; no fuerces un merge ni omitas checks fallidos. Después, verificá el resultado de la publicación.

## Codex PR failure reporting

This rule applies to every PR created or updated by Codex in `matiashaderspock-ai/gastalo`, `matiashaderspock-ai/courier-sentiment-bot`, `matiashaderspock-ai/tradier-readonly`, and `matiashaderspock-ai/cumpafit`.

- Check required CI checks, auto-merge activation/completion, and deployments after merging before considering PR delivery complete.
- If a required check fails, auto-merge cannot activate or complete for a reason other than `needs-matias`, or a deployment fails after the merge, leave ONE PR comment beginning exactly with `[codex-fail]`.
- Si activar el auto-merge falla porque el PR ya está `clean`/mergeable y todos los checks requeridos están en verde, NO es un fallo: no comentes [codex-fail]. Esperá a que el workflow Auto-merge lo mergee, salvo que Matias haya autorizado explícitamente la fusión manual de ese PR. Si no se fusiona, comentá [codex-fixed] o [codex-fail] según el resultado real. Los PRs con `needs-matias` se dejan abiertos únicamente mientras falte esa autorización explícita.
- After that prefix, include the failed check or step, the link to its workflow run, and the actual error line. Quote observed errors; do not invent a log line or run URL, and redact any secrets.
- Before commenting, read the existing PR comments. Group failures from the same unresolved incident into that single comment; update it if necessary instead of posting duplicates on retries or repeated checks.
- Do not post status comments when everything passes or when the PR is only waiting for `needs-matias`. Pending/running checks alone are not failures.
- If the failure is fixed in the same PR, verify the fix and leave another comment beginning exactly with `[codex-fixed]`, identifying the recovered check or step and linking the successful run.

Failure comment format:

`[codex-fail] <failed check or step> — <workflow run URL> — <actual error line>`
