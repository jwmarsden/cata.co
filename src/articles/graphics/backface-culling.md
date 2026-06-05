---
title: Backface Culling (Under Development)
date: 2026-06-05
excerpt: Backface culling is a fundamental geometric operation that is done by discarding polygons that are facing away from a view vector.
author: jwm
tags: [3d, graphics, mathematics, geometry, backface-cull, three-js]
---

## Introduction

[Back-face culling](https://en.wikipedia.org/wiki/Back-face_culling) is the fundamental operation in which faces of a geometric mesh are discarded if they are not visible from a viewing direction. The operation is used during some methods of rendering as an optimisation that simplifies the number of polygons that are considered frame-by-frame for drawing as historically each face had a relatively high cost for render and culling in the application was a good optimisation[^1]. However, more modern [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit) pipelines tend to hold the whole mesh within [buffers in video memory](https://vulkan.lunarg.com/doc/view/1.4.309.0/linux/tutorial/html/13-init_vertex_buffer.html), and the shader pipeline is very efficient at massively parallelising the fragment shading calculations and shifting all of this thinking to the graphics pipeline. 

[^1]: See [Retained Mode](https://en.wikipedia.org/wiki/Retained_mode) rendering examples.  

Nevertheless, like all mathematics, the theory is relevant to understand for a range of problems. Examples include when programming [vertex and fragment shaders](https://en.wikipedia.org/wiki/Shader) and when considering if an object occurs within a [view frustum](https://en.wikipedia.org/wiki/Viewing_frustum).  

This article focuses on a use case where three-dimensional real-world geometry is being pre-processed in a process to find a two-dimensional spatial representation for usage within a [Geographical Information System (GIS)](https://www.esri.com/en-us/what-is-gis/). 

The most common spatial representation is looking directly down with an orthogonal view onto a flat plane of spatial shapes. In reality, things are more complex with a modern map (consider the buildings that are available in the built-up areas on a [lot of maps](https://www.bing.com/maps/?cp=-34.922501%7E138.593504&lvl=17.5&style=3d&eh=34.63)) but this article will follow the simpler paradigm. The objective is to view our mesh from a view vector looking directly downwards. Essentially we are creating top-down two-dimensional silhouette corresponding to the three-dimensional geometry as it would be seen from above. 

The pre-processing of this article will take the full mesh of the geometry (made up of vertices and faces) as input alongside a single vector for the view direction and demonstrate the back-face culling steps. 


## Theory

The following section provides a formal defintion of our back-face culling process.

### Mesh Definition

We have a mesh $M = (V, F)$ comprising:

* $V$, a set of vertices where each vertex $v_i = (v_{x}, v_{y}, v_{z})$ is an ordered triplet of coordinates where $v_{x}, v_{y}, v_{z} \in \mathbb{R}$
* $F$, a set of faces where each face $f = (v_{n},v_{o},v_{p})$ where $v_{n},v_{o},v_{p} \in V$ using a clockwise orientation for front-facing polygons

### View Vector Defintion

The convention we will follow is $\text{y-axis}$ up and $\text{z-axis}$ into the forward into the screen. This gives us a top down view vector $\vec{v_{view}} = \begin{bmatrix} 0, & -1, & 0 \end{bmatrix}$.

## Implementation

### Input Geometry

Donec volutpat, velit eget sollicitudin viverra, ligula arcu bibendum velit, et ullamcorper eros diam vel neque. Phasellus feugiat nisi vel justo placerat, sed egestas metus tempor. Donec non enim ante. Vestibulum nibh neque, rutrum sit amet tortor eget, faucibus elementum massa. Curabitur dictum aliquam est, et placerat dolor maximus quis. Maecenas tincidunt, elit eget tincidunt accumsan, magna metus vulputate metus, ornare ornare metus dolor vel quam. Fusce ullamcorper leo sed elit congue mattis. Nunc eu sollicitudin diam. Suspendisse mi est, porta non massa ut, rhoncus efficitur risus. Praesent auctor blandit nulla, id lobortis mauris molestie ut.

![[scene:particle-field]]

### Cull Operation Implementation

Suspendisse vel gravida dolor. Nunc pretium ex vel accumsan fringilla. Quisque aliquet scelerisque aliquam. Sed a libero felis. Curabitur condimentum elementum massa iaculis cursus. Mauris leo lorem, semper id neque vitae, mollis pulvinar risus. Vestibulum egestas at ipsum eu tincidunt. Praesent porttitor euismod quam at finibus. Fusce convallis venenatis nisl, luctus pulvinar neque condimentum nec. Donec dignissim, metus in hendrerit facilisis, est metus pretium est, laoreet dapibus ante justo sit amet erat. Proin dapibus eros non facilisis vehicula. Nunc viverra efficitur viverra.


### Cull Operation Result

![[scene:rotating-cube]]{A rotating cube demonstrating euler angles}

Duis tristique nisl lacus, vel vehicula augue faucibus sit amet. Suspendisse potenti. Aliquam gravida dolor at odio finibus, in vehicula neque rhoncus. Phasellus lectus sem, auctor id lectus at, molestie vulputate neque. Pellentesque vitae semper enim. Nunc convallis elit est, non tempus sapien ultricies in. Morbi eget lacus libero. Donec pulvinar nisi id egestas mollis.

Sed dapibus, velit ac pulvinar cursus, ipsum diam bibendum massa, id lobortis erat velit sit amet nisl. Nulla facilisi. Nulla metus eros, tincidunt id odio et, sodales vestibulum velit. Etiam neque diam, mollis at faucibus eu, imperdiet vel odio. Donec tincidunt dolor vel lobortis ornare. Donec risus leo, consequat vel magna sed, rhoncus vestibulum metus. Proin sagittis laoreet lorem at imperdiet. Praesent purus lacus, imperdiet sed velit vel, eleifend finibus magna. Curabitur id lobortis ex. Sed ut convallis sem, sit amet convallis nulla.

## Conclusion

Suspendisse vel gravida dolor. Nunc pretium ex vel accumsan fringilla. Quisque aliquet scelerisque aliquam. Sed a libero felis. Curabitur condimentum elementum massa iaculis cursus. Mauris leo lorem, semper id neque vitae, mollis pulvinar risus. Vestibulum egestas at ipsum eu tincidunt. Praesent porttitor euismod quam at finibus. Fusce convallis venenatis nisl, luctus pulvinar neque condimentum nec. Donec dignissim, metus in hendrerit facilisis, est metus pretium est, laoreet dapibus ante justo sit amet erat. Proin dapibus eros non facilisis vehicula. Nunc viverra efficitur viverra.