---
title: "Sample post: replace this title"
description: "One or two sentences about what this post covers. Shown on the blog index, in search, RSS and link previews."
date: 2026-10-23
category: Notes
tags: [Sample, Template]
draft: true                 # flip to false when you're ready to publish
featured: false             # true pins it to the top of the blog index
github: https://github.com/ryanlew02/your-repo   # delete this line if the post has no repo
# cover: ./images/cover.jpg   # optional cover image, put the file in images/
# coverAlt: "What the cover shows"
---

<!--
  Quick notes (delete this comment when you're done):
  - The folder name is the URL: rename "sample-post" to something like "my-fluid-sim".
  - Preview with `npm run dev`, then open http://localhost:4321/blog/sample-post/
  - Drafts only show in dev. Set draft: false, then `npm run build` and upload dist/.
-->

This opening paragraph is the hook. Say what you built, why, and what the reader
will get out of it. You can use **bold**, *italics*, `inline code` and
[links](https://github.com/ryanlew02).

## The problem

Each `##` heading becomes a section in the "On this page" sidebar, and `###`
headings nest under it.

- Bullet lists work
- like this
  - and they nest

1. Numbered lists
2. work too

> Blockquotes are good for a key idea or a quote from somewhere else.

## How it works

### Code

Fenced code gets syntax highlighting, a language label and a copy button. The
`title` is optional:

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
