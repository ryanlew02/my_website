# Restyle brief — ryanlewan.com

Paste this file into your repo (e.g. `docs/RESTYLE-BRIEF.md`) and point Claude at it along with
`direction-1a-dossier.png`. The screenshot shows the intent; this file carries the exact values, so
nothing gets approximated.

**Instruction to give Claude:**

> Restyle the site to match `docs/RESTYLE-BRIEF.md` and the attached screenshot. Keep all existing
> content, routes, sections and behavior. Replace the visual layer only: tokens, type scale, layout
> and component styling. Do not change my copy. Do not add sections. Work section by section and
> show me each one before moving on.

---

## 1. Tokens

Define these once as CSS custom properties on `:root` and use them everywhere. No hard-coded hex
values anywhere else in the codebase.

```css
:root {
  /* ground + text */
  --color-bg:       #161826;
  --color-surface:  #232532;
  --color-text:     #e9e9ed;
  --color-accent:   #9184d9;
  --color-divider:  color-mix(in srgb, #e9e9ed 16%, transparent);

  /* neutral ramp */
  --color-neutral-100: #f3f5fe;
  --color-neutral-200: #e4e7f5;
  --color-neutral-300: #cfd3e5;
  --color-neutral-400: #b2b6ca;
  --color-neutral-500: #9397ab;
  --color-neutral-600: #75798c;
  --color-neutral-700: #595d6c;
  --color-neutral-800: #3f424d;
  --color-neutral-900: #292b31;

  /* accent ramp */
  --color-accent-100: #f5f4ff;
  --color-accent-200: #e7e5fe;
  --color-accent-300: #d2cefd;
  --color-accent-400: #b5abfc;
  --color-accent-500: #968ae0;
  --color-accent-600: #796cbf;
  --color-accent-700: #5d5294;
  --color-accent-800: #423a6a;
  --color-accent-900: #2b2741;

  /* the one saturated field — stat band / section dividers only */
  --color-section:       #262a60;
  --color-section-glow:  #353b80;
  --color-section-ghost: #4c5397;

  /* spacing (0.7x density — dense on purpose) */
  --space-1: 2.8px;  --space-2: 5.6px;  --space-3: 8.4px;
  --space-4: 11.2px; --space-6: 16.8px; --space-8: 22.4px;

  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 14px;

  --shadow-sm: 0 0 0 1px #3f424d;
  --shadow-md: 0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,0.55);
  --shadow-lg: 0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,0.65);
}
```

Rules that matter:

- Never pure black or pure white. Every value comes from the ramps above.
- Text hierarchy: `--color-text` for primary, `--color-neutral-300` for body copy,
  `--color-neutral-500` for secondary, `--color-neutral-600` for labels and meta.
- The accent is a **line and a glow, never a flood.** Borders, small marks, 1px rules, radial
  glows. No saturated fills anywhere on the page — the `--color-section` tokens above stay unused
  here; they exist in the system for deck dividers only.
- Elevation on a dark ground is an edge plus ambient darkness — use `--shadow-*`, don't stack
  shadows.

## 2. Typography

Two families, loaded from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- **Inter** — all headings and body. Headings never go past weight **500**; hierarchy is size and
  space, not boldness.
- **JetBrains Mono** — the machine voice only: section numbers, kickers, labels, tags, meta lines,
  the terminal. Never body copy.

Scale:

| Role | Size | Weight | Tracking | Notes |
| --- | --- | --- | --- | --- |
| Hero name | 104px | 500 | -0.045em | line-height 0.92, two lines, flush left |
| Section heading | 22px | 500 | -0.01em | sits in the left margin next to its number |
| Hero tagline | 20px | 400 | — | line-height 1.5, max-width 520px |
| Body | 17px | 400 | — | line-height 1.7, max-width 640px, `text-wrap: pretty` |
| Card title | 18px | 500 | — | |
| Card body / UI | 14.5px | 400 | — | line-height 1.6 |
| Kicker (mono) | 11.5px | 400 | 0.16em | uppercase, `--color-neutral-600` or accent |
| Tag / meta (mono) | 11–12px | 400 | 0.04em | |

