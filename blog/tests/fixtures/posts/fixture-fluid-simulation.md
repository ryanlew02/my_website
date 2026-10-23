---
title: "Fixture: a fluid simulation in C++"
description: "Test fixture post with code, math, a table and several headings. Only built when BLOG_TEST_BUILD is set."
date: 2026-01-15
updated: 2026-02-01
category: Graphics
tags: [C++, OpenGL, Simulation]
featured: true
github: https://github.com/ryanlew02/my_website
---

Opening paragraph with `inline code` and a [link](https://example.com).

## Advection

Semi-Lagrangian advection traces particles backward.

```cpp title="advect.cpp"
float sample(const Grid& g, float x, float y) { return g.bilinear(x, y); }
```

## Pressure projection

Inline math $\nabla \cdot \mathbf{u} = 0$ and display math:

$$
\nabla^2 p = \frac{\rho}{\Delta t} \nabla \cdot \mathbf{u}
$$

### Jacobi iterations

| Iterations | Error |
| ---------- | ----: |
| 20         | 1e-2  |
| 80         | 1e-4  |

## Rendering

<script>window.__fixtureInjected = true</script>

Done.
