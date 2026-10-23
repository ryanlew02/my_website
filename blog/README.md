# Blog — ryanlewan.com/blog

An Astro site that builds to plain static files for Hostinger, with
accounts, comments, likes and moderation on Supabase (free tier).

- **Posts** are Markdown files in `src/content/posts/`. Git is the source of
  truth, the backup and the version history.
- **Pages** are static HTML. Nothing runs on Hostinger but file serving.
- **Accounts, comments, likes, reports, views** live in Supabase. The browser
  talks to Supabase directly with the public key; every permission is enforced
  in Postgres (Row Level Security, column grants, and checked functions).

```
blog/
├── src/content/posts/      ← your posts (.md)
├── src/pages/              ← routes: /, /[slug]/, /tags/, /search/, /admin/, /account/, …
├── src/scripts/            ← browser code: comments, sign-in, admin dashboard
├── src/lib/                ← shared helpers (pure ones are unit-tested)
├── src/styles/blog.css     ← the whole design system, light + dark
├── supabase/migrations/    ← the database: tables, RLS, functions, storage
├── tests/                  ← unit, database-security (RLS) and browser tests
└── scripts/                ← new-post, assemble-site, preview
```

---

## Writing and publishing

### Write

```sh
cd blog
npm run new -- "My first fluid simulation" --category Graphics --tags "C++, OpenGL"
npm run dev            # http://localhost:4321/blog/
```

That creates `src/content/posts/my-first-fluid-simulation.md` as a **draft**.
The file name is the URL. Drafts show in `npm run dev` with a banner and are
never included in a production build. Edits reload live.

Frontmatter:

```yaml
---
title: "My first fluid simulation"
description: "One or two sentences — used on the index, in search, RSS and link previews."
date: 2026-10-22            # a future date = scheduled: left out of builds until then
updated: 2026-11-01         # optional; shows "Updated …"
category: Graphics          # one per post
tags: [C++, OpenGL]         # any number
draft: true                 # flip to false to publish
featured: false             # pin to the top of the index
cover: ./images/cover.jpg   # optional, relative to the .md file
coverAlt: "What the cover shows"
---
```

For images, use a folder per post (`posts/my-post/index.md` plus
`posts/my-post/images/…`) and reference them relatively. Astro resizes and
optimizes them at build time.

