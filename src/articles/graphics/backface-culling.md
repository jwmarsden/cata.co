---
title: Back-face Culling
date: 2026-06-20
updated:
excerpt: Backface culling is a fundamental geometric operation that discards polygons that are facing away from a view vector.
author: jwm
tags: [explainer, 3d, 2d, graphics, mathematics, linear-algebra, geometry, rendering, three-js]
---

## Introduction

[Back-face culling](https://en.wikipedia.org/wiki/Back-face_culling) is the fundamental operation in which faces of a [geometric mesh](https://en.wikipedia.org/wiki/Types_of_mesh) are discarded if they are not visible from a viewing direction. The operation is used during some methods of rendering as an optimisation that simplifies the number of polygons that are considered frame-by-frame for drawing as historically each face was in the program memory and had a relatively high cost for render[^1]. Back-face culling in the application was a good rendering optimisation[^2]. However, more modern [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit) pipelines tend to hold the whole mesh within [buffers in video memory](https://vulkan.lunarg.com/doc/view/1.4.309.0/linux/tutorial/html/13-init_vertex_buffer.html), and the shader pipeline is very efficient at massively parallelising the fragment shading calculations and shifting all of this thinking to the graphics pipeline. 

[^1]: See [Retained Mode](https://en.wikipedia.org/wiki/Retained_mode) rendering examples.
[^2]: See [A Compact Method for Backface Culling](https://www.gamedeveloper.com/programming/a-compact-method-for-backface-culling) (O.Levi 1999).

Nevertheless, like all mathematics, the theory is relevant to understand for a range of problems. Examples include when programming [vertex and fragment shaders](https://en.wikipedia.org/wiki/Shader) and when considering if an object occurs within a [view frustum](https://en.wikipedia.org/wiki/Viewing_frustum).  

The wider use case motivating this article is where three-dimensional real-world geometry is being pre-processed in a process to find a two-dimensional spatial representation for usage within a [Geographical Information System (GIS)](https://www.esri.com/en-us/what-is-gis/). The most common spatial representation is looking directly down with an orthogonal view onto a flat plane of spatial shapes. In reality, things are more complex with a modern map (consider the buildings that are available in the built-up areas on a [lot of maps](https://www.bing.com/maps/?cp=-34.922501%7E138.593504&lvl=17.5&style=3d&eh=34.63)) but this article will follow the simpler paradigm. The objective is to view our mesh from a view vector looking directly downwards. Essentially we are creating top-down two-dimensional silhouette corresponding to the three-dimensional geometry as it would be seen from above. 

This article will focus on taking a full mesh of the geometry (made up of vertices and faces) alongside a vector for the view direction as inputs and explain in detail the step to implement a process to discard any back-facing polgyons. 

## Definition & Method

The following section provides a formal definition of our back-face culling process.

### Mesh Definition

We have a mesh $M = (V, F)$ comprising:

* $V$, a set of vertices where each vertex $v = (v_{x}, v_{y}, v_{z})$ is an ordered triplet of coordinates with $v_{x}, v_{y}, v_{z} \in \mathbb{R}$
* $F$, a set of faces where each face $f = (v_{n},v_{o},v_{p})$ with $v_{n},v_{o},v_{p} \in V$ using a clockwise orientation for the representation of front-facing polygons

### View Vector Definition

The convention we will follow is the right-handed rule (with the $\text{y-axis}$ up and $\text{z-axis}$ into the screen). This gives us a top down view vector: $$\vec{v}_{view} = \begin{bmatrix} 0, & -1, & 0 \end{bmatrix}$$

The $\vec{v}_{view}$ vector will be tested against the polygons of $M$ to see if they can be discarded.

### Cross Product

The cross product finds the perpendicular vector $\vec{a} \times \vec{b}$ to vectors $\vec{a}$ and $\vec{b}$. Using the right-handed rule it is defined by:

$${\vec{a} \times \vec{b} =}{\begin{bmatrix} a_2b_3 - a_3b_2 \\ a_3b_1 - a_1b_3 \\ a_1b_2 - a_2b_1 \end{bmatrix}}$$

The cross product is utlised to find the face normal.

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
\color{#1b3a4bcc} \quad\quad\normalsize\text{If}\:z < 0 \:\text{then}\: f \:\text{is visible else discard}\: f\\
$

The processing complexity is $O(n)$ as it is a linear function $\vert{}n\vert{}=\vert{}F\vert{}$.

## Implementation

The following section is a backface culling implementation using [three.js](https://threejs.org/).

### Input Geometry

The input geometry being used for this implementation are the [Utah Teapot](https://en.wikipedia.org/wiki/Utah_teapot)[^utah-teapot], the [Stanford Bunny](https://en.wikipedia.org/wiki/Stanford_bunny)[^stanford-bunny] and the [XYZ RGB Asian Dragon from the Stanford Repository](https://graphics.stanford.edu/data/3Dscanrep/)[^XYZ-RGB-dragon]. The following scene provides an interactive view of the models. 

![[scene:base-geometry]]

[^utah-teapot]:The Utah Teapot rendered here is available in [three.js](https://threejs.org/). The documents for it are [here](https://threejs.org/docs/#TeapotGeometry). 

[^stanford-bunny]:The Stanford Bunny is being loaded in the browser from [Stanford](https://graphics.stanford.edu/~mdfisher/Data/Meshes/bunny.obj)

[^XYZ-RGB-dragon]:The Standford Dragon is being loaded in the browser from [GitHub](https://github.com/alecjacobson/common-3d-test-models/blob/master/data/xyzrgb_dragon.obj)

### Cull Operation Implementation

The following section provides a Javascript implementation of the operations required to cull the back faces of a mesh.

#### Vector Subtraction

The following code provides an implementation for vector subtraction. 

```javascript
// Subtracts vector b from vector a, component by component.
// Expects both a and b to be 3‑element arrays: [x, y, z].
// Returns a new 3‑element array representing the difference.
function subtract(a, b) {
    return [
        a[0] - b[0], // x component
        a[1] - b[1], // y component
        a[2] - b[2]  // z component
    ];
}
```

#### Vector Normalisation

The following code provides an implementation for vector normalisation. As an Australian, I have decided to write this article using my native spelling but I continue to code using American spelling. 

```javascript
// Returns a new vector pointing in the same direction but with unit length.
// If the vector has zero length, returns [0, 0, 0] to avoid division by zero.
function normalize(v) {
    // Compute the Euclidean length (magnitude) of the vector
    const len = Math.sqrt(
        Math.pow(v[0], 2) + 
        Math.pow(v[1], 2) + 
        Math.pow(v[2], 2)
    );

    // If length is non-zero, divide each component by the length
    return len > 0
        ? [v[0] / len, v[1] / len, v[2] / len]
        : [0, 0, 0]; // Zero vector stays zero
}
```

#### Vector Cross Product

The following code provides an implementation for [vector cross product](#cross-product). 

```javascript
// Computes the cross product of two vectors a and b.
// The result is a vector perpendicular to both a and b 
// following the right‑hand rule.
function crossProduct(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1], // x component
        a[2] * b[0] - a[0] * b[2], // y component
        a[0] * b[1] - a[1] * b[0], // z component
    ];
}
```

#### Vector Dot Product

The following code provides an implementation for [vector dot product](#dot-product). 

```javascript
// Computes the dot product of two vectors a and b.
function dotProduct(a, b) {
    return (a[0] * b[0]) +
           (a[1] * b[1]) +
           (a[2] * b[2]);
}
```

#### Mesh Back-face Cull Based on View Vector

The following code provides an implementation for the [back-face cull algorithm](#algorithm-formalisation). 

```javascript
// Performs back-face culling on a mesh using a view direction vector `v_view`.
// Faces whose normals point toward the viewer are marked visible;
function doBackfaceCull(v_view, originalMesh) {
    // Extract vertex set (vSet) and face index set (fSet)
    const { vSet, fSet } = extractGeometry(originalMesh);
    const visibleFaces = []; // indices of faces facing the viewer
    const culledFaces  = []; // indices of faces facing away
    for (const f of fSet) {
        // Retrieve the 3 vertices of the face
        const { v1, v2, v3 } = {
            v1: vSet[f[0]],
            v2: vSet[f[1]],
            v3: vSet[f[2]]
        };
        // Compute edge vectors of the face
        const e1 = subtract(v2, v1);
        const e2 = subtract(v3, v1);
        // Compute face normal via cross product
        const e1xe2 = crossProduct(e1, e2);
        // Normalize the normal vector
        const e1xe2Normal = normalize(e1xe2);
        // Dot product with view vector determines orientation
        const z = dotProduct(e1xe2Normal, v_view);
        // If the face normal points toward the viewer, keep it
        if (z >= 0) {
            visibleFaces.push(...f);
        } else {
            culledFaces.push(...f);
        }
    }
    // Build two meshes: visible faces and culled faces
    return buildCullMeshes(originalMesh, vSet, visibleFaces, culledFaces);
}
```

### Cull Operation Result

The following scene provides a working implemention of the back-face cull on the input meshes. 

The faces that have been culled can be toggled with the checkbox and the scene can be viewed from the view vector showing the the remaining faces are viewable. 

![[scene:cull-geometry]]{Cull Processing}

## Conclusion

This article on back-face culling presents the motivation for back-face culling, the theory related to achieve it and it provides an implementation in javascript using only primitives and arrays. 

This version does not look for any faces that are not viewable due to being obstructed by a different face on the model. This is behaviour is observable in the Utah Teapot handle and when looking at the faces on the top of the Stanford Bunny's feet that are not back-facing nor are they visible from $\vec{v}_{view}$. Often this is not a large performance problem for a single model but this behaviour does not scale to complex scenes. This will be considered in [Occlusion Culling](/articles/graphics/occlusion-culling).

With this being my first article I want to stop extending it and get it finished. The [Occlusion Culling](/articles/graphics/occlusion-culling) article will build upon this contribution and be a valid step on the journey of creating a two-dimensional silhouette corresponding to the three-dimensional geometry as it would be seen from above.