# Blog

Static, like the rest of the site — no build step, no dependencies. A post is
a plain HTML page in its own folder, plus one entry in a list.

## Writing a post

```sh
node blog/new-post.js "What I learned shipping HalfLight"
```

That creates:

- `blog/what-i-learned-shipping-halflight/index.html` — from `_template.html`,
  with the title, date, slug and meta tags already filled in
- an entry at the top of `blog/posts.js`, so it is listed and linked

Then open the new `index.html` and write. Everything inside
`<article class="post-article">` is yours; write ordinary HTML — `h2`, `p`,
`ul`, `blockquote`, `pre`/`code`, `img` and links are all styled already, so
no post ever needs a class on anything. The template ships with one of each as
a starting point; delete what you don't use.

Options, all optional:

```sh
node blog/new-post.js "Title" \
  --date "March 2026" \        # default: the current month
  --read "6 min read" \        # default: "Draft"
  --excerpt "One sentence." \  # shown under the title on the index
  --tags "Swift, Postgres"     # comma-separated
```

## Editing or removing a post

`blog/posts.js` is the index — plain data, safe to edit by hand. Reorder it,
fix an excerpt, or delete an entry. Removing a post means deleting its entry
*and* its folder.

A post can also point somewhere else entirely: give the entry a full URL as
`href` and `external: true`, and it opens in a new tab. Useful for anything
that lives on Medium.

## What is where

| File | What it is |
| --- | --- |
| `index.html` | the list page |
| `posts.js` | the posts, as data — the only file `new-post.js` edits |
| `blog.js` | renders the list; also the year, copy-email and scroll reveal |
| `blog.css` | this section's styles, on top of the site's `../style.css` |
| `_template.html` | the stencil a new post is copied from |
| `new-post.js` | the command above |
| `<slug>/index.html` | one post |

## Things that take care of themselves

- **Cache busting.** `cache-bust.js` finds `blog/*/index.html` on its own, so
  a new post never means editing it. The pre-commit hook stamps the `?v=`
  hashes and re-stages any tracked page it rewrote.
- **Theme.** Every page here loads `../style.css` first and only adds on top,
  so the blog follows the site's colors and type automatically.
- **The empty state.** "First posts arriving soon" shows only while
  `posts.js` is empty, and disappears on its own with the first entry.