## 3. Layout

See `direction-1a-dossier.png`.

- Page padding 56px horizontal. Content hugs the left; whitespace lives on the right.
- Every section is a two-column grid: `180px 1fr` with 56px gap. Left column holds the mono section
  number (`02`, in accent) stacked over the heading. Right column holds all content.
- Sections separated by a hairline that **fades to transparent at both ends** — this is the
  signature detail, don't use a plain `border-top`:
  ```css
  height: 1px;
  background: linear-gradient(to right, transparent, var(--color-divider) 56px,
              var(--color-divider) calc(100% - 56px), transparent);
  ```
- Hero: `1fr 340px` grid, bottom-aligned. Headline left, photo right at 420px tall.
- No cards, no boxes, no panels in this direction. Structure comes from type, rules and whitespace.
- Section vertical padding 78px; hero 84px top / 78px bottom.

## 4. Components

**Buttons.** Outlined, never filled. Primary: `1px solid var(--color-accent)`, text
`--color-accent-300`, transparent background, `--radius-md`, padding `11.2px 22.4px`. Hover fills
with `--color-accent-900`. Secondary: same shape, `--color-neutral-800` border, `--color-neutral-500`
text; hover brightens border and text.

**Tags / skill chips.** Mono 12px, 1px `--color-neutral-800` border, transparent background,
`--radius-sm`, padding `5.6px 8.4px`.

**Photographs.** `mix-blend-mode: lighten` so dark values fall away and the image sits in the page
rather than on it. Add `filter: grayscale(0.2)`. This only reads well on photos shot against dark
backgrounds — worth reshooting the headshot on a dark backdrop.

**Project cards.** No container — a 16:9 image at `--radius-md` with a 1px `--color-neutral-900`
border, then the title (18px/500) with a mono status beside it, description in
`--color-neutral-500`, and a mono stack line under it. Three cards of 400px in the carousel track.

**Bookshelf.** Book spines as narrow rounded rects, 34–50px wide, varying heights 78–100% of a
~150px shelf, `--color-neutral-900` fill with `--color-neutral-800` border; the current read gets
`--color-accent-900` / `--color-accent-800`. Title + author as `writing-mode: vertical-rl` mono
10.5px inside the spine. Hover tints to `--color-accent-900`.

**Carousel.** 32px square outlined arrow buttons, `--radius-md`, transform-based track with
`transition: transform 420ms cubic-bezier(0.2, 0.7, 0.2, 1)`. Position counter as mono `01 / 03`.

**Terminal (ryanOS).** Mono 12.5px. Prompt `visitor@ryanlewan.com:~$` in `--color-accent-400`,
output in `--color-neutral-500`, a 7x15px accent block caret blinking on a 1.1s step loop. In 1a it
opens as an overlay from a `>_ ryanOS` pill in the nav: 56px inset from both sides, 22.4px from the
bottom of the page, `--shadow-lg`, 1px `--color-accent-800` border, background
`rgba(13,14,22,0.96)`, max-height 168px with scroll.

## 5. Interaction states — no browser defaults anywhere

```css
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
::selection    { background: var(--color-accent-800); }
a              { color: var(--color-accent-400); text-decoration: none; }
a:hover        { color: var(--color-accent-300); }
```

Every interactive element gets a hover tint from the accent ramp and a pressed state one step past
its base (`--color-accent-400` on this dark ground). Disabled drops to 45% opacity.

## 6. Icons

Phosphor (https://phosphoricons.com), inline SVG on `currentColor`, at interface sizes.

## 7. What not to change

- All existing copy, verbatim.
- Section order and anchor ids (`#hero`, `#about`, `#projects`, `#reading`).
- The terminal's command set and behavior.
- Anything under a build/config directory.
