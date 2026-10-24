/**
 * culling.js
 * Back-face and occlusion culling on plain arrays. A vertex is [x, y, z];
 * a face is [n, o, p], three indices into the vertex set.
 *
 * Used by the culling scenes, and quoted in the articles with
 * ![[code:culling#functionName]], so the code shown is the code that runs.
 */

// --- Vectors ---

// Subtracts vector b from vector a, component by component.
// Expects both a and b to be 3‑element arrays: [x, y, z].
// Returns a new 3‑element array representing the difference.
export function subtract(a, b) {
	return [
		a[0] - b[0], // x component
		a[1] - b[1], // y component
		a[2] - b[2]  // z component
	];
}

// Returns a new vector pointing in the same direction but with unit length.
// If the vector has zero length, returns [0, 0, 0] to avoid division by zero.
export function normalize(v) {
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

// Computes the cross product of two vectors a and b.
// The result is a vector perpendicular to both a and b
// following the right‑hand rule.
export function crossProduct(a, b) {
	return [
		a[1] * b[2] - a[2] * b[1], // x component
		a[2] * b[0] - a[0] * b[2], // y component
		a[0] * b[1] - a[1] * b[0], // z component
	];
}

// Computes the dot product of two vectors a and b.
export function dotProduct(a, b) {
	return (a[0] * b[0]) +
		(a[1] * b[1]) +
		(a[2] * b[2]);
}

// --- Mesh ---

// Reads the vertex set (vSet) and the face set (fSet) out of a three.js mesh.
// Indexed geometry lists its faces; otherwise every three vertices are a face.
export function extractGeometry(mesh) {
	const position = mesh.geometry.attributes.position;
	const index = mesh.geometry.index;
	const vSet = [];
	for (let i = 0; i < position.count; i++) {
		vSet.push([position.getX(i), position.getY(i), position.getZ(i)]);
	}
	const fSet = [];
	if (index) {
		for (let i = 0; i < index.count; i += 3) {
			fSet.push([index.getX(i), index.getX(i + 1), index.getX(i + 2)]);
		}
	} else {
		for (let i = 0; i < position.count; i += 3) {
			fSet.push([i, i + 1, i + 2]);
		}
	}
	return { vSet, fSet };
}

// --- Back-face culling ---

// Splits the faces of a mesh by the direction they face, using a view
// direction vector `v_view`: faces whose normals point toward the viewer
// are front faces (F_f), the rest are back faces (F_b).
export function doBackfaceCull(v_view, vSet, fSet) {
	const frontFaces = []; // faces facing the viewer
	const backFaces  = []; // faces facing away

	for (const f of fSet) {
		// Retrieve the 3 vertices of the face
		const [v1, v2, v3] = [vSet[f[0]], vSet[f[1]], vSet[f[2]]];

		// Compute edge vectors of the face
		const e1 = subtract(v2, v1);
		const e2 = subtract(v3, v1);

		// Compute the unit face normal via the cross product
		const normal = normalize(crossProduct(e1, e2));

		// Dot product with view vector determines orientation
		const z = dotProduct(normal, v_view);

		// If the face normal points toward the viewer, keep it
		if (z <= 0) {
			frontFaces.push(f);
		} else {
			backFaces.push(f);
		}
	}

	return { frontFaces, backFaces };
}

// --- Occlusion culling ---

// Möller–Trumbore ray-triangle intersection. Returns the distance t along
// rayDir from rayOrigin to where the ray crosses triangle (v0, v1, v2),
// or null if the ray misses it.
export function rayTriangleIntersect(rayOrigin, rayDir, v0, v1, v2) {
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

// The points of face f that rays are cast from: its three vertices and
// its centroid.
export function samplePoints(vSet, f) {
	const [v1, v2, v3] = [vSet[f[0]], vSet[f[1]], vSet[f[2]]];
	const centroid = [
		(v1[0] + v2[0] + v3[0]) / 3,
		(v1[1] + v2[1] + v3[1]) / 3,
		(v1[2] + v2[2] + v3[2]) / 3,
	];
	return [v1, v2, v3, centroid];
}

// Does the ray from point p towards the viewer pass through face g?
// Hits closer than minT don't count: a ray cast from a vertex starts on
// every face that shares that vertex, and those faces don't hide it.
export function rayHitsFace(p, toViewer, vSet, g, minT) {
	const t = rayTriangleIntersect(p, toViewer, vSet[g[0]], vSet[g[1]], vSet[g[2]]);
	return t !== null && t > minT;
}

// The smallest hit distance that counts, scaled to the size of the mesh
// so the same rule works for a teapot or a dragon.
export function minHitDistance(vSet) {
	const lo = [Infinity, Infinity, Infinity];
	const hi = [-Infinity, -Infinity, -Infinity];
	for (const v of vSet) {
		for (let k = 0; k < 3; k++) {
			lo[k] = Math.min(lo[k], v[k]);
			hi[k] = Math.max(hi[k], v[k]);
		}
	}
	return 1e-6 * Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
}

// Method one: occlusion culling by brute force. Every sample point of
// every front face casts a ray towards the viewer (-v_view) and is tested
// against every other front face. A face is occluded only if all of its
// rays are blocked: if the viewer can see any of its points, it stays.
// O(n²) in the number of front faces.
export function occlusionCullBruteForce(v_view, vSet, faces) {
	const view = normalize(v_view);
	const toViewer = [-view[0], -view[1], -view[2]];
	const minT = minHitDistance(vSet);

	const visibleFaces  = []; // faces the viewer can see
	const occludedFaces = []; // faces hidden behind others

	faces.forEach((f, i) => {
		const occluded = samplePoints(vSet, f).every(p =>
			faces.some((g, j) => j !== i && rayHitsFace(p, toViewer, vSet, g, minT))
		);
		(occluded ? occludedFaces : visibleFaces).push(f);
	});

	return { visibleFaces, occludedFaces };
}

// A 2D grid over the faces' footprints: each face projected onto the
// plane perpendicular to v_view, binned by its bounding box. A ray cast
// along v_view is a single point on that plane, so the only faces it can
// hit are the ones whose footprint covers that point.
export function buildFaceGrid(v_view, vSet, faces) {
	const view = normalize(v_view);

	// Two axes (u, w) spanning the plane perpendicular to the view
	const helper = Math.abs(view[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
	const axisU = normalize(crossProduct(view, helper));
	const axisW = crossProduct(view, axisU);
	const project = (v) => [dotProduct(v, axisU), dotProduct(v, axisW)];

	// Each face's footprint: [minU, minW, maxU, maxW]
	const boxes = faces.map(f => {
		const [a, b, c] = f.map(i => project(vSet[i]));
		return [
			Math.min(a[0], b[0], c[0]), Math.min(a[1], b[1], c[1]),
			Math.max(a[0], b[0], c[0]), Math.max(a[1], b[1], c[1]),
		];
	});

	// n x n cells over all the footprints, about one face per cell
	let minU = Infinity, minW = Infinity, maxU = -Infinity, maxW = -Infinity;
	for (const b of boxes) {
		minU = Math.min(minU, b[0]); minW = Math.min(minW, b[1]);
		maxU = Math.max(maxU, b[2]); maxW = Math.max(maxW, b[3]);
	}
	const n = Math.max(1, Math.min(512, Math.ceil(Math.sqrt(faces.length))));
	const cellU = (maxU - minU) / n || 1;
	const cellW = (maxW - minW) / n || 1;
	const cellOf = (u, w) => [
		Math.min(n - 1, Math.max(0, Math.floor((u - minU) / cellU))),
		Math.min(n - 1, Math.max(0, Math.floor((w - minW) / cellW))),
	];

	// Bin every face into each cell its footprint overlaps
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

	// The faces a ray from point p could hit: those in p's cell whose
	// footprint contains p
	function candidates(p) {
		const [u, w] = project(p);
		const [cu, cw] = cellOf(u, w);
		return (cells.get(cu * n + cw) ?? []).filter(j => {
			const b = boxes[j];
			return u >= b[0] && u <= b[2] && w >= b[1] && w <= b[3];
		});
	}

	return { candidates };
}

// Method two: occlusion culling with the face grid. The same rule as the
// brute force method, but each ray is only tested against the faces whose
// footprint covers it. The grid only skips faces a ray can't hit, so the
// result is the same.
export function occlusionCullGrid(v_view, vSet, faces) {
	const view = normalize(v_view);
	const toViewer = [-view[0], -view[1], -view[2]];
	const minT = minHitDistance(vSet);
	const grid = buildFaceGrid(view, vSet, faces);

	const visibleFaces  = []; // faces the viewer can see
	const occludedFaces = []; // faces hidden behind others

	faces.forEach((f, i) => {
		const occluded = samplePoints(vSet, f).every(p =>
			grid.candidates(p).some(j => j !== i && rayHitsFace(p, toViewer, vSet, faces[j], minT))
		);
		(occluded ? occludedFaces : visibleFaces).push(f);
	});

	return { visibleFaces, occludedFaces };
}
