---
title: Backface Culling - 🚧 Work in progress
date: 2026-06-05
updated:
excerpt: Backface culling is a fundamental geometric operation that discards polygons that are facing away from a view vector.
author: jwm
tags: [explainer, 3d, 2d, graphics, mathematics, linear-algebra, geometry, rendering, three-js]
---

## Introduction

[Back-face culling](https://en.wikipedia.org/wiki/Back-face_culling) is the fundamental operation in which faces of a [geometric mesh](https://en.wikipedia.org/wiki/Types_of_mesh) are discarded if they are not visible from a viewing direction. The operation is used during some methods of rendering as an optimisation that simplifies the number of polygons that are considered frame-by-frame for drawing as historically each face was in the program memory and had a relatively high cost for render[^1]. Back-face culling in the application was a good rendering optimisation[^2]. However, more modern [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit) pipelines tend to hold the whole mesh within [buffers in video memory](https://vulkan.lunarg.com/doc/view/1.4.309.0/linux/tutorial/html/13-init_vertex_buffer.html), and the shader pipeline is very efficient at massively parallelising the fragment shading calculations and shifting all of this thinking to the graphics pipeline. 

[^1]: See [Retained Mode](https://en.wikipedia.org/wiki/Retained_mode) rendering examples.
[^2]: https://www.gamedeveloper.com/programming/a-compact-method-for-backface-culling.

Nevertheless, like all mathematics, the theory is relevant to understand for a range of problems. Examples include when programming [vertex and fragment shaders](https://en.wikipedia.org/wiki/Shader) and when considering if an object occurs within a [view frustum](https://en.wikipedia.org/wiki/Viewing_frustum).  

The wider use case motivating this article is where three-dimensional real-world geometry is being pre-processed in a process to find a two-dimensional spatial representation for usage within a [Geographical Information System (GIS)](https://www.esri.com/en-us/what-is-gis/). The most common spatial representation is looking directly down with an orthogonal view onto a flat plane of spatial shapes. In reality, things are more complex with a modern map (consider the buildings that are available in the built-up areas on a [lot of maps](https://www.bing.com/maps/?cp=-34.922501%7E138.593504&lvl=17.5&style=3d&eh=34.63)) but this article will follow the simpler paradigm. The objective is to view our mesh from a view vector looking directly downwards. Essentially we are creating top-down two-dimensional silhouette corresponding to the three-dimensional geometry as it would be seen from above. 

This article will focus on taking a full mesh of the geometry (made up of vertices and faces) alongside a vector for the view direction as inputs and explain in detail the step to implement a process to discard any back-facing polgyons. 

## Definition & Method

The following section provides a formal defintion of our back-face culling process.

### Mesh Definition

We have a mesh $M = (V, F)$ comprising:

* $V$, a set of vertices where each vertex $v = (v_{x}, v_{y}, v_{z})$ is an ordered triplet of coordinates with $v_{x}, v_{y}, v_{z} \in \mathbb{R}$
* $F$, a set of faces where each face $f = (v_{n},v_{o},v_{p})$ with $v_{n},v_{o},v_{p} \in V$ using a clockwise orientation for the representation of front-facing polygons

### View Vector Defintion

The convention we will follow is the right-handed rule (with the $\text{y-axis}$ up and $\text{z-axis}$ into the screen). This gives us a top down view vector: $$\vec{e}_{view} = \begin{bmatrix} 0, & -1, & 0 \end{bmatrix}$$

The $\vec{v}_{view}$ vector will be tested against the polygons of $M$ to see if they can be discarded.

### Cross Product

The cross product finds the perpendicular vector $\vec{a} \times \vec{b}$ to vectors $\vec{a}$ and $\vec{b}$. Using the right-handed rule it is defined by:

$${\vec{a} \times \vec{b} =}{\begin{bmatrix} a_2b_3 - a_3b_2 \\ a_3b_1 - a_1b_3 \\ a_1b_2 - a_2b_1 \end{bmatrix}}$$

The cross product is utlised to find the face normals.

### Dot Product

The dot product calculates a scalar value $\vec{a} \cdot \vec{b}$ evaluating the alignment of two vectors $\vec{a}$ and $\vec{b}$. It is defined by:

$$ \vec{a} \cdot \vec{b} = a_xb_x + a_yb_y + a_zb_z$$

A few scenarios emerge from the dot product when its used for interpreting vectors,

1. If $\vec{a} \cdot \vec{b} = 1$, the vectors point in the same direction. 
1. If $0 < (\vec{a} \cdot \vec{b}) < 1$, the angle between the vectors is $0\degree<\theta<90\degree$.
1. If $\vec{a} \cdot \vec{b} = 0$, the vectors are perpendicular. 
1. If $-1 < (\vec{a} \cdot \vec{b}) < 0$, the angle between the vectors is $90\degree<\theta<180\degree$.
1. If $\vec{a} \cdot \vec{b} = -1$, the vectors point in opposite directions. 

The dot product is utilsed to test $\vec{v}_{view}$ against the face normal $\vec{n}_{f}$ to see if a face can be discarded.

### Algorithm Formalisation

The processing algorthim is as follows (with in-line comments),

$
\quad\normalsize\text{For each } f \in F \text{ with vertices } (v_{n},v_{o},v_{p}): \\
\color{#f2a65a} \quad\quad\small\text{\#\:calculate\:edge\:vectors\:}(\vec{e}_1,\vec{e}_2)\text{\:from\:}v_{n}\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{Let}\:\vec{e}_1 = v_{o} - v_{n}\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{Let}\:\vec{e}_2 = v_{p} - v_{n}\\
\color{#f2a65a} \quad\quad\small\text{\#\:calculate\:face\:unit\:normal\:}\hat{n}_{f}\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{Let}\:\vec{n}_{f} = \vec{e}_1 \times \vec{e}_2\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{Let}\:\hat{n}_{f} = \frac{\vec{n}_{f}}{\Vert{}\vec{n}_{f}\Vert{}}\\
\color{#f2a65a} \quad\quad\small{\text{\#\:check\:\:face}\text{\:visiblilty\:from\:}}\vec{v}_{view}\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{Let}\:z = \vec{v}_{view} \cdot \hat{n}_{f}\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{If}\:z > 0 \:\text{then}\: f \:\text{is visible else discard}\: f\\
$

The processing complexity is $O(n)$ as it is a linear function $\vert{}n\vert{}=\vert{}F\vert{}$.

## Implementation

The following section is a backface culling implementation using [three.js](https://threejs.org/).

### Input Geometry

The input geometry being used for this implementation are the [Utah Teapot](https://en.wikipedia.org/wiki/Utah_teapot)[^utah-teapot] and the [Stanford Bunny](https://en.wikipedia.org/wiki/Stanford_bunny)[^stanford-bunny]. The following provides an interactive view of both models. 

![[scene:base-geometry]]{Base Teapot and Bunny Mesh Objects}

[^utah-teapot]:The Utah Teapot rendered here is available in [three.js](https://threejs.org/). The documents for it are [here](https://threejs.org/docs/#TeapotGeometry). 

[^stanford-bunny]:The Stanford Bunny is being loaded in the browser from [Stanford](https://graphics.stanford.edu/~mdfisher/Data/Meshes/bunny.obj)

### Cull Operation Implementation

> 🚧 **Work in progress** — this section is still being written. 
> The ideas are there, the words are coming.

### Cull Operation Result

> 🚧 **Work in progress** — this section is still being written. 
> The ideas are there, the words are coming.

## Conclusion

> 🚧 **Work in progress** — this section is still being written. 
> The ideas are there, the words are coming.