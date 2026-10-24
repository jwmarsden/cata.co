---
title: Occlusion Culling
date: 2026-10-24
updated:
excerpt: Occlusion Culling is a fundamental geometric process for discarding polygons that are not visible due to other geometry obstructing the visibility from a view vector.
author: jwm
tags: [explainer, 3d, 2d, graphics, mathematics, linear-algebra, occlusion-cull, moller–trumbore, geometry, rendering, three-js]
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

The view point is extended from a direction in the [Back-face culling](/articles/graphics/backface-culling) to an origin in space (formally $o_{origin} \in \mathbb{R}^3$ ) and a direction (our $\vec{v}_{view}$ representation). 


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

### Ray-Triangle Intersection

The two steps above, finding $t$ on the plane and then checking that $v_q$ is inside $f$, are what a ray-triangle intersection test does. The implementation uses the Möller–Trumbore algorithm[^Moller–Trumbore], which does both at once. It writes $v_q$ in [barycentric coordinates](https://en.wikipedia.org/wiki/Barycentric_coordinate_system) $(u, v)$ of the face,

$$v_q = (1 - u - v)\,v_{n} + u\,v_{o} + v\,v_{p}$$

and solves for $t$, $u$ and $v$ together. The ray hits inside $f$ when $u \geq 0$, $v \geq 0$ and $u + v \leq 1$, which is the edge-side test expressed in the face's own coordinates. It never builds the plane equation, so it saves both work and memory.

### Occlusion Rule

For the top-down view the ray runs from a point on a face back towards the viewer, in the direction $-\vec{v}_{view}$. If that ray passes through another forward-facing face, the other face sits between the point and the viewer, and the point is hidden.

A single point is not enough to decide for a whole face. A face can have its centre hidden under an overhang while one of its corners pokes out and is still seen. Each face $f = (v_{n},v_{o},v_{p})$ is therefore tested from four sample points, its three vertices and its centroid,

$$S(f) = \{\, v_{n},\; v_{o},\; v_{p},\; c_{f} \,\} \quad \text{where} \quad c_{f} = \tfrac{1}{3}(v_{n} + v_{o} + v_{p})$$

and a face is only occluded when **every** one of its sample points is hidden. If the viewer can see any of them, the face stays.

Rays cast from a vertex start *on* every face that shares that vertex, so those neighbours would report a hit at $t = 0$. A hit only counts when $t > \varepsilon$, where $\varepsilon$ is a millionth of the size of the mesh, so the same rule works for a teapot or a dragon.

The rule is an approximation. A large face can be partly visible between its sample points while all four are hidden, and it is then discarded. The exact answer needs each face clipped against the faces in front of it, which is where the [Conclusion](#conclusion) picks up.

### Algorithm Formalisation

#### Method One: Brute Force

The first method is a greedy approach: every sample point of every forward-facing face is tested against every other forward-facing face (with in-line comments),

$
\quad\normalsize\text{For each } f \in F_{f}: \\
\color{#f2a65a} \quad\quad\small\text{\#\:assume\:hidden\:until\:a\:sample\:point\:is\:seen}\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{Let}\:occluded = \text{true}\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{For each } s \in S(f): \\
\color{#f2a65a} \quad\quad\quad\small\text{\#\:cast\:the\:ray\:}s + t(-\vec{v}_{view})\text{\:against\:every\:other\:face}\\
\color{#1b3a4bcc} \quad\quad\quad\normalsize\text{Let}\:blocked = \exists\, g \in F_{f} \setminus \{f\} : t_{g} > \varepsilon\\
\color{#1b3a4bcc} \quad\quad\quad\normalsize\text{If}\:\neg\,blocked \:\text{then}\: occluded = \text{false}\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{If}\:occluded \:\text{then discard}\: f \:\text{else}\: f \:\text{is visible}\\
$

With $n = \vert{}F_{f}\vert{}$ faces and four rays per face, the processing complexity is $O(n^2)$. That is fine for a teapot but it does not scale into detailed geometry and complex scenes, as the [results](#cull-operation-result) show.

#### Method Two: Face Grid

Every ray is parallel to $\vec{v}_{view}$. Looking along the view, a ray is a single point, and the only faces it can pass through are the ones whose outline covers that point. Most faces can be ruled out without casting anything.

Choose two unit axes $\hat{u}$ and $\hat{w}$ that span the plane perpendicular to $\vec{v}_{view}$. Projecting a point onto that plane is two dot products,

$$\pi(v) = (v \cdot \hat{u},\; v \cdot \hat{w})$$

The footprint of a face is the bounding box of its three projected vertices. The footprints are binned into an $m \times m$ grid with $m \approx \sqrt{n}$, which gives about one face per cell. A ray from $s$ only needs testing against the faces in the cell that holds $\pi(s)$, and only those whose footprint contains $\pi(s)$,

$
\quad\normalsize\text{For each } f \in F_{f}, \text{ bin } f \text{ into every cell its footprint overlaps} \\
\quad\normalsize\text{For each } f \in F_{f}: \\
\color{#1b3a4bcc} \quad\quad\normalsize\text{For each } s \in S(f): \\
\color{#f2a65a} \quad\quad\quad\small\text{\#\:only\:the\:faces\:whose\:footprint\:covers\:the\:ray}\\
\color{#1b3a4bcc} \quad\quad\quad\normalsize\text{Let}\:G_{s} = \{\, g \in \text{cell}(\pi(s)) : \pi(s) \in \text{footprint}(g) \,\}\\
\color{#1b3a4bcc} \quad\quad\quad\normalsize\text{Let}\:blocked = \exists\, g \in G_{s} \setminus \{f\} : t_{g} > \varepsilon\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{(the rest as in method one)}\\
$

The grid only skips faces that a ray cannot hit, so method two gives exactly the same result as method one. Building the grid is $O(n)$ and each ray tests a handful of faces, so for a mesh spread fairly evenly across the view the whole process is close to $O(n)$.

## Implementation

The following section is an occlusion culling implementation using [three.js](https://threejs.org/). Unlike the [Back-face culling](/articles/graphics/backface-culling) article, the code below is not a copy: each listing is pulled from [`culling.js`](/api/scenes/lib/culling.js), the module the scene at the end of the article runs. The vector operations (`subtract`, `normalize`, `crossProduct` and `dotProduct`) are the ones described in the [Back-face culling implementation](/articles/graphics/backface-culling#cull-operation-implementation).

### Input Geometry

The input geometry is the same as for [Back-face culling](/articles/graphics/backface-culling#input-geometry): the Utah Teapot, the Stanford Bunny and the XYZ RGB Asian Dragon.

### Cull Operation Implementation

#### Back-face Cull

Occlusion culling starts from the forward-facing faces $F_{f}$, so the back-face cull comes first. It is the same algorithm as before, refactored to return the two face sets rather than build meshes, so the occlusion cull can take $F_{f}$ straight from it.

![[code:culling#doBackfaceCull]]

#### Ray-Triangle Intersect

The [Möller–Trumbore](#ray-triangle-intersection) intersection returns $t$, the distance along the ray to the face, or `null` when the ray misses.

![[code:culling#rayTriangleIntersect]]

#### Sample Points

The [sample points](#occlusion-rule) $S(f)$: the three vertices and the centroid.

![[code:culling#samplePoints]]

#### Ray Hit Test

A ray from a sample point is blocked by a face when it crosses it further away than $\varepsilon$.

![[code:culling#rayHitsFace]]

$\varepsilon$ is scaled to the size of the mesh.

![[code:culling#minHitDistance]]

#### Brute Force Occlusion Cull

The [brute force method](#method-one-brute-force), where every sample point of every face is tested against every other face.

![[code:culling#occlusionCullBruteForce]]

#### Face Grid Occlusion Cull

Building the [face grid](#method-two-face-grid) over the footprints. It returns a `candidates` function giving the faces a ray from a point could hit.

![[code:culling#buildFaceGrid]]

The occlusion cull itself is the brute force method with `faces.some(...)` swapped for `grid.candidates(p).some(...)`.

![[code:culling#occlusionCullGrid]]

### Cull Operation Result

The following scene runs the back-face cull and then the occlusion cull (method two) on the input meshes. Visible faces are amber, back faces are red and occluded faces are purple. The checkboxes hide the back faces and the occluded faces, and the view button looks down $\vec{v}_{view}$ to show that the amber faces alone make up everything seen from above. The panel in the corner shows the face counts and how long the culling took in your browser.

![[scene:working-cull-ortho]]{Occlusion Cull Processing}

The two methods were timed on the same meshes (Node.js 24 on a 12" MacBook, an Intel Core i5-7Y54):

| Mesh | Faces | Back faces | Occluded | Visible | Method one | Method two |
|---|---:|---:|---:|---:|---:|---:|
| Utah Teapot | 6,320 | 2,797 | 369 | 3,154 | 1,352 ms | 88 ms |
| XYZ RGB Dragon | 249,882 | 117,859 | 29,245 | 102,778 | about 30 min[^estimate] | 760 ms |

Both methods produced identical face sets on the teapot, and on a 6,000-face sample of the dragon.

[^estimate]: Estimated from the teapot: method one grows with the square of the number of forward-facing faces, and the dragon has about 37 times as many (132,023 against 3,523), so roughly $1{,}352\text{ ms} \times 37.5^2$.

## Conclusion

This article on occlusion culling builds on [Back-face culling](/articles/graphics/backface-culling): from the faces that point towards the viewer, it discards the ones hidden behind other faces. It derives the ray-plane intercept and the inside-face test, uses Möller–Trumbore to do both at once, and decides each face from rays cast at its vertices and its centroid. The brute force method follows the definition directly but is $O(n^2)$; the face grid gives the same result in close to linear time, because looking along the view every ray is just a point.

The occluded faces show up where you would expect: under the teapot's lid knob, inside the curve of its handle and under the spout.

Two limitations remain. The sample point rule is an approximation, so a face that is only partly hidden between its sample points can still be discarded. And the grid relies on every ray being parallel, which holds for the orthographic, top-down view used here but not for a perspective view, where rays fan out from the view point.

The next step on the journey to a two-dimensional silhouette of the geometry as seen from above is to stop treating faces as all-or-nothing: clip each visible face against the faces in front of it, project what is left onto the ground plane, and merge the pieces into polygons a GIS can use.

[^Moller–Trumbore]: The [Möller–Trumbore ray-triangle intersection algorithm](https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm) based on Möller and Trumbore (1997). "Fast, Minimum Storage Ray-Triangle Intersection". Journal of Graphics Tools. 2: 21–28.
