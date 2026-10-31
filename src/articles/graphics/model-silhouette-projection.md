---
title: Silhouette Projection (WIP)
date: 2026-10-26
updated:
draft: true
excerpt: Silhouette projection flattens the visible faces of a mesh onto a plane and merges them into the polygons that outline the geometry as seen from a view vector.
author: jwm
tags: [explainer, 3d, 2d, graphics, mathematics, linear-algebra, geometry, projection, polygon-clipping, gis, three-js]
---

## Introduction

Silhouette projection is the operation in which the faces of a [geometric mesh](https://en.wikipedia.org/wiki/Types_of_mesh) are flattened onto a plane perpendicular to a viewing direction, and merged into the polygons that outline the mesh as seen from that direction. It is the third step after [Back-face culling](/articles/graphics/backface-culling) and [Occlusion culling](/articles/graphics/occlusion-culling).

The motivation is the same as for those two articles: pre-processing three-dimensional real-world geometry into a two-dimensional representation for a [Geographical Information System (GIS)](https://www.esri.com/en-us/what-is-gis/), looking directly down with an orthographic view. The culling articles decided *which* faces the viewer sees. This article decides *how much* of each face is seen, flattens it, and produces polygons that a GIS can load.

This article takes a back-face culled mesh and a view vector as inputs. It explains how to project the faces onto the plane, how to clip each face exactly by the faces in front of it, how to merge the visible pieces into polygons with holes, and how to write the result as [GeoJSON](https://geojson.org/).

## Definition & Method

The following section provides a formal definition of the projection process.

### Mesh Definition

We have a mesh $M = (V, F)$ as defined in [Occlusion culling](/articles/graphics/occlusion-culling#mesh-definition), with the forward-facing faces $F_{f}$ and backward-facing faces $F_{b}$ found by [Back-face culling](/articles/graphics/backface-culling),

$$
F = F_{f} \cup F_{b}, \quad F_{f} \cap F_{b} = \emptyset
$$

### Projection onto the Plane

An orthographic projection moves every point along $\vec{v}_{view}$ until it reaches a plane perpendicular to $\vec{v}_{view}$. Choose two unit axes $\hat{u}$ and $\hat{w}$ that span that plane. Projecting a vertex $v$ is then two dot products, and a third gives its depth $d$, how far along the view it is,

$$\pi(v) = (v \cdot \hat{u},\; v \cdot \hat{w}), \qquad d(v) = v \cdot \hat{v}_{view}$$

A larger $d$ is further from the viewer. Any pair of perpendicular axes in the plane works, but for a map we want $\hat{w}$ to point north and the map not to be mirrored. Given a reference direction $\vec{n}$ for north, remove its part along the view, and take $\hat{u}$ as the cross product,

$
\color{#f2a65a}\quad\quad\small\text{\#\:north, with its part along the view removed}\\
\color{#1b3a4bcc}\quad\quad\normalsize\hat{w} = \dfrac{\vec{n} - (\vec{n} \cdot \hat{v}_{view})\,\hat{v}_{view}}{\Vert{}\vec{n} - (\vec{n} \cdot \hat{v}_{view})\,\hat{v}_{view}\Vert{}}\\
\color{#f2a65a}\quad\quad\small\text{\#\:east, perpendicular to both}\\
\color{#1b3a4bcc}\quad\quad\normalsize\hat{u} = \hat{v}_{view} \times \hat{w}
$

The view in this series looks straight down. [three.js](https://threejs.org/) puts up on the $y$ axis, so $\hat{v}_{view} = (0, -1, 0)$, and with north as $\vec{n} = (0, 0, -1)$,

$
\color{#1b3a4bcc}\quad\quad\normalsize\hat{w} = (0, 0, -1), \quad \hat{u} = (0,-1,0) \times (0,0,-1) = (1, 0, 0)\\
\color{#1b3a4bcc}\quad\quad\normalsize\therefore\; \pi(x, y, z) = (x, -z), \quad d(x, y, z) = -y
$

So for the top-down view the projection really is just dropping the height, keeping it as the depth. The sign on $z$ keeps the map the right way round: looking down, three.js's $z$ axis points towards the bottom of the screen.

A face seen edge-on, such as a vertical wall, projects to a line with no area. These slivers contribute nothing to the silhouette and are dropped.

### The Simple Baseline: Union of Every Face

If only the outline is wanted, no culling is needed at all. The silhouette $S$ is the union of the projections of every face,

$$S = \bigcup_{f \in F} \pi(f)$$

For a closed mesh every line of sight that passes through the mesh enters it through a forward-facing face, so the back faces add nothing and

$$S = \bigcup_{f \in F_{f}} \pi(f)$$

### Why Clip

The outline alone does not say *which* surface the viewer sees at each point: the height of a roof, or which part of a model a point belongs to. Keeping that means keeping, for every face, the part of it that is visible, its visible region $R(f)$,

$$R(f) = \pi(f) \setminus \bigcup_{g \,\in\, F_{f} \text{ in front of } f} \pi(g)$$

This also removes the approximation in [Occlusion culling](/articles/graphics/occlusion-culling#occlusion-rule). There a face was kept or discarded whole, decided from four sample points. Here a partly hidden face is trimmed to exactly the part that is seen.

### Depth Plane of a Face

To say which of two overlapping faces is in front, we need the depth of each at the same map point. A face is flat, so its depth is a linear function over its projection,

$$d(u, w) = a\,u + b\,w + c$$

Given the projected vertices $(u_i, w_i)$ with depths $d_i$, take the edges from the first vertex, $\Delta u_1 = u_2 - u_1$ and so on, and solve the two equations $a\,\Delta u_k + b\,\Delta w_k = \Delta d_k$ for $k = 1, 2$ by [Cramer's rule](https://en.wikipedia.org/wiki/Cramer%27s_rule),

$
\color{#f2a65a}\quad\quad\small\text{\#\:twice the projected triangle's signed area}\\
\color{#1b3a4bcc}\quad\quad\normalsize A_2 = \Delta u_1 \Delta w_2 - \Delta u_2 \Delta w_1\\
\color{#1b3a4bcc}\quad\quad\normalsize a = \frac{\Delta d_1 \Delta w_2 - \Delta d_2 \Delta w_1}{A_2}, \quad b = \frac{\Delta u_1 \Delta d_2 - \Delta u_2 \Delta d_1}{A_2}\\
\color{#1b3a4bcc}\quad\quad\normalsize c = d_1 - a\,u_1 - b\,w_1
$

$A_2 = 0$ is exactly the edge-on face that was dropped, so the division is always safe.

Two faces of a mesh that do not pass through each other keep the same order across their whole overlap: if the order changed part way, they would have to cross. So the depth at a single point of the overlap, its centre, decides which face is in front.

### Polygon Clipping

The projected faces are triangles, and a triangle is [convex](https://en.wikipedia.org/wiki/Convex_polygon). That keeps the clipping simple: everything below works on convex polygons and produces convex polygons.

#### Half-Plane Clip

A directed line from $a$ to $b$ splits the plane in two. Which side a point $p$ is on is the sign of the two-dimensional cross product,

$$s(p) = (b_u - a_u)(p_w - a_w) - (b_w - a_w)(p_u - a_u)$$

which is positive on the left. One step of the [Sutherland–Hodgman algorithm](https://en.wikipedia.org/wiki/Sutherland%E2%80%93Hodgman_algorithm)[^sutherland-hodgman] keeps the part of a polygon on the left: it walks the polygon's edges $p \to q$, keeps $p$ when $s(p) \geq 0$, and where the edge crosses the line it adds the crossing point,

$$p + t\,(q - p), \quad t = \frac{s(p)}{s(p) - s(q)}$$

#### Intersection

The overlap of a convex polygon and a triangle $T$ is the polygon clipped by each of the triangle's three edges in turn. The points of $T$ run anticlockwise, so its inside is on the left of every edge.

#### Subtraction

Taking a triangle away from a convex polygon $P$ can leave a shape that is not convex, so the result is kept as several convex pieces instead. Let $H_i$ be the inside of edge $i$ of $T$ and $\bar{H}_i$ the outside,

$$P \setminus T = \bigcup_{i=0}^{2} \Big( P \cap H_0 \cap \dots \cap H_{i-1} \cap \bar{H}_i \Big)$$

Piece $i$ is what lies outside edge $i$ but inside the edges before it. Every point of $P$ outside $T$ is outside at least one edge, and the first such edge puts it in exactly one piece, so the pieces cover $P \setminus T$ without overlapping.

### Merging the Pieces

The visible regions do not overlap, so together they tile the silhouette. Merging them into polygons is a matter of finding which edges are on the outline.

Every piece runs anticlockwise. An edge shared by two pieces appears once in each direction, $a \to b$ in one and $b \to a$ in its neighbour, and the pair cancels. The edges left over are the outline, which chain into rings: anticlockwise rings are the outer boundaries and clockwise rings are holes.

Two details stop the edges matching exactly:

1. **Rounding.** The same point, computed while clipping two different pieces, can differ in its last digits. Points closer than a tolerance $\varepsilon$, a billionth of the size of the model, are welded into one.
2. **T-junctions.** A piece's corner can sit part way along its neighbour's edge. Every edge is split at the points lying on it, so both sides of a shared boundary have the same edges.

Rounding still leaves a few slivers where pieces meet, around $10^{-12}$ of the area, which are dropped. Each hole is then matched with the smallest outer ring that contains it.

### Filling Openings

Back-face culling assumes a closed mesh, one that light cannot get inside. The Utah Teapot is not closed: its spout is an open tube. Looking straight down into the spout, the viewer sees the inside of the tube, whose faces point away from them, so back-face culling discards them and the outline is left with a hole where the spout's mouth is. A renderer drawing front faces only would show the same hole.

The opening can be found from the mesh itself. In a closed mesh every edge is shared by exactly two faces, so an edge with only one face runs along the rim of an opening. Chaining those edges gives a loop around each opening, and projecting the loop gives its outline on the plane. A hole in the silhouette that lies inside a projected loop is an opening, not a real gap, and is filled by dropping it. A real gap, such as a courtyard seen from above, has no open edge around it and is kept.

Two details:

1. A mesh built from patches, like the teapot, repeats its vertices along every seam, which would make every seam look open. Vertices are welded by position first, within a millionth of the size of the mesh.
2. The test point must be inside the hole, which is not guaranteed for its centre. The point used is just off the middle of the hole's longest edge, on the hole's side.

### Algorithm Formalisation

#### Visible Regions

For each forward-facing face, start from its whole projection and cut away every face in front of it (with in-line comments),

$
\quad\normalsize\text{For each } f \in F_{f}: \\
\color{#f2a65a} \quad\quad\small\text{\#\:start\:from\:the\:whole\:projected\:triangle}\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{Let}\:R = \{\, \pi(f) \,\}\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{For each } g \in N(f): \\
\color{#f2a65a} \quad\quad\quad\small\text{\#\:where\:the\:two\:overlap,\:and\:its\:centre}\\
\color{#1b3a4bcc} \quad\quad\quad\normalsize\text{Let}\:O = \pi(f) \cap \pi(g), \quad c = \text{centre}(O)\\
\color{#f2a65a} \quad\quad\quad\small\text{\#\:cut\:g\:away\:if\:it\:is\:nearer\:the\:viewer}\\
\color{#1b3a4bcc} \quad\quad\quad\normalsize\text{If}\:\text{area}(O) > 0 \:\text{and}\: d_{g}(c) < d_{f}(c) \:\text{then}\: R = \{\, P \setminus \pi(g) : P \in R \,\}\\
\color{#1b3a4bcc} \quad\quad\normalsize\text{If}\:R = \emptyset \:\text{then}\: f \:\text{is hidden, else}\: R(f) = R\\
$

$N(f)$ is the faces whose projections could overlap $\pi(f)$. Testing every other face would be $O(n^2)$ again, so, like the [face grid](/articles/graphics/occlusion-culling#method-two-face-grid) in Occlusion culling, the projected triangles are binned into a grid by their bounding boxes, and $N(f)$ is the faces in the cells under $f$ whose boxes overlap its box.

#### Outline

$
\color{#1b3a4bcc} \quad\normalsize\text{Let}\:E = \text{the edges of every piece of every}\: R(f)\\
\color{#f2a65a} \quad\small\text{\#\:make\:shared\:boundaries\:match}\\
\color{#1b3a4bcc} \quad\normalsize\text{Weld the points of}\: E \:\text{within}\: \varepsilon \text{, and split each edge at the points on it}\\
\color{#f2a65a} \quad\small\text{\#\:a\:shared\:edge\:appears\:once\:each\:way}\\
\color{#1b3a4bcc} \quad\normalsize\text{Remove every pair}\: a \to b,\; b \to a \:\text{from}\: E\\
\color{#1b3a4bcc} \quad\normalsize\text{Chain the rest of}\: E \:\text{into rings: anticlockwise are outlines, clockwise are holes}\\
$

## Implementation

The following section is a silhouette projection implementation using [three.js](https://threejs.org/). As in [Occlusion culling](/articles/graphics/occlusion-culling#implementation), each listing is pulled from the module the scene at the end of the article runs, here [`projection.js`](/api/scenes/lib/projection.js). It uses no libraries: the clipping and the merge are written out in full. The vector operations come from [`culling.js`](/api/scenes/lib/culling.js).

### Input Geometry

The input geometry is the same as for [Back-face culling](/articles/graphics/backface-culling#input-geometry): the Utah Teapot, the Stanford Bunny and the XYZ RGB Asian Dragon. Each is back-face culled first, and the forward-facing faces are projected.

### Projection Implementation

#### Projection Axes

The [axes](#projection-onto-the-plane) $\hat{u}$, $\hat{w}$ and the view direction.

![[code:projection#projectionAxes]]

#### Project Vertex

![[code:projection#projectVertex]]

#### Project Faces

Each face becomes an anticlockwise triangle with its [depth plane](#depth-plane-of-a-face). Faces seen edge-on are dropped.

![[code:projection#projectFaces]]

![[code:projection#depthAt]]

#### Clip Half-Plane

One step of [Sutherland–Hodgman](#half-plane-clip).

![[code:projection#clipHalfPlane]]

#### Intersection and Subtraction

![[code:projection#intersectConvex]]

![[code:projection#subtractTriangle]]

#### Find Visible Regions

The [visible regions](#visible-regions) of every face, using a grid over the projected triangles to find the faces that could overlap.

![[code:projection#buildTriangleGrid]]

![[code:projection#visibleRegions]]

#### Merge Pieces

The [merge](#merging-the-pieces): weld, split, cancel, chain, then sort the rings into outlines and holes.

![[code:projection#mergePieces]]

#### Fill Openings

The mesh's [openings](#filling-openings), as loops of the edges with only one face.

![[code:projection#openEdgeLoops]]

The holes that lie inside an opening are filled, tested from a point just inside each hole.

![[code:projection#fillOpenHoles]]

![[code:projection#pointInsideHole]]

### Projection Result

The following scene back-face culls the input mesh, finds the visible region of every forward-facing face, and merges them into the outline. The model is drawn see-through above its projection. The pieces are coloured by height, ocean for low and amber for high, with the outline drawn over them. The checkboxes hide the model, the pieces and the outline, and *Fill openings* fills the holes that are openings in the mesh, drawn in pale blue. The view button looks down $\vec{v}_{view}$, and the GeoJSON button downloads the outline. The panel in the corner shows the counts and how long the projection took in your browser.

![[scene:working-silhouette]]{Silhouette Projection}

The projection was timed on the same meshes (Node.js 24 on an Intel Core i5-7Y54):

| Mesh | Front faces | Visible faces | Pieces | Outline | Visible regions | Merge |
|---|---:|---:|---:|---|---:|---:|
| Utah Teapot | 3,523 | 3,150 | 3,565 | 1 polygon, 1 hole (an opening) | 91 ms | 68 ms |
| Stanford Bunny | 38,396 | 29,090 | 32,018 | 1 polygon | 770 ms | 319 ms |
| XYZ RGB Dragon | 132,023 | 102,687 | 120,166 | 1 polygon, 2 holes | 2,186 ms | 1,396 ms |

The teapot's hole is the mouth of its spout, the [opening](#filling-openings) described above, and is filled: the teapot has 6 openings, and the spout's is the only one that makes a hole. The bunny's scan has 5 openings underneath, none of which shows from above. The dragon is closed, so its two holes are real gaps in the model as seen from above, and are kept. Two checks show the clipping is exact. The pieces' areas add up to the area of the union of every forward-facing face, the [baseline](#the-simple-baseline-union-of-every-face), to eight decimal places. And the merged outline has the same rings as that union worked out independently.

Comparing the visible faces with the sample point rule in [Occlusion culling](/articles/graphics/occlusion-culling#occlusion-rule) shows where that approximation goes wrong:

| Mesh | Kept by sample points | Partly visible | Dropped, though partly visible | Kept, though hidden |
|---|---:|---:|---:|---:|
| Utah Teapot | 3,154 | 265 | 0 | 4 |
| Stanford Bunny | 29,253 | 1,826 | 3 | 166 |
| XYZ RGB Dragon | 102,778 | 9,703 | 83 | 174 |

The sample points get it wrong both ways, but rarely: the dragon's 83 wrongly dropped faces add up to 0.005% of its visible area. The bigger difference is the partly visible faces, which the sample points can only keep or drop whole, and which clipping trims.

### Exporting to GeoJSON

A GIS reads polygons as [GeoJSON](https://datatracker.ietf.org/doc/html/rfc7946)[^geojson]: each polygon is a list of rings, the outer boundary first and then its holes, each ring closed by repeating its first point. The specification asks for outer rings anticlockwise and holes clockwise.

![[code:projection#toGeoJSON]]

The coordinates are in the model's units. For real-world geometry they would be offset to the site's origin in a projected coordinate system, such as [MGA2020](https://www.icsm.gov.au/gda2020), before loading into [QGIS](https://qgis.org/) or [PostGIS](https://postgis.net/).

## Conclusion

This article on silhouette projection builds on [Back-face culling](/articles/graphics/backface-culling) and [Occlusion culling](/articles/graphics/occlusion-culling). It projects each forward-facing face onto the plane perpendicular to the view, keeping its depth as a plane. It clips each face by the faces in front of it with Sutherland–Hodgman, keeping every result convex. And it merges the visible pieces into polygons by cancelling the edges they share. For the outline alone, the union of every face's projection is enough. Clipping adds which surface is seen where, and removes the sample point approximation of the occlusion cull.

Some limitations remain:

* **Orthographic only.** The projection, the depth planes and the grid all assume parallel rays, which holds for the top-down view but not for a perspective view.
* **Open meshes.** Back-face culling assumes a closed mesh. Filling openings repairs the outline, but the inside of an open tube is still missing from the pieces.
* **Well-behaved meshes.** The depth order of two faces is decided at one point, which assumes faces do not pass through each other. A mesh with intersecting faces needs them split along the intersection first.
* **Tolerances.** The weld tolerance and the sliver threshold are relative to the size of the model, so a model far from the origin, such as real-world coordinates, should be moved to a local origin first.

<!-- TODO: what comes next: reading real geometry from IFC? -->

[^sutherland-hodgman]: Sutherland and Hodgman (1974). "Reentrant Polygon Clipping". Communications of the ACM. 17 (1): 32–42.
[^geojson]: Butler et al. (2016). "The GeoJSON Format". RFC 7946, Internet Engineering Task Force.
