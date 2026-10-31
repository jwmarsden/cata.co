/**
 * projection.js
 * Silhouette projection: flattening the faces of a mesh onto the plane
 * perpendicular to the view, and clipping each one by the faces in front of
 * it, so what is left is exactly what the viewer sees. A vertex is [x, y, z];
 * a face is [n, o, p], three indices into the vertex set; a 2D point is
 * [u, w] and a 2D polygon is an array of them, anticlockwise.
 *
 * Used by the silhouette scene, and quoted in the articles with
 * ![[code:projection#functionName]], so the code shown is the code that runs.
 */

import { normalize, crossProduct, dotProduct } from './culling.js';

// --- Projection ---

// The axes of the projection plane. w is "north" on the map: the reference
// direction (three.js -z when looking straight down) with its part along the
// view removed; u = view × w is "east", which keeps the map the right way
// round rather than mirrored.
export function projectionAxes(v_view, north = [0, 0, -1]) {
	const view = normalize(v_view);
	const along = dotProduct(north, view);
	const axisW = normalize([
		north[0] - along * view[0],
		north[1] - along * view[1],
		north[2] - along * view[2],
	]);
	const axisU = crossProduct(view, axisW);
	return { view, axisU, axisW };
}

// Projects vertex v onto the plane: two dot products give its map
// coordinates [u, w], a third its depth d along the view (larger is further
// from the viewer).
export function projectVertex(axes, v) {
	return {
		p: [dotProduct(v, axes.axisU), dotProduct(v, axes.axisW)],
		d: dotProduct(v, axes.view),
	};
}

// Twice the signed area of a 2D polygon (the shoelace formula): positive
// when its points run anticlockwise.
export function signedArea2(poly) {
	let a = 0;
	for (let i = 0; i < poly.length; i++) {
		const [x1, y1] = poly[i];
		const [x2, y2] = poly[(i + 1) % poly.length];
		a += x1 * y2 - x2 * y1;
	}
	return a;
}

// Projects every face. Each becomes a 2D triangle (turned anticlockwise if
// the projection flipped it) with the plane its depth lies on, d = a·u + b·w + c,
// so the depth can be read anywhere inside it. Faces seen edge-on project to
// slivers with no area and are left out.
export function projectFaces(v_view, vSet, faces) {
	const axes = projectionAxes(v_view);
	const projected = [];
	for (const f of faces) {
		const [A, B, C] = f.map(i => projectVertex(axes, vSet[i]));
		const area2 = signedArea2([A.p, B.p, C.p]);
		if (Math.abs(area2) < 1e-12) continue;

		// depth plane through the three projected vertices (Cramer's rule)
		const [du1, dw1, dd1] = [B.p[0] - A.p[0], B.p[1] - A.p[1], B.d - A.d];
		const [du2, dw2, dd2] = [C.p[0] - A.p[0], C.p[1] - A.p[1], C.d - A.d];
		const a = (dd1 * dw2 - dd2 * dw1) / area2;
		const b = (du1 * dd2 - du2 * dd1) / area2;
		const plane = [a, b, A.d - a * A.p[0] - b * A.p[1]];

		const tri = area2 > 0 ? [A.p, B.p, C.p] : [A.p, C.p, B.p];
		projected.push({ face: f, tri, plane });
	}
	return projected;
}

// The depth of projected face g at map point p.
export function depthAt(g, p) {
	return g.plane[0] * p[0] + g.plane[1] * p[1] + g.plane[2];
}

// --- Clipping ---

// One step of Sutherland–Hodgman: keeps the part of a convex polygon on the
// left of the directed line a → b (the inside, for an anticlockwise clip
// edge). Each edge of the polygon is kept, cut or dropped, and a new point
// is added wherever an edge crosses the line.
export function clipHalfPlane(poly, a, b) {
	const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
	const out = [];
	for (let i = 0; i < poly.length; i++) {
		const p = poly[i];
		const q = poly[(i + 1) % poly.length];
		const sp = side(p);
		const sq = side(q);
		if (sp >= 0) out.push(p);
		if ((sp >= 0) !== (sq >= 0)) {
			const t = sp / (sp - sq);
			out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
		}
	}
	return out;
}

