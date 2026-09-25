#!/usr/bin/env node
/*
 * Start a new blog post.
 *
 *     node blog/new-post.js "What I learned shipping HalfLight"
 *
 * Creates blog/<slug>/index.html from _template.html and adds the entry to
 * the top of posts.js, so the post is listed and reachable straight away.
 * Then open the new index.html and write — everything inside
 * <article class="post-article"> is yours.
 *
 * Options:
 *     --date "March 2026"      how the date should read   (default: this month)
 *     --read "6 min read"      reading time               (default: none)
 *     --excerpt "One line."    shown under the title       (default: a TODO)
 *     --tags "Swift, Postgres" comma-separated             (default: none)
 */
const fs = require("fs");
const path = require("path");

const blogDir = __dirname;

// ── Arguments ────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opts = { date: "", read: "", excerpt: "", tags: "" };
const words = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  const key = arg.startsWith("--") ? arg.slice(2) : null;
  if (key && Object.prototype.hasOwnProperty.call(opts, key)) {
    opts[key] = argv[++i] || "";
  } else if (key) {
    console.error(`Unknown option: ${arg}`);
    process.exit(1);
  } else {
    words.push(arg);
  }
}

const title = words.join(" ").trim();
if (!title) {
  console.error('Usage: node blog/new-post.js "Post title" [--date …] [--read …] [--excerpt …] [--tags …]');
  process.exit(1);
}

// ── Derived values ───────────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")   // strip accents
    .replace(/['’]/g, "")              // keep don't → dont, not don-t
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const slug = slugify(title);
if (!slug) {
  console.error("That title has no letters or digits to make a URL from.");
  process.exit(1);
}

const now = new Date();
const date =
  opts.date ||
  now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const excerpt = opts.excerpt || "TODO: one or two sentences of the opening.";
const tags = opts.tags
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

// ── The post page ────────────────────────────────────────────────────────
const postDir = path.join(blogDir, slug);
if (fs.existsSync(postDir)) {
  console.error(`blog/${slug}/ already exists — pick another title, or delete it first.`);
  process.exit(1);
}

const template = fs.readFileSync(path.join(blogDir, "_template.html"), "utf8");

// Anything dropped into an HTML attribute or body has to be escaped, titles
// with & or a quote included.
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const page = template
  // Drop the note explaining the template — it is not about the post.
  .replace(/<!-- ═{3,}[\s\S]*?═{3,} -->\n/, "")
  .replace(/\{\{TITLE\}\}/g, esc(title))
  .replace(/\{\{DATE\}\}/g, esc(date))
  .replace(/\{\{READ\}\}/g, esc(opts.read || "Draft"))
  .replace(/\{\{SLUG\}\}/g, slug)
  .replace(/\{\{DESCRIPTION\}\}/g, esc(excerpt));

fs.mkdirSync(postDir);
fs.writeFileSync(path.join(postDir, "index.html"), page);

// ── The index entry ──────────────────────────────────────────────────────
// Single-quoted JS strings, so escape for that rather than for HTML.
function js(str) {
  return `'${String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

const fields = [
  `        title: ${js(title)}`,
  `        date: ${js(date)}`,
  `        href: ${js(slug + "/")}`,
];
if (opts.read) fields.push(`        read: ${js(opts.read)}`);
fields.push(`        excerpt: ${js(excerpt)}`);
if (tags.length) fields.push(`        tags: [${tags.map(js).join(", ")}]`);

const entry = `    {\n${fields.join(",\n")}\n    },\n`;

const postsPath = path.join(blogDir, "posts.js");
const posts = fs.readFileSync(postsPath, "utf8");
const marker = "    /* new posts are inserted here */\n";
if (!posts.includes(marker)) {
  console.error(
    "Couldn't find the insertion marker in blog/posts.js.\n" +
    "Add this entry by hand at the top of the array:\n\n" + entry
  );
  process.exit(1);
}
fs.writeFileSync(postsPath, posts.replace(marker, marker + entry));

// ── Done ─────────────────────────────────────────────────────────────────
console.log(`✓ blog/${slug}/index.html   — write the post here`);
console.log(`✓ blog/posts.js             — listed as "${title}"`);
console.log(`\nPreview: open blog/index.html, or go straight to blog/${slug}/index.html`);
console.log(`The ?v= cache hashes are stamped for you on commit.`);
