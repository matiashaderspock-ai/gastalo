const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const workflow = fs.readFileSync(__dirname + '/../.github/workflows/label-guard.yml', 'utf8');
// Execute the actual github-script step against API mocks, without checking out PR code.
const script = workflow.split('          script: |\n')[1].split('\n').map(line => line.slice(12)).join('\n');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction('github', 'context', 'core', script);
const source = '  async function uploadBackup() {\n    return 1;\n  }\n  function home() {\n    return 1;\n  }\n';
async function inspect(files, options = {}) {
  const added = [], created = [], disabled = [], reads = [], output = {};
  const pr = { number: 1, node_id: 'PR_test', base: { sha: 'base' }, head: { sha: 'head' }, changed_files: files.length, labels: [], ...options.pr };
  const github = {
    rest: {
      pulls: { get: async () => ({ data: pr }), listFiles() {} },
      issues: {
        getLabel: async () => { if (options.missing && !created.length) throw { status: 404 }; },
        createLabel: async label => { created.push(label); },
        addLabels: async labels => { added.push(labels); },
      },
      repos: {
        compareCommitsWithBasehead: async () => ({ data: { merge_base_commit: { sha: 'base' } } }),
        getContent: async ({ ref }) => {
        reads.push(ref);
        if (options.error) throw new Error('Synthetic API failure');
        return { data: { encoding: 'base64', content: Buffer.from(ref === 'base' ? options.before ?? source : options.after ?? source.replaceAll('return 1', 'return 2')).toString('base64') } };
      } },
    },
    paginate: async () => files,
    graphql: async (...args) => { disabled.push(args); },
  };
  await run(github, { repo: { owner: 'example', repo: 'fixture' }, payload: { pull_request: { number: 1 } } }, { setOutput: (key, value) => { output[key] = value; } });
  return { added, created, disabled, reads, output };
}
const file = (filename, patch, status = 'modified') => ({ filename, patch, status });

test('CSS-only PR is eligible and the needs-matias label is created when missing', async () => {
  const result = await inspect([file('styles.css', '@@ -1 +1 @@\n-a {color: red}\n+a {color: blue}')], { missing: true });
  assert.equal(result.output.needs_matias, 'false');
  assert.deepEqual(result.added, []);
  assert.equal(result.created[0].name, 'needs-matias');
  assert.deepEqual(result.reads, []);
});

test('sync/reset/deletion markers and merge-policy files require review', async () => {
  for (const [path, line] of [
    ['app.js', 'sync_config'], ['app.js', 'uploadBackup'], ['app.js', 'gastalo-data'],
    ['index.html', 'Restablecer todo'], ['app.js', 'store.delete(key)'], ['app.js', 't.status = "deleted"'],
    ['.github/workflows/automerge.yml', 'anything'], ['.github/workflows/label-guard.yml', 'anything'],
    ['.github/workflows/tests.yml', 'anything'], ['src/sync.js', 'anything'],
  ]) {
    const result = await inspect([file(path, '@@ -1 +1 @@\n-old\n+' + line)]);
    assert.equal(result.output.needs_matias, 'true', path + ': ' + line);
    assert.deepEqual(result.added[0].labels, ['needs-matias']);
  }
});

test('edits inside uploadBackup are guarded even without a sync identifier in the changed lines', async () => {
  const result = await inspect([file('app.js', '@@ -2 +2 @@\n-    return 1;\n+    return 2;')]);
  assert.equal(result.output.needs_matias, 'true');
  assert.deepEqual(result.reads, ['base', 'head']);
});

test('old function ranges detect deleted or renamed sensitive functions', async () => {
  for (const name of ['eraseEntity', 'resetApp', 'deleteTransaction', 'commit']) {
    const result = await inspect([file('app.js', '@@ -2 +2 @@\n-    return 1;\n+    return 2;')], {
      before: source.replace('uploadBackup', name), after: source.replace('uploadBackup', 'ordinary'),
    });
    assert.equal(result.output.needs_matias, 'true', name);
  }
});

test('an unrelated UI function in app.js remains eligible', async () => {
  const result = await inspect([file('app.js', '@@ -5 +5 @@\n-    return 1;\n+    return 2;')]);
  assert.equal(result.output.needs_matias, 'false');
});

test('old diff lines use the merge base when the target branch has advanced', async () => {
  const result = await inspect([file('app.js', '@@ -2 +2 @@\n-    return 1;\n+    return 2;')], { pr: { base: { sha: 'advanced-base' } } });
  assert.equal(result.output.needs_matias, 'true');
  assert.deepEqual(result.reads, ['base', 'head']);
});

test('sync settings expressed as an arrow function are guarded', async () => {
  const before = '    const defaultSyncConfig = () => ({\n      branch: "main",\n    });\n';
  const result = await inspect([file('app.js', '@@ -2 +2 @@\n-      branch: "main",\n+      branch: "other",')], { before, after: before.replace('main', 'other') });
  assert.equal(result.output.needs_matias, 'true');
});

test('manual labels are retained and queued auto-merge is disabled', async () => {
  const result = await inspect([file('styles.css', '@@ -1 +1 @@\n-old\n+new')], {
    pr: { labels: [{ name: 'needs-matias' }], auto_merge: {} },
  });
  assert.equal(result.output.needs_matias, 'true');
  assert.deepEqual(result.added, []);
  assert.equal(result.disabled.length, 1);
  assert.deepEqual(result.disabled[0][1], { id: 'PR_test' });
});

test('sensitive synchronize disables previously enabled auto-merge and missing diffs fail closed', async () => {
  for (const files of [[file('app.js')], [file('app.js', '@@ -2 +2 @@\n-    return 1;\n+    return 2;')]]) {
    const result = await inspect(files, { pr: { auto_merge: {} } });
    assert.equal(result.output.needs_matias, 'true');
    assert.equal(result.disabled.length, 1);
  }
  const truncated = await inspect([], { pr: { changed_files: 1 } });
  assert.equal(truncated.output.needs_matias, 'true');
  await assert.rejects(inspect([file('app.js', '@@ -2 +2 @@\n-a\n+b')], { error: true }), /Synthetic API failure/);
});

test('required test waits for labeling and fails (rather than skips) if the guard fails', () => {
  const tests = fs.readFileSync(__dirname + '/../.github/workflows/tests.yml', 'utf8');
  assert.match(tests, /  test:\n[\s\S]*needs: label-guard\n    if: always\(\)/);
  assert.match(tests, /needs.label-guard.result != 'success'\n        run: exit 1/);
  const auto = fs.readFileSync(__dirname + '/../.github/workflows/automerge.yml', 'utf8');
  assert.match(auto, /user.login == 'matiashaderspock-ai'/);
  assert.match(auto, /needs.label-guard.outputs.needs_matias == 'false'/);
  assert.match(auto, /gh pr merge "\$PR_NUMBER" --auto --squash --match-head-commit "\$PR_HEAD"/);
});