// The overlap of a convex polygon and a triangle: the polygon clipped by
// each edge of the triangle in turn.
export function intersectConvex(poly, tri) {
	let out = poly;
	for (let i = 0; i < 3 && out.length > 0; i++) {
		out = clipHalfPlane(out, tri[i], tri[(i + 1) % 3]);
	}
	return out;
}

// A convex polygon minus a triangle, as convex pieces that don't overlap.
// Piece i is what lies outside edge i of the triangle but inside edges
// 0 … i-1, so the pieces together are exactly the polygon outside the
// triangle.
export function subtractTriangle(poly, tri, minArea) {
	const pieces = [];
	let inside = poly;
	for (let i = 0; i < 3 && inside.length > 0; i++) {
		const a = tri[i];
		const b = tri[(i + 1) % 3];
		const outside = clipHalfPlane(inside, b, a); // right of a → b
		if (outside.length >= 3 && signedArea2(outside) > minArea) pieces.push(outside);
		inside = clipHalfPlane(inside, a, b);
	}
	return pieces;
}

// --- Visibility ---

// A 2D grid over the projected triangles' bounding boxes, so each face is
// only compared with the faces that could overlap it (the same idea as the
// face grid in culling.js, but queried with a box rather than a point).
export function buildTriangleGrid(projected) {
	const boxes = projected.map(({ tri }) => [
		Math.min(tri[0][0], tri[1][0], tri[2][0]), Math.min(tri[0][1], tri[1][1], tri[2][1]),
		Math.max(tri[0][0], tri[1][0], tri[2][0]), Math.max(tri[0][1], tri[1][1], tri[2][1]),
	]);
	let minU = Infinity, minW = Infinity, maxU = -Infinity, maxW = -Infinity;
	for (const b of boxes) {
		minU = Math.min(minU, b[0]); minW = Math.min(minW, b[1]);
		maxU = Math.max(maxU, b[2]); maxW = Math.max(maxW, b[3]);
	}
	const n = Math.max(1, Math.min(512, Math.ceil(Math.sqrt(projected.length))));
	const cellU = (maxU - minU) / n || 1;
	const cellW = (maxW - minW) / n || 1;
	const cellOf = (u, w) => [
		Math.min(n - 1, Math.max(0, Math.floor((u - minU) / cellU))),
		Math.min(n - 1, Math.max(0, Math.floor((w - minW) / cellW))),
	];

	const cells = new Map();
	boxes.forEach((b, i) => {
		const [u0, w0] = cellOf(b[0], b[1]);
		const [u1, w1] = cellOf(b[2], b[3]);
		for (let cu = u0; cu <= u1; cu++) {
			for (let cw = w0; cw <= w1; cw++) {
				const key = cu * n + cw;
				if (!cells.has(key)) cells.set(key, []);
				cells.get(key).push(i);
			}
		}
	});

	// The faces whose box overlaps face i's box
	function neighbours(i) {
		const b = boxes[i];
		const [u0, w0] = cellOf(b[0], b[1]);
		const [u1, w1] = cellOf(b[2], b[3]);
		const found = new Set();
		for (let cu = u0; cu <= u1; cu++) {
			for (let cw = w0; cw <= w1; cw++) {
				for (const j of cells.get(cu * n + cw) ?? []) {
					const c = boxes[j];
					if (j !== i && c[0] < b[2] && c[2] > b[0] && c[1] < b[3] && c[3] > b[1]) found.add(j);
				}
			}
		}
		return found;
	}

	return { neighbours, extent: Math.max(maxU - minU, maxW - minW) };
}

// The visible part of every face. Each face starts as its whole projected
// triangle; every face that overlaps it and is nearer the viewer over the
// overlap is cut away. Two faces of a mesh that don't pass through each
// other keep the same order across their whole overlap, so the depth at the
// overlap's centre decides it. Returns, per face, the convex pieces left.
export function visibleRegions(v_view, vSet, faces) {
	const projected = projectFaces(v_view, vSet, faces);
	const grid = buildTriangleGrid(projected);
	const minArea = 1e-12 * grid.extent * grid.extent; // ignore slivers this small
	const tol = 1e-9 * grid.extent;                     // depths closer than this are a tie

	const regions = [];
	projected.forEach((f, i) => {
		let pieces = [f.tri];
		for (const j of grid.neighbours(i)) {
			const g = projected[j];
			const overlap = intersectConvex(f.tri, g.tri);
			if (overlap.length < 3 || signedArea2(overlap) <= minArea) continue;
			const c = centroid(overlap);
			if (depthAt(g, c) >= depthAt(f, c) - tol) continue; // g is behind f
			pieces = pieces.flatMap(p => subtractTriangle(p, g.tri, minArea));
			if (pieces.length === 0) break;                     // f is hidden
		}
		if (pieces.length > 0) regions.push({ face: f.face, plane: f.plane, pieces });
	});
	return regions;
}

