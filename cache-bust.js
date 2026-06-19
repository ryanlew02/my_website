#!/usr/bin/env node
/*
 * Cache busting for this static site.
 *
 * Rewrites the `?v=<hash>` query string on local .css/.js references in every
 * HTML file to a short hash of that file's *contents*. Run it before deploying:
 *
 *     node cache-bust.js
 *
 * Because the hash comes from the file contents, unchanged files keep the same
 * hash (browser keeps them cached -> no load-time penalty) and only files you
 * actually edited get a new hash and re-download. There is zero runtime cost:
 * a query string is handled natively by the browser, no extra requests, no JS.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;

// HTML files to process.
const htmlFiles = ["index.html", "divergeos/index.html", "innercity/index.html"];

// Matches href/src of local .css or .js assets, capturing an existing ?v=... if present.
const assetRe = /(href|src)=("|')([^"'?>]+\.(?:css|js))(?:\?v=[^"']*)?\2/g;

const hashCache = new Map();
function hashFor(absPath) {
  if (hashCache.has(absPath)) return hashCache.get(absPath);
  const buf = fs.readFileSync(absPath);
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8);
  hashCache.set(absPath, hash);
  return hash;
}

let changedFiles = 0;
for (const rel of htmlFiles) {
  const htmlPath = path.join(root, rel);
  const htmlDir = path.dirname(htmlPath);
  const original = fs.readFileSync(htmlPath, "utf8");

  const updated = original.replace(assetRe, (match, attr, quote, assetPath) => {
    // Skip absolute URLs (CDNs, etc.) — only version local files.
    if (/^https?:\/\//.test(assetPath) || assetPath.startsWith("//")) return match;

    const assetAbs = path.resolve(htmlDir, assetPath);
    if (!fs.existsSync(assetAbs)) {
      console.warn(`  ! ${rel}: ${assetPath} not found, leaving as-is`);
      return match;
    }
    return `${attr}=${quote}${assetPath}?v=${hashFor(assetAbs)}${quote}`;
  });

  if (updated !== original) {
    fs.writeFileSync(htmlPath, updated);
    changedFiles++;
    console.log(`✓ updated ${rel}`);
  } else {
    console.log(`= unchanged ${rel}`);
  }
}

console.log(`\nDone. ${changedFiles} HTML file(s) rewritten.`);
