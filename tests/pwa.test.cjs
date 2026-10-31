const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("nombre visible y rutas relativas compatibles con Pages e instalación en iPhone", () => {
  const manifest = JSON.parse(read("manifest.json")),
    html = read("index.html");
  assert.match(html, /<title>gástalo<\/title>/);
  assert.equal(manifest.name, "gástalo");
  assert.equal(manifest.short_name, "gástalo");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.match(html, /apple-touch-icon/);
  assert.match(html, /viewport-fit=cover/);
  for (const icon of manifest.icons)
    assert.ok(fs.existsSync(path.join(root, icon.src)));
});

test("las versiones de JS/CSS de index.html coinciden con FILES y CACHE del service worker", () => {
  const html = read("index.html"),
    sw = read("sw.js");
  const js = /app\.js\?v=(\d+)/.exec(html)[1],
    css = /styles\.css\?v=(\d+)/.exec(html)[1];
  assert.equal(js, css);
  assert.ok(sw.includes(`gastalo-v${js}`));
  assert.ok(sw.includes(`./app.js?v=${js}`));
  assert.ok(sw.includes(`./styles.css?v=${css}`));
  const demoVersions = [...read("README.md").matchAll(/app-version=(\d+)/g)];
  assert.ok(demoVersions.length > 0, "README includes the versioned public demo link");
  for (const [, version] of demoVersions) assert.equal(version, js, "Demo link opens the current app shell");
});
