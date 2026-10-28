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

But doesn't it all make sense after following the steps before!

In my code I used a gravitational constant of 0.6f, rather than the real world value of ~$6.674 \times 10^{-11}$, because my simulation isn't *very* realistic (at least this one, hint.. hint..).

## Newton's Second Law: From Force to Acceleration

Now that I have the `force`, I need to determine how it changes the particles `motion`.

Newton's second law is:

$$
\boxed{\vec F = m\vec a}
$$

If we rearrange this equation, we can get: 

$$
\vec a = \frac{\vec F}{m}
$$

This tells me that acceleration is the force divided by a particles mass (so a particle that has less mass will be more affected by a force).

In my code, I do: 

```cpp
void Particle::applyForce(const Vec2& force) {
    Vec2 acceleration = force / mass;
    v *= acceleration * FIXED_DT;
}
```

Notice that I do not change position, instead I change the particles velocity (v is velocity in the code).

This comes from teh relationship:

$$
\vec a = \frac{d\vec v}{dt}
$$

Since computer simulate time in discrete steps, I approximated the velocity change by using: 

$$
\boxed{\vec v_{new} = \vec v_{old} + \vec a\Delta t}
$$

Where $(\Delta t)$ is the length of one physics timestep. 

## Detecting Particle collisions

This is where things got... interesting. Before this I had no idea how to calculate collisions. I first thought about 2 objects going straight at each other, well you just reverse their velocities, easy. How about if they hit at an angle?

Before we answer that question. How do we know 2 particles are colliding? Well, we know when the distance between their centers is less than or equal the addition of their radii.

Mathematically:

$$
\boxed{|\vec p_B-\vec p_A|^2 \leq {r_A+r_B}^2}
$$

My implementation looked like this:

```cpp
bool Particle::isColliding(
    const Particle& otherParticle
) const {
    const Vec2 diff = pos - otherParticle.pos;
    const float rDist =
        radius + otherParticle.radius;

    return diff.lengthSquared() <= rDist * rDist;
}
```

## Resolving Collisions using Impulse

Detecting the collisions is pretty simple, solving them well... that needs some more work.

Instead of manually reversing their velocities, I used an impulse-based collision resolution.

What does that mean? An impulse represents a change in momentum, it is caused by a force acting over a period of time, in this case, the particles colliding. 

Here impulse represents a change in momentum:

$$
\vec J = \Delta \vec p
$$

Since momentum is mass multiplied by velocity:

$$
\vec p = m\vec v
$$

The collision must account for the masses and relative velocities of both particles. The scalar impulse equation I use is: 

$$
\boxed{
j =
-\frac{(1+e)(\vec v_B-\vec v_A)\cdot\hat n}
{\frac{1}{m_A}+\frac{1}{m_B}}
}
$$

Where:

- (j) = impulse magnitude
- (e) = coefficient of restitution
- ($\vec v_A,\vec v_b$) = particle velocities
- ($\hat n$) = collision normal
- ($m_A, m_B$) = paticle mass

The coefficient of restitution determines how much relative speed is lost along the collision normal is retained after impact

An (e) value of 1 represents perfectly elastic collision (which is what I used), while 0 represents perfectly ineleastic normal response

After calculating the impulse, I updated their velocities:

$$
\vec v_A' = \vec v_A - \frac{j\hat n}{m_A}
$$

$$
\vec v_B' = \vec v_B + \frac{j\hat n}{m_B}
$$

In the code:

```cpp
const float impulse =
    -(1.0f + e) * velocityAlongNormal
    / (invMassA + invMassB);

const Vec2 impulseVec = normal * impulse;

a.v -= impulseVec * invMassA;
b.v += impulseVec * invMassB;
```

I also correct overlapping particle positions using their inverse masses, so that particles do not remain stuck inside another (a fun little bug).

In the current simulation, the central sun behaves differently: particles collide with it are removed instead of bouncing away. 

## Putting it Together

With the equations that we talked about, we now have a main repeating process:

1. Calculate gravitational forces between particle pairs (do this for every pair)
2. Convert those forces into acceleration
3. Update each particle's velocity.
4. Update each particle's position.
5. Detect collisions and resolve.
6. Render the new particle positions.

This project is so interesting because when you have many particles, there are so many forces pulling each particle in different ways. 

The result is a simulation where particles can accelerate towards each other, collide, and orbit/curve around massive objects.

## Final Thoughts

This project taught me a lot of things about physics, programming, and math. This taught me in a way that was better than watching a video or reading about it. 

There are plenty of improvements I could make, better collision handling, 3D, making simulated orbital paths. But I think this is a good starting project for physics. 

I think this is why simulating things is so interesting to me, you put a few simple equations together and you come out with something beautiful.