---
title: Occlusion Culling - 🚧 Work in progress
date: 2026-06-22
updated:
excerpt: Occlusion Culling is a fundamental geometric process for discarding polygons that are not visible due to other geometry obstructing the visibility from a view vector.
author: jwm
tags: [explainer, 3d, 2d, graphics, mathematics, linear-algebra, geometry, rendering, three-js]
---

## Introduction

[Occlusion culling](https://en.wikipedia.org/wiki/Hidden-surface_determination#Occlusion_culling) is the fundamental operation in which faces of a [geometric mesh](https://en.wikipedia.org/wiki/Types_of_mesh) are discarded if they are being obstructed by other objects and therefore not visible from a viewing direction.

The wider use case motivating this article is where three-dimensional real-world geometry is being pre-processed in a process to find a two-dimensional spatial representation for usage within a [Geographical Information System (GIS)](https://www.esri.com/en-us/what-is-gis/). The most common spatial representation is looking directly down with an orthogonal view onto a flat plane of spatial shapes. In reality, things are more complex with a modern map (consider the buildings that are available in the built-up areas on a [lot of maps](https://www.bing.com/maps/?cp=-34.922501%7E138.593504&lvl=17.5&style=3d&eh=34.63)) but this article will follow the simpler paradigm. The objective is to view our mesh from a view vector looking directly downwards. Essentially we are creating top-down two-dimensional silhouette corresponding to the three-dimensional geometry as it would be seen from above. 

This article will focus on taking a [Back-face culled](/articles/graphics/backface-culling) mesh of the geometry (made up of vertices and triangle faces) alongside a view point as inputs and explain in detail the step to implement a process to discard any occluded polygons.

## Definition & Method

The following section provides a formal definition of our occlusion culling processes. 

### Mesh Definition

We have a mesh $M = (V, F)$ comprising:

* $V$, a set of vertices where each vertex $v = (v_{x}, v_{y}, v_{z})$ is an ordered triplet of coordinates with $v_{x}, v_{y}, v_{z} \in \mathbb{R}$
* $F$, a set of faces where each face $f = (v_{n},v_{o},v_{p})$ with $v_{n},v_{o},v_{p} \in V$ using a clockwise orientation for the representation of front-facing polygons

Building upon our [Back-face culling](/articles/graphics/backface-culling) article we also have the following:

$$
F = F_{f} \cup F_{b}
$$
$$
F_{f} \cap F_{b} = \emptyset
$$

Where:

- $F_{f}$ represents the subset of forward-facing faces.
- $F_{b}$ represents the subset of backward-facing faces.

### View Point Definition

The view point for is extended from a direction in the [Back-face culling](/articles/graphics/backface-culling) to an origin in space (formally $o_{origin} \in \mathbb{R}^3$ ) and a direction (our $\vec{v}_{view}$ representation). 


### Mesh Face Plane

#### Geometric representation for a Plane

Fundamentally, the dot product of any vector on a plane and the plane normal is equal to zero. Expressing this formally, if we know $\hat{n}$ and any point $v_{n} \in P$ we can define the plane as, 

$$\forall v \in P, \:\text{where}\:\hat{n} \perp P \:\text{and}\: v_{n} \in P, \:\text{then} \quad \hat{n} \cdot (v-v_n) = 0$$

#### Algebraic Method for a Plane

We can derive the [general form](https://mathworld.wolfram.com/Plane.html) for a plane algebraically, if we know $\hat{n} \perp P$ we can find any other point $v \in P$,

$
\color{#1b3a4bcc} \quad\normalsize Let\: \hat{n} = (a, b, c) \\
\color{#1b3a4bcc} \quad\normalsize Let\: v_n = (x_0, y_0, z_0) \\
\color{#1b3a4bcc} \quad\normalsize Let\: v = (x, y, z) \:\text{and}\: v \in P\\
$

Given $\hat{n} \cdot (v-v_n) = 0$ substitute in $\hat{n}$, $v_n$ and $v$,

$
\color{#1b3a4bcc} \quad\normalsize (a, b, c) \cdot ((x,y,z) - (x_0, y_0, z_0)) = 0 \\
\color{#1b3a4bcc} \quad\normalsize (a, b, c) \cdot (x-x_0,y-y_0,z-z_0) = 0 \\
\color{#1b3a4bcc} \quad\normalsize {{a}(x-x_0)} + {{b}(y-y_0)} + {{c}(z-z_0)} = 0\\
$

Expand and rearrange,

$
\color{#1b3a4bcc} \quad\normalsize ax - ax_0 + by - by_0 + cz - cz_0 = 0\\
\color{#1b3a4bcc} \quad\normalsize ax + by + cz = {ax_0} + {by_0} + {cz_0}\\
\color{#1b3a4bcc} \quad\normalsize\text{Let\:}d = {ax_0} + {by_0} + {cz_0}\\
\color{#1b3a4bcc} \quad\normalsize\therefore ax+by+cz=d \text{\:\:i.e. the general form for a plane.}
$

Intuitively thinking about this, the coefficients $a$, $b$, $c$ *are* the vector components of the plane's normal. The $d$ value expresses how far the plane is from the origin (also meaning that $d=0$ passes through the origin) and it is calculatable using components of $v_{n}$ and the face normal $\hat{n}$.

### View Vector and Plane intersection "Raycast"

The view vector $\vec{v}_{view}$ is a ray that intersects with any plane that its not parallel with. The intersection point $v_q$ can be defined by,

$$v_q = o_{origin} + d \vec{v}_{view}$$

Intuitively thinking about this, we are looking for the vector between the origin and the plane in the view direction. Finding the scale factor $d$ of $\vec{v}_{view}$ to intercept $P$,

$
\color{#1b3a4bcc}\quad\quad\normalsize\hat{n} \cdot (v-v_n) = 0\\
\color{#f2a65a}\quad\quad\small\text{\#\:Substitute,\:}v_q\text{\:for\:}v \\
\color{#1b3a4bcc}\quad\quad\normalsize\hat{n} \cdot \Big((o_{origin} + d \vec{v}_{view})-v_n\Big) = 0 \\
\color{#f2a65a}\quad\quad\small\text{\#\:Rearrange,} \\
\color{#1b3a4bcc}\quad\quad\normalsize\hat{n} \cdot \Big((o_{origin} - v_n) + (d \vec{v}_{view})\Big) = 0\\
\color{#f2a65a}\quad\quad\small\text{\#\:Distribute\:}\hat{n}\text{,\:} \\
\color{#1b3a4bcc}\quad\quad\normalsize\hat{n} \cdot (o_{origin} - v_n) + \hat{n} \cdot (d \vec{v}_{view})= 0 \\
\color{#f2a65a}\quad\quad\small\text{\#\:Rearrange, d is a scalar constant} \\
\color{#1b3a4bcc}\quad\quad\normalsize\hat{n} \cdot (o_{origin} - v_n) + d  (\hat{n} \cdot \vec{v}_{view}) = 0 \\
\color{#f2a65a}\quad\quad\small\text{\#\:Subtract,\:} \hat{n} \cdot (o_{origin} - v_n) \text{\:and distribute the negative.}\\
\color{#1b3a4bcc}\quad\quad\normalsize d (\hat{n} \cdot  \vec{v}_{view}) = \hat{n} \cdot (v_n - o_{origin})\\
\color{#f2a65a}\quad\quad\small\text{\#\:Divide,\:} (\hat{n} \cdot  \vec{v}_{view})\\
\color{#1b3a4bcc}\quad\quad\normalsize d = \frac{\hat{n} \cdot (v_n - o_{origin})}{\hat{n} \cdot  \vec{v}_{view}}\\
$

We can now find the coordinates of $v_q \in P$ using $d$. If $v_{view}$ is normalised then the distance from $o_{origin}$ to $v_q$ = $d$. Otherwise, $d = \Vert{}v_q - o_{origin}\Vert{}$.

When $\hat{n} \cdot \vec{v}_{view} = 0$, the $\vec{v}_{view}$ is parallel to $P$ and they never intersect leaving $d$ undefined.

### Mesh Face View Intercept Check

Given we can calculate $d$, the vector from an origin $o_{origin}$ to the intercept point on plane $P$, we need to verify that it inside the face $f = (v_{n},v_{o},v_{p})$ on $P$ using an edge-side test.


$
\color{#f2a65a}\quad\quad\small\text{\#\:Find all 3 edges of\:} f\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{e}_1 = v_{o} - v_{n}\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{e}_2 = v_{p} - v_{o}\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{e}_3 = v_{n} - v_{p}\\
\color{#f2a65a}\quad\quad\small\text{\#\:Find the 3 edges between\:} d and each of v_{n}, v_{o}, v_{p}\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{c}_1 = v_{q} - v_{n}\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{c}_2 = v_{q} - v_{o}\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{c}_3 = v_{q} - v_{p}\\
\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{If}\:\big((\vec{e}_1 \times \vec{c}_1) \cdot \hat{n}\big) \land \big((\vec{e}_2 \times \vec{c}_2) \cdot \hat{n}\big) \land \big((\vec{e}_3 \times \vec{c}_3) \cdot \hat{n}\big) = 1\text{\:then\:}d\text{\:intercepts\:}P\text{\:inside\:}f. 
$


