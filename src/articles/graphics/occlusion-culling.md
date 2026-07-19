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

$$v_q = o_{origin} + t \vec{v}_{view}$$

Intuitively thinking about this, we are looking for the vector between the origin and the plane in the view direction. Finding the scale factor $t$ of $\vec{v}_{view}$ to intercept $P$,

$
\color{#1b3a4bcc}\quad\quad\normalsize\hat{n} \cdot (v-v_n) = 0\\
\color{#f2a65a}\quad\quad\small\text{\#\:Substitute,\:}v_q\text{\:for\:}v \\
\color{#1b3a4bcc}\quad\quad\normalsize\hat{n} \cdot \Big((o_{origin} + t \vec{v}_{view})-v_n\Big) = 0 \\
\color{#f2a65a}\quad\quad\small\text{\#\:Rearrange,} \\
\color{#1b3a4bcc}\quad\quad\normalsize\hat{n} \cdot \Big((o_{origin} - v_n) + (t \vec{v}_{view})\Big) = 0\\
\color{#f2a65a}\quad\quad\small\text{\#\:Distribute\:}\hat{n}\text{,\:} \\
\color{#1b3a4bcc}\quad\quad\normalsize\hat{n} \cdot (o_{origin} - v_n) + \hat{n} \cdot (t \vec{v}_{view})= 0 \\
\color{#f2a65a}\quad\quad\small\text{\#\:Rearrange, t is a scalar constant} \\
\color{#1b3a4bcc}\quad\quad\normalsize\hat{n} \cdot (o_{origin} - v_n) + t  (\hat{n} \cdot \vec{v}_{view}) = 0 \\
\color{#f2a65a}\quad\quad\small\text{\#\:Subtract,\:} \hat{n} \cdot (o_{origin} - v_n) \text{\:and distribute the negative.}\\
\color{#1b3a4bcc}\quad\quad\normalsize t (\hat{n} \cdot  \vec{v}_{view}) = \hat{n} \cdot (v_n - o_{origin})\\
\color{#f2a65a}\quad\quad\small\text{\#\:Divide,\:} (\hat{n} \cdot  \vec{v}_{view})\\
\color{#1b3a4bcc}\quad\quad\normalsize t = \frac{\hat{n} \cdot (v_n - o_{origin})}{\hat{n} \cdot  \vec{v}_{view}}\\
$

We can now find the coordinates of $v_q \in P$ using $t$. If $\vec{v}_{view}$ is normalised then the distance from $o_{origin}$ to $v_q$ is $t$. Otherwise, the distance from $o_{origin}$ to $v_q$ is $\Vert{}v_q - o_{origin}\Vert{} = t\Vert{}\vec{v}_{view}\Vert{}$.

When $\hat{n} \cdot \vec{v}_{view} = 0$, the $\vec{v}_{view}$ is parallel to $P$ and they never intersect leaving $t$ undefined.

### Mesh Face View Intercept Check

Given we can calculate $t$, the scale factor locating the intercept point $v_q$ on plane $P$, we need to verify that $v_q$ is inside the face $f = (v_{n},v_{o},v_{p})$ on $P$ using an edge-side test.


$
\color{#f2a65a}\quad\quad\small\text{\#\:Find all 3 edges of\:} f\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{e}_1 = v_{o} - v_{n}\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{e}_2 = v_{p} - v_{o}\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{e}_3 = v_{n} - v_{p}\\
\color{#f2a65a}\quad\quad\small\text{\#\:Find the 3 edges between\:} v_q \text{\:and each of\:} v_{n}, v_{o}, v_{p}\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{c}_1 = v_{q} - v_{n}\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{c}_2 = v_{q} - v_{o}\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{Let}\:\vec{c}_3 = v_{q} - v_{p}\\
\\
\color{#1b3a4bcc}\quad\quad\normalsize\text{If}\:\text{sign}\big((\vec{e}_1 \times \vec{c}_1) \cdot \hat{n}\big) = \text{sign}\big((\vec{e}_2 \times \vec{c}_2) \cdot \hat{n}\big) = \text{sign}\big((\vec{e}_3 \times \vec{c}_3) \cdot \hat{n}\big)\text{\:then\:}v_q\text{\:intercepts\:}P\text{\:inside\:}f. 
$



### Method one, raycast depth check from view point to find hidden faces 

The first method is a greedy approach, it involves the raycast from the view point and checking every triangle against the others to determine obstruction and therefore order from the view point. The processing complexity of this method is $O(n^2)$ meaning it wont scale into detailed geometry and complex scenes. 

Later, we will look at more sophisticated approaches that can scale. 

### Raycast

```javascript
function rayTriangleIntersect(rayOrigin, rayDir, v0, v1, v2) {
	const EPSILON = 1e-7;

	const edge1 = subtract(v1, v0);
	const edge2 = subtract(v2, v0);
	const h = crossProduct(rayDir, edge2);
	const a = dotProduct(edge1, h);

	if (Math.abs(a) < EPSILON) return null; // ray parallel to triangle

	const f = 1.0 / a;
	const s = subtract(rayOrigin, v0);
	const u = f * dotProduct(s, h);
	if (u < 0 || u > 1) return null;

	const q = crossProduct(s, edge1);
	const v = f * dotProduct(rayDir, q);
	if (v < 0 || u + v > 1) return null;

	const t = f * dotProduct(edge2, q);
	return t > EPSILON ? t : null;
}
```



[^Moller–Trumbore]: The [Möller–Trumbore ray-triangle intersection algorithm](https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm) based on Möller and Trumbore (1997). "Fast, Minimum Storage Ray-Triangle Intersection". Journal of Graphics Tools. 2: 21–28.