---
title: "0x01 - 2D Gravity Simulation from Scratch"
description: "Building a simple gravity simulation from scratch in OpenGL"
date: 2026-10-23
category: Project
tags: [Gravity, Physics, Simulation, C++]
draft: false                 # flip to false when you're ready to publish
featured: false             # true pins it to the top of the blog index
github: https://github.com/ryanlew02/2D_particle_gravity_sim   # delete this line if the post has no repo
cover: ./images/2d_gravity_sim_cover.jpg   # optional cover image, put the file in images/
coverAlt: "Particles oribiting 'sun' particle"
---

<!--
  Quick notes (delete this comment when you're done):
  - The folder name is the URL: rename "sample-post" to something like "my-fluid-sim".
  - Preview with `npm run dev`, then open http://localhost:4321/blog/sample-post/
  - Drafts only show in dev. Set draft: false, then `npm run build` and upload dist/.
-->

I have **always** been interested in how humans came to be. Was it the big bang? Is there some sort of God? Are we in a simulation? All impossible questions (for now). The goal of these projects is to better myself at taking *real life* things and putting them inside a computer. To make strives towards one day, putting conciousness *inside* the computer.

*Anyways...* back on track. This project is a 2D particle simulation built from scratch in C++. I have built a few things and most of them are in something higher level. I took away all of that for this project, if you would like to take a look at the code here is the [link](https://github.com/ryanlew02/2D_particle_gravity_sim)

# Shaders

If you have never worked with shaders before, they are confusing at first. For this project I used a vertex shader and a fragment shader. 

### Vertex Shader

> Determines where each vertex should appear on the screen. 

### Frament Shader

> Determines the color of each fragment which is generated during rendering

```mermaid
flowchart LR
    A[Vertices] --> B[Vertex Shader]
    B --> C[Frament Shader]
    C --> D[Screen]
```

After we get the verticies from the CPU it sends to the GPU to be rendered on the screen.


```cpp title="main.cpp"
#include <iostream>

int main() {
    std::cout << "Hello, simulation\n";
    return 0;
}
```

### Math

Inline math looks like $E = mc^2$. Display math goes on its own lines:

$$
\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla)\mathbf{u} = -\nabla p + \nu \nabla^2 \mathbf{u}
$$

### Tables

| Grid size | Frame time | Notes        |
| --------- | ---------- | ------------ |
| 64³       | 2.1 ms     | Real time    |
| 128³      | 14.8 ms    | Still smooth |
| 256³      | 120 ms     | Too slow     |

### Images

Put image files in this post's `images/` folder and reference them like this
(uncomment once the file exists, a missing image fails the build):

<!-- ![Describe the image for screen readers](./images/screenshot.png) -->

## Results

Wrap up with what worked, what didn't, and what's next.

- [x] Task lists work
- [ ] for to-dos or roadmaps

Footnotes are handy for side notes.[^1]

[^1]: Like this one. It shows up at the bottom of the post.