// The average of a polygon's points: inside it, as the polygon is convex.
export function centroid(poly) {
	let u = 0, w = 0;
	for (const p of poly) { u += p[0]; w += p[1]; }
	return [u / poly.length, w / poly.length];
}

// --- Merging ---

// Merges the visible pieces into the polygons that outline them, each an
// outer ring followed by its holes.
//
// The pieces don't overlap, so an edge two pieces share is inside the
// outline and an edge only one piece has is on it. Every piece runs
// anticlockwise, so a shared edge appears once each way (a → b in one piece,
// b → a in its neighbour) and the pair cancels; what is left is the outline.
// Two things get in the way, and are dealt with first:
//   1. the same point, computed by clipping two different pieces, can differ
//      in its last digits, so points closer than a tolerance are welded;
//   2. a piece's corner can sit part way along its neighbour's edge (a
//      "T-junction"), so every edge is split at the points lying on it.
export function mergePieces(pieces) {
	let extent = 0;
	for (const poly of pieces) for (const [u, w] of poly) extent = Math.max(extent, Math.abs(u), Math.abs(w));
	const tol = 1e-9 * (extent || 1);

	// 1. Weld points: a hash grid with cells the size of the tolerance, so
	// a point only needs comparing with the points in the cells around it
	const points = [];
	const weldGrid = new Map();
	const key = (i, j) => i * 73856093 ^ j * 19349663;
	function weld([u, w]) {
		const ci = Math.floor(u / tol), cj = Math.floor(w / tol);
		for (let di = -1; di <= 1; di++) {
			for (let dj = -1; dj <= 1; dj++) {
				for (const id of weldGrid.get(key(ci + di, cj + dj)) ?? []) {
					const q = points[id];
					if (Math.abs(q[0] - u) <= tol && Math.abs(q[1] - w) <= tol) return id;
				}
			}
		}
		points.push([u, w]);
		const k = key(ci, cj);
		if (!weldGrid.has(k)) weldGrid.set(k, []);
		weldGrid.get(k).push(points.length - 1);
		return points.length - 1;
	}
	const edges = [];
	for (const poly of pieces) {
		const ids = poly.map(weld);
		for (let i = 0; i < ids.length; i++) {
			const a = ids[i], b = ids[(i + 1) % ids.length];
			if (a !== b) edges.push([a, b]);
		}
	}

	// 2. Split every edge at the points on it, found with a second hash grid
	// with cells about the length of an edge
	let total = 0;
	for (const [a, b] of edges) total += Math.hypot(points[b][0] - points[a][0], points[b][1] - points[a][1]);
	const cell = (total / (edges.length || 1)) || 1;
	const pointGrid = new Map();
	points.forEach((p, id) => {
		const k = key(Math.floor(p[0] / cell), Math.floor(p[1] / cell));
		if (!pointGrid.has(k)) pointGrid.set(k, []);
		pointGrid.get(k).push(id);
	});
	const split = [];
	for (const [a, b] of edges) {
		const [pa, pb] = [points[a], points[b]];
		const [du, dw] = [pb[0] - pa[0], pb[1] - pa[1]];
		const len2 = du * du + dw * dw;
		const on = [];
		const [i0, i1] = [Math.floor(Math.min(pa[0], pb[0]) / cell), Math.floor(Math.max(pa[0], pb[0]) / cell)];
		const [j0, j1] = [Math.floor(Math.min(pa[1], pb[1]) / cell), Math.floor(Math.max(pa[1], pb[1]) / cell)];
		for (let i = i0; i <= i1; i++) {
			for (let j = j0; j <= j1; j++) {
				for (const id of pointGrid.get(key(i, j)) ?? []) {
					if (id === a || id === b) continue;
					const p = points[id];
					const t = ((p[0] - pa[0]) * du + (p[1] - pa[1]) * dw) / len2;
					if (t <= 0 || t >= 1) continue;
					// distance from the line, |cross| / length
					if (Math.abs((p[0] - pa[0]) * dw - (p[1] - pa[1]) * du) <= tol * Math.sqrt(len2)) on.push([t, id]);
				}
			}
		}
		on.sort((x, y) => x[0] - y[0]);
		let prev = a;
		for (const [, id] of on) { if (id !== prev) split.push([prev, id]); prev = id; }
		if (prev !== b) split.push([prev, b]);
	}

	// 3. Cancel each edge against the same edge the other way
	const count = new Map();
	for (const [a, b] of split) {
		const back = `${b},${a}`;
		if (count.get(back) > 0) count.set(back, count.get(back) - 1);
		else count.set(`${a},${b}`, (count.get(`${a},${b}`) ?? 0) + 1);
	}
	const out = new Map(); // point -> the outline edges leaving it
	for (const [k, n] of count) {
		if (n <= 0) continue;
		const [a, b] = k.split(',').map(Number);
		for (let i = 0; i < n; i++) {
			if (!out.has(a)) out.set(a, []);
			out.get(a).push(b);
		}
	}

	// 4. Chain the outline edges into rings. Where two rings touch at a
	// point, take the edge turning furthest right, which keeps each ring to
	// its own side of the point.
	const angle = (from, to) => Math.atan2(points[to][1] - points[from][1], points[to][0] - points[from][0]);
	const rings = [];
	for (const [start, list] of out) {
		while (list.length > 0) {
			const ring = [start];
			let prev = start, cur = list.pop();
			while (cur !== start) {
				ring.push(cur);
				const next = out.get(cur);
				if (!next || next.length === 0) break; // an open chain: not a ring
				let pick = 0;
				if (next.length > 1) {
					const back = angle(cur, prev);
					let best = Infinity;
					next.forEach((n, i) => {
						const turn = ((back - angle(cur, n)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI;
						if (turn < best) { best = turn; pick = i; }
					});
				}
				prev = cur;
				cur = next.splice(pick, 1)[0];
			}
			if (cur === start) rings.push(simplifyRing(ring.map(id => points[id]), tol));
		}
	}

	// 5. Anticlockwise rings are outlines, clockwise ones holes; each hole
	// goes with the smallest outline around it. Rounding leaves a few slivers
	// where pieces meet, around a millionth of a millionth of the area, so
	// rings below a billionth of the extent squared are dropped.
	const minArea = 1e-9 * extent * extent;
	const outers = [], holes = [];
	for (const r of rings) {
		const a = signedArea2(r);
		if (r.length < 3 || Math.abs(a) <= minArea) continue;
		(a > 0 ? outers : holes).push({ ring: r, area: Math.abs(a) });
	}
	outers.sort((x, y) => x.area - y.area);
	const polygons = outers.map(o => [o.ring]);
	for (const h of holes) {
		const [p, q] = h.ring;
		const probe = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; // an edge midpoint, never a shared corner
		const i = outers.findIndex(o => o.area > h.area && pointInRing(probe, o.ring));
		if (i >= 0) polygons[i].push(h.ring);
	}
	return polygons;
}

// Drops the points of a ring that sit on a straight line between their
// neighbours (left behind where edges were split).
export function simplifyRing(ring, tol) {
	const out = [];
	for (let i = 0; i < ring.length; i++) {
		const a = ring[(i + ring.length - 1) % ring.length], p = ring[i], b = ring[(i + 1) % ring.length];
		const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
		const cross = (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
		if (Math.abs(cross) > tol * len) out.push(p);
	}
	return out;
}

// Is point p inside the ring? Counts the ring's edges a ray to the right of
// p crosses: an odd number means inside.
export function pointInRing(p, ring) {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [ui, wi] = ring[i], [uj, wj] = ring[j];
		if ((wi > p[1]) !== (wj > p[1]) && p[0] < ((uj - ui) * (p[1] - wi)) / (wj - wi) + ui) inside = !inside;
	}
	return inside;
}

// --- Openings ---

// The openings in a mesh, as loops of vertices. In a closed mesh every edge
// is shared by two faces; an edge with only one face runs along the rim of
// an opening, such as the mouth of the teapot's spout. Vertices are welded
// by position first (within a millionth of the mesh's size), because a mesh
// built from patches, like the teapot, repeats the vertices along each seam.
export function openEdgeLoops(vSet, fSet) {
	let extent = 0;
	for (const v of vSet) extent = Math.max(extent, Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2]));
	const tol = 1e-6 * (extent || 1);
	const ids = new Map();
	const weld = vSet.map(v => {
		const k = v.map(x => Math.round(x / tol)).join();
		if (!ids.has(k)) ids.set(k, ids.size);
		return ids.get(k);
	});
	const at = [];
	vSet.forEach((v, i) => { at[weld[i]] = v; });

	// how many faces use each edge
	const uses = new Map();
	for (const f of fSet) {
		for (let i = 0; i < 3; i++) {
			const a = weld[f[i]], b = weld[f[(i + 1) % 3]];
			if (a === b) continue;
			const k = a < b ? `${a},${b}` : `${b},${a}`;
			uses.set(k, (uses.get(k) ?? 0) + 1);
		}
	}

	// chain the edges with one face into loops
	const next = new Map();
	for (const [k, n] of uses) {
		if (n !== 1) continue;
		const [a, b] = k.split(',').map(Number);
		if (!next.has(a)) next.set(a, []);
		if (!next.has(b)) next.set(b, []);
		next.get(a).push(b);
		next.get(b).push(a);
	}
	const seen = new Set();
	const loops = [];
	for (const start of next.keys()) {
		if (seen.has(start)) continue;
		const loop = [start];
		seen.add(start);
		let cur = start;
		for (;;) {
			const n = next.get(cur).find(x => !seen.has(x));
			if (n === undefined) break;
			loop.push(n);
			seen.add(n);
			cur = n;
		}
		if (loop.length >= 3) loops.push(loop.map(id => at[id]));
	}
	return loops;
}