What Markdown supports: headings (with anchors and an automatic table of
contents), code blocks (highlighting, language label, ```` ```cpp title="main.cpp" ````,
copy button), `$inline$` and `$$display$$` KaTeX math, tables, footnotes, task
lists, and raw HTML for YouTube (no-cookie) or Vimeo embeds. The draft post
`markdown-style-guide.md` shows every element. Note that `<script>` tags inside
a post never run: the page's Content Security Policy blocks them by design.

### Publish

1. Set `draft: false` and commit.
2. `npm run build`. This type-checks, builds the blog, and assembles the whole
   site (portfolio + blog) in `../dist/`. The build refuses to finish if a
   draft somehow ended up in it.
3. Upload the **contents** of `dist/` to `public_html` on Hostinger. The
   portfolio files are copied from the repo root unchanged; you can also
   upload just `dist/blog/` if nothing else changed.
4. Open `/blog/admin/` once. It syncs the post list into the database so
   the new post gets its comment section and like button. Until then, the post
   says "The discussion opens once this post is live."

To unpublish, delete the file (or set `draft: true`), rebuild, re-upload, and
visit the dashboard. The post is marked unpublished; its comments are kept
but hidden, and come back if the post returns. Don't rename a published
post's file: that changes its URL and starts a new discussion.

Scheduling: a post dated in the future appears on the first build after its
date. There is no server to publish it on time automatically.

Pages are served with `Cache-Control: no-cache`, so readers see an upload
immediately. Built assets have fingerprinted names and are cached for a year.

---

## One-time setup

### 1. Local

```sh
cd blog
npm install
cp .env.example .env     # then fill it in (step 2)
npm run dev
```

Node 22+ (developed on 26).

### 2. Supabase project (free)

1. Create a project at supabase.com.
2. **Run the migrations.** Open SQL Editor → New query, paste each file in
   `supabase/migrations/` in filename order, and run it. New migrations
   added later get run the same way, once each. (Or with
   the CLI: `supabase link --project-ref <ref>` then `supabase db push`.)
3. Project Settings → API: copy the **Project URL** and the **anon / publishable**
   key into `.env`:
   ```
   PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```
   Both are public by design; they end up in every visitor's browser. **Never**
   put the `service_role` / secret key anywhere in this project.
4. Authentication → URL Configuration:
   - Site URL: `https://ryanlewan.com/blog/`
   - Redirect URLs: `https://ryanlewan.com/blog/auth/callback/` and
     `http://localhost:4321/blog/auth/callback/`

### 3. Sign-in providers

**GitHub:** GitHub → Settings → Developer settings → OAuth Apps → New.
Homepage `https://ryanlewan.com/blog/`; callback
`https://<ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret
into Supabase → Authentication → Providers → GitHub.

**Google:** Google Cloud Console → APIs & Services → Credentials → Create
OAuth client ID (Web). Authorized redirect URI
`https://<ref>.supabase.co/auth/v1/callback`. Configure the consent screen
(External, app name, your email). Paste the ID and secret into Supabase →
Providers → Google.

**Email magic links (optional, off by default):** Supabase's built-in mailer
only delivers to your own project team's addresses and is heavily rate
limited, so visitors' links would never arrive. To turn this on, add custom
SMTP under Authentication → SMTP Settings (free options include Resend and
Brevo; check their current free quotas), then set
`PUBLIC_ENABLE_EMAIL_LOGIN=true` in `.env` and rebuild.

### 4. Make yourself admin (once)

Sign in on the site once with your own account, then in the SQL Editor run:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'ryanlewan.2@gmail.com';
```

Only the SQL Editor (or the service role) can write to `user_roles`. No
browser request can, whatever it sends. To remove admin:
`delete from public.user_roles where user_id = '<uuid>';`

---

## Moderation

`/blog/admin/` (admins only; anyone else gets nothing back from the database):

- **Overview:** posts, users, comments, open reports, likes, 30-day views,
  most-read posts, recent activity.
- **Posts:** what's deployed, sync state, views, comments and likes per post;
  close or reopen a post's comments.
- **Comments:** search and filter everything; **Hide** (reversible; replies
  stay visible under a "removed" placeholder), **Restore**, or **Delete**
  (removes the comment and its replies).
- **Reports:** grouped by comment. A comment with three open reports is hidden
  automatically until you restore or delete it. **Dismiss** keeps it visible.
- **Users:** public profile data only (no emails). **Suspend** blocks
  commenting, liking, reporting and profile edits; it's reversible.

Built-in spam limits: 3 comments a minute, 30 a day, no identical repeats
within an hour, 20 reports a day, and replies nest at most three levels.

---

## How it works: security

| Concern | Where it's handled |
| --- | --- |
| Who can write what | RLS policies + column-level grants on every table (`supabase/migrations`). Clients can only set `body`/`post_id`/`parent_id` on comments; author, status and timestamps are forced by triggers. |
| Admin powers | `user_roles` table, writable only from the SQL Editor. `is_admin()` is checked inside every admin policy and function. |
| Ownership spoofing | `author_id`/`user_id`/`reporter_id` are always overwritten with `auth.uid()`. |
| Drafts | Never built in production, never in the search index, RSS or sitemap. The deploy script refuses a build that contains one. |
| XSS | Comments and bios are plain text, inserted as DOM text nodes (`src/lib/dom.ts` has no `innerHTML` path). Pages ship a CSP that allows only this site's scripts plus hashed ones. |
| Open redirects | `safeNext()` only accepts same-origin paths under `/blog/`; the OAuth callback URL is fixed. |
| Avatars | `avatars` bucket: 512 KB max, PNG/JPEG/WebP only (no SVG), uploads only into your own folder. The browser re-encodes images, which strips EXIF/GPS data. |
| Sessions | **Trade-off:** a static host can't set HttpOnly cookies, so supabase-js keeps the session in `localStorage` (Supabase's documented pattern for browser-only apps) with the PKCE flow. The CSP and text-only rendering are what keep injected script away from it. Moving to server-side rendering (e.g. Cloudflare) later would allow cookie sessions. |
| Account deletion | Account settings → Delete. Removes the profile, likes, reports and avatar; comments others replied to become "removed" placeholders. |

The `.htaccess` in `public/` (deployed as `dist/blog/.htaccess`) adds
`X-Frame-Options`, `nosniff`, a referrer policy, `noindex` on account/admin
pages, cache headers and the 404 page.

---

## Tests

```sh
npm test            # unit + database security tests (vitest)
npm run test:e2e    # browser tests (Playwright; first run: npx playwright install chromium)
npm run check       # TypeScript / Astro type check
```

- **`tests/db/`** runs the real migration in PGlite (Postgres compiled to WASM)
  on a small stand-in for Supabase's `auth`/`storage` schemas, then attacks it
  as anon, as a user, as another user and as an admin: privilege escalation,
  ownership spoofing, editing others' comments, reading drafts, banned users,
  rate limits, reports, storage paths, account deletion.
- **`tests/unit/`** covers the Markdown pipeline, the open-redirect guard,
  search ranking, comment threading, error messages, and avatar checks.
- **`tests/e2e/`** builds the site with fixture posts and a fake Supabase,
  then drives it in Chromium (desktop and phone): rendering, CSP, theme, search,
  SEO tags, the sign-in/callback flow, comments, admin access, and outage
  behavior.

What the tests **don't** prove: the migration against a real Supabase
project, real Google/GitHub sign-in, and Hostinger honoring the `.htaccess`
headers. Check those once by hand after setup (see Troubleshooting).

---

## Free-tier limits (check current numbers on each provider's pricing page)

- **Supabase Free:** 500 MB database, 1 GB file storage, 5 GB egress,
  50,000 monthly active users. **Free projects pause after about a week with
  no API activity.** The blog itself keeps working; comments show "Couldn't
  load the discussion" until you press Restore in the dashboard. Built-in
  auth emails are restricted (see Email above).
- **Hostinger:** whatever your plan already includes. The blog adds a few MB
  of static files.
- **Google/GitHub OAuth:** free.

A small blog stays far inside these limits: comments are a few hundred bytes
each, and avatars are re-encoded to about 20 KB.

---

## Troubleshooting

- **"Comments aren't configured on this build"**: `.env` was missing when you
  built. Fill it in and rebuild.
- **Sign-in returns to "Sign-in didn't finish"**: the redirect URL isn't in
  Supabase's allow-list (step 2.4), or the link was opened in a different
  browser from the one that requested it.
- **"The discussion opens once this post is live"**: visit `/blog/admin/`
  to sync, or press **Sync now** on the Posts tab.
- **Comments fail everywhere**: the Supabase project is paused. Restore it
  in the dashboard.
- **Check the headers on Hostinger** after the first upload:
  `curl -sI https://ryanlewan.com/blog/ | grep -i -E "x-frame|cache-control|content-security"`.
  If they're missing, LiteSpeed isn't applying `mod_headers` rules. The CSP
  `<meta>` tag in each page still applies.
- **Check the database policies** after running the migration: Supabase →
  Advisors → Security should list no tables without RLS. It will still warn
  that SECURITY DEFINER functions are callable by `anon` / `authenticated`.
  That's expected: the static site has no server, so the browser calls them
  directly. The anon ones return only public data or facts about the caller
  (`is_admin`, `can_participate` are also needed by RLS policies), and every
  admin function starts with an `is_admin()` check. A new function should
  follow the same pattern; anything not meant for the browser gets
  `revoke execute ... from public, anon, authenticated`.

## Deliberate limits (static hosting)

- No in-browser post editor; writing happens in Markdown with live preview
  (`npm run dev`). This keeps git as the single source of truth, with full
  history and no way to lose a post to a database problem.
- Scheduling waits for the next build.
- Public profiles are `/blog/user/?u=name` (a static host can't serve a page
  per user) and are `noindex`.
