---
title: "Markdown style guide"
description: "Every element a post can use, rendered — headings, code, math, tables, images. A draft: it shows up in npm run dev and never in a production build."
date: 2026-10-22
category: Meta
tags: [Writing, Markdown]
draft: false
---

This post is a **draft** kept as a reference. It renders under `npm run dev` so you can check how things look, and the build leaves it out. Copy anything you need from here.

## Text

Paragraphs are plain lines. *Emphasis*, **strong**, ~~strikethrough~~, `inline code`, and [links](https://ryanlewan.com). Smart quotes and dashes -- like this -- are automatic.

> A blockquote, for a line that earns pulling out.

- An unordered list
- With a nested one
  - like this
- [ ] And task items (GitHub-flavored)

1. Ordered lists
2. Count themselves

### A third-level heading

Every `##` and `###` heading gets an anchor link (hover it) and shows up in the table of contents.

## Code

Fenced blocks get highlighting, a language label, and a copy button. Add `title="..."` after the language to name the file:

```cpp title="solver.cpp"
// Jacobi iteration for the pressure Poisson equation
void solvePressure(Grid& p, const Grid& div, int iters) {
    for (int k = 0; k < iters; ++k) {
        for (int j = 1; j < p.h - 1; ++j)
            for (int i = 1; i < p.w - 1; ++i)
                p(i, j) = (p(i - 1, j) + p(i + 1, j) + p(i, j - 1) + p(i, j + 1) - div(i, j)) * 0.25f;
    }
}
```

```glsl
#version 450
layout(location = 0) in vec2 uv;
layout(location = 0) out vec4 color;
uniform sampler2D density;

void main() {
    float d = texture(density, uv).r;
    color = vec4(mix(vec3(0.09, 0.09, 0.15), vec3(0.57, 0.52, 0.85), d), 1.0);
}
```

```python
import torch
model = torch.nn.Sequential(torch.nn.Linear(784, 128), torch.nn.ReLU(), torch.nn.Linear(128, 10))
loss = torch.nn.functional.cross_entropy(model(x), y)  # a deliberately long line, to show horizontal scrolling inside the block rather than the page
```

```sh
cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build -j
```

## Math

Inline, like the incompressibility condition $\nabla \cdot \mathbf{u} = 0$, or as a display block:

$$
\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla)\mathbf{u} = -\frac{1}{\rho}\nabla p + \nu \nabla^2 \mathbf{u} + \mathbf{f}
$$

## Tables

| Method          | Order | Stable for stiff? | Cost / step |
| --------------- | :---: | :---------------: | ----------: |
| Forward Euler   | 1     | No                | 1 eval      |
| Semi-implicit   | 1     | Mostly            | 1 solve     |
| RK4             | 4     | No                | 4 evals     |

## Images and media

Put images next to the post (e.g. `./images/foo.png`) and reference them relatively — Astro optimizes them at build time:

```md
![Velocity field after 200 steps](./images/velocity.png)
```

Embeds are raw HTML. YouTube (no-cookie) and Vimeo are allowed by the page's security policy:

```html
<iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="Demo" allowfullscreen></iframe>
```

---

That's everything. Footnotes work too.[^1]

[^1]: Like this one.