// Fills the holes in the outline that are openings in the mesh rather than
// real gaps. A hole is an opening when it lies inside the projection of one
// of the mesh's open-edge loops; a real gap, like a courtyard, has no open
// edge around it and is kept. Returns the outline without those holes, and
// how many were filled.
export function fillOpenHoles(v_view, outline, loops) {
	const axes = projectionAxes(v_view);
	const rims = loops
		.map(loop => loop.map(v => projectVertex(axes, v).p))
		.filter(ring => Math.abs(signedArea2(ring)) > 0);

	let filled = 0;
	const result = outline.map(([outer, ...holes]) => [outer, ...holes.filter(h => {
		const probe = pointInsideHole(h);
		const isOpening = rims.some(rim => pointInRing(probe, rim));
		if (isOpening) filled++;
		return !isOpening;
	})]);
	return { outline: result, filled };
}

// A point certainly inside a hole: just off the middle of its longest edge,
// on the hole's side. A hole runs clockwise, so its inside is on the right.
export function pointInsideHole(hole) {
	let best = 0, len = 0;
	for (let i = 0; i < hole.length; i++) {
		const [p, q] = [hole[i], hole[(i + 1) % hole.length]];
		const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
		if (l > len) { len = l; best = i; }
	}
	const [p, q] = [hole[best], hole[(best + 1) % hole.length]];
	const [du, dw] = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
	const step = 1e-3 * len;
	return [(p[0] + q[0]) / 2 + dw * step, (p[1] + q[1]) / 2 - du * step];
}

// --- Output ---

// Polygons (each an outer ring and any holes, as from a polygon union) as a
// GeoJSON FeatureCollection. GeoJSON wants each ring closed, outer rings
// anticlockwise and holes clockwise (RFC 7946).
export function toGeoJSON(polygons, properties = {}) {
	const closed = (ring) => {
		const r = ring.map(p => [p[0], p[1]]);
		const [first, last] = [r[0], r[r.length - 1]];
		if (first[0] !== last[0] || first[1] !== last[1]) r.push([first[0], first[1]]);
		return r;
	};
	const wind = (ring, anticlockwise) =>
		(signedArea2(ring) > 0) === anticlockwise ? ring : ring.slice().reverse();

	return {
		type: 'FeatureCollection',
		features: polygons.map((rings, i) => ({
			type: 'Feature',
			properties: { id: i, ...properties },
			geometry: {
				type: 'Polygon',
				coordinates: rings.map((ring, k) => wind(closed(ring), k === 0)),
			},
		})),
	};
}
