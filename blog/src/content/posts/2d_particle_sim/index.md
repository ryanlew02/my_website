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

*Anyways...* back on track. This project is a 2D particle simulation built from scratch in C++. I have built a few things and most of them are in something higher level. I took away all of that for this project, if you would like to take a look at the code here is the [link](https://github.com/ryanlew02/2D_particle_gravity_sim).

I learned a lot on this project: shaders, OpenGL, good object orientated programming. However, I think the most interesting part (fun part for me) are the physics equations. 

Rather than relying on a prebuilt physics engine, I coded the physics myself.

## Calculating Particle Mass

Before we can start making gravitational forces, we need to make each particle have some sort of mass. In the real world I would multiply density by volume. However, this isn't the most realistic simulation... It is 2D!

To find the mass, I am going to use the area of the circle instead. 


Area of a circle as most of us (probably) know is:

$$
A = \pi r^2
$$

Multiplying this by density we get

$$
\boxed{m = \rho \pi r^2}
$$

Where: 

- m = particle mass
- ($\rho$) = particle density
- (r) = particle radius

In the code, I calculate a particles density in the constructor: 

```cpp
float mass = density * 3.14159 * radius * radius;
```

This is a 2D model, it is simplified compared to spheres or more complex objects (something I will definitely be getting into in the near future). 

It is simple yet it is good at giving my particles some density, this is going to be important when we start talking about gravity (which is right now). 

## Gravity

THe main equation that I use is based on Newton's law of universal gravitation. 

$$
\boxed{F = G\frac{m_1m_2}{r^2}}
$$

Where:

- (F) = magnitude of the gravitational force
- (G) = gravitational constant
- (m_1, m_2) = masses of the particles
- (r) distance between their centers

There are two interesting properties that you probably know about

1. Since masses are in the numerator, gravity increases as objects gain in mass. 
2. Since distance between the centers is in the denominator, gravitational pull decreases the futher you are away.

If you were standing next to the sun, you would feel immense pull towards it, if you were on the edge of our galaxy, you wouldn't feel it at all.

## Gravity needs a direction

The equation above is nice for finding how strong the pull is (the magnitude of the vector), but we also want to know which *direction* to accelerate. Well intuitively it is obvious, we have to turn this into code. 

To calculate a vector pointing from particle A to B: 

$$
\vec d = \vec p_B - \vec p_A
$$

To convert this into a unit direction vector, I divide by it's magnitude:

$$
\hat d = \frac{\vec d}{|\vec d|}
$$

The gravitational force is then written as:

$$
\vec F = G\frac{m_1m_2}{r^2}\hat d
$$

Or

$$
\vec F = G\frac{m_1m_2}{|\vec d|^3}\vec d
$$

This is because $r = |\vec d|$. The magnitude of the vector *is* the distance between the 2 particles. 

## Implementation of the Gravity

```cpp

const Vec2 direction = b.pos - a.pos;

const float distSq = direction.lengthSquared() + SOFTENING * SOFTENING;

const float invDist = 1.0f / std::sqrt(distSq);

const float forceMagnitude = G * a.mass * b.mass * invDist * invDist * invDist;

const Vec2 force = direction * forceMagnitude;

a.applyForce(force);
b.applyForce(-force);
```

The softening is to prevent gravity from becoming **exessively** large when particles are extrememly close together.

But doesn't it all make sense! ALL OF IT! If it doesn't, please re-read the steps before.

In my code I used a gravitational constant of 0.6f, rather than the real world value of ~$6.674 \times 10^{-11}$, because my simulation isn't *very* realistic (at least this one, hint.. hint..).





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
