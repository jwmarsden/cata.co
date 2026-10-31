import {
	addAxesWithLabels,
	addVectorLabel,
	createCameraAnimator,
	makeButton,
	makeUIContainer,
} from '/api/scenes/lib/scene-utils.js';
import {
	extractGeometry,
	doBackfaceCull,
} from '/api/scenes/lib/culling.js';
import {
	projectionAxes,
	visibleRegions,
	depthAt,
	mergePieces,
	openEdgeLoops,
	fillOpenHoles,
	toGeoJSON,
} from '/api/scenes/lib/projection.js';

export const meta = {
	title: 'Silhouette Projection',
	description: 'A mesh flattened onto the ground plane: the visible part of every face, and the outline they merge into',
	height: 500,
};

export function init(container) {
	let animId = 0;
	let THREE_ref = null;
	let renderer, scene, camera;
	let viewSize = 5;

	let isDragging = false;
	let previousMouse = { x: 0, y: 0 };
	let spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 8 };

	let globalMeshGroup = null;
	let lastOutline = null;   // the merged polygons, for the GeoJSON download
	let lastFilled = null;    // the same with the mesh's openings filled
	let lastModel = 'teapot';

	let showModel = true;
	let showPieces = true;
	let showOutline = true;
	let fillOpenings = true;

	let isTopView = false;
	let topViewBtn = null;
	let cameraAnim = null;
	let arrowHelper = null;
	let vectorLabelSprite = null;

	const GEOMETRIES = [
		{ value: 'teapot', label: '🫖 Teapot' },
		{ value: 'bunny', label: '🐰 Bunny' },
		{ value: 'dragon', label: '🐉 Dragon' },
	];

	// --- UI ---
	const ui = makeUIContainer();

	const selectCSS = `
		padding: 6px 10px;
		background: rgba(27,58,75,0.9);
		color: #E8F4F8;
		border: 1px solid #C8DDE6;
		border-radius: 6px;
		font-size: 13px;
		font-family: 'DM Sans', sans-serif;
		cursor: pointer;
		outline: none;
	`;
	const labelCSS = `
		display: flex; align-items: center; gap: 6px;
		color: #E8F4F8;
		font-size: 13px;
		font-family: 'DM Sans', sans-serif;
		cursor: pointer;
		background: rgba(27,58,75,0.9);
		border: 1px solid #C8DDE6;
		border-radius: 6px;
		padding: 6px 10px;
		user-select: none;
	`;
	const errorCSS = `
		position: absolute; bottom: 12px; left: 12px;
		color: #ff6b6b; font-size: 12px;
		font-family: 'DM Sans', sans-serif;
		background: rgba(0,0,0,0.6);
		padding: 6px 10px; border-radius: 4px;
	`;
	const statsCSS = `
		position: absolute; bottom: 12px; right: 12px;
		color: #E8F4F8; font-size: 12px;
		font-family: 'DM Mono', monospace;
		background: rgba(27,58,75,0.9);
		border: 1px solid #C8DDE6;
		padding: 6px 10px; border-radius: 6px;
		pointer-events: none;
	`;

	// Geometry dropdown
	const select = document.createElement('select');
	select.style.cssText = selectCSS;
	GEOMETRIES.forEach(g => {
		const opt = document.createElement('option');
		opt.value = g.value;
		opt.textContent = g.label;
		select.appendChild(opt);
	});
	select.addEventListener('change', () => {
		if (!scene) return;
		stats.textContent = 'Projecting…';
		loadGeometry(select.value).then(group => {
			lastModel = select.value;
			meshChange(group);
		});
	});
	ui.appendChild(select);

	// A labelled checkbox that calls onChange with its new state
	function addToggle(text, initial, onChange) {
		const label = document.createElement('label');
		label.style.cssText = labelCSS;
		const box = document.createElement('input');
		box.type = 'checkbox';
		box.checked = initial;
		box.style.cursor = 'pointer';
		box.addEventListener('change', () => onChange(box.checked));
		label.appendChild(box);
		label.appendChild(document.createTextNode(text));
		ui.appendChild(label);
	}
	addToggle('Model', showModel, (on) => { showModel = on; updateVisibility(); });
	addToggle('Pieces', showPieces, (on) => { showPieces = on; updateVisibility(); });
	addToggle('Outline', showOutline, (on) => { showOutline = on; updateVisibility(); });
	addToggle('Fill openings', fillOpenings, (on) => { fillOpenings = on; updateVisibility(); });

	// Top view button
	topViewBtn = makeButton('👁 View', () => toggleTopView());
	ui.appendChild(topViewBtn);

	// GeoJSON download of the outline
	ui.appendChild(makeButton('⬇ GeoJSON', () => downloadGeoJSON()));

	const wrapper = document.createElement('div');
	wrapper.style.cssText = 'position: relative; width: 100%; height: 100%;';
	wrapper.appendChild(ui);
	container.appendChild(wrapper);

	// Face and piece counts, and the time the projection took
	const stats = document.createElement('div');
	stats.style.cssText = statsCSS;
	wrapper.appendChild(stats);

	async function meshChange(meshGroup) {
		if (!meshGroup) return;
		removeMesh();

		const innerMesh = meshGroup.children.find(c => c.isMesh);
		const group = new THREE_ref.Group();
		group.name = 'SilhouetteGroup';

		const view_v = [0, -1, 0];

		// Back-face cull, then the visible part of each front face, then
		// merge the pieces into the outline
		const start = performance.now();
		const { vSet, fSet } = extractGeometry(innerMesh);
		const { frontFaces } = doBackfaceCull(view_v, vSet, fSet);
		const regions = visibleRegions(view_v, vSet, frontFaces);
		const pieces = regions.flatMap(r => r.pieces);
		const outline = mergePieces(pieces);
		// holes that are openings in the mesh (e.g. the spout's mouth), filled
		const { outline: filledOutline, filled } = fillOpenHoles(view_v, outline, openEdgeLoops(vSet, fSet));
		const ms = performance.now() - start;
		lastOutline = outline;
		lastFilled = filledOutline;

		const fmt = (n) => n.toLocaleString('en-AU');
		const holes = outline.reduce((s, p) => s + p.length - 1, 0);
		stats.textContent =
			`${fmt(fSet.length)} faces · ${fmt(regions.length)} visible · ${fmt(pieces.length)} pieces · ` +
			`${fmt(outline.length)} outline${outline.length === 1 ? '' : 's'}, ${fmt(holes)} hole${holes === 1 ? '' : 's'}` +
			`${filled ? ` (${fmt(filled)} from openings)` : ''} · ${ms.toFixed(0)} ms`;

		// The model itself, semi-transparent so the projection shows through
		const model = new THREE_ref.Mesh(innerMesh.geometry, new THREE_ref.MeshPhongMaterial({
			color: 0xF2A65A, shininess: 80, specular: 0x444444,
			transparent: true, opacity: 0.2, depthWrite: false, side: THREE_ref.DoubleSide,
		}));
		model.name = 'Model';
		model.visible = showModel;
		group.add(model);

		// The projection lies on the plane under the model
		let minY = Infinity;
		for (const v of vSet) minY = Math.min(minY, v[1]);
		const axes = projectionAxes(view_v);
		for (const mesh of buildProjectionMeshes(axes, regions, outline, filledOutline, minY)) group.add(mesh);

		const sizeBox = new THREE_ref.Box3().setFromObject(model);
		const size = sizeBox.getSize(new THREE_ref.Vector3());
		const maxDim = Math.max(size.x, size.y, size.z);
		group.scale.setScalar(Math.max(2.0 / maxDim, 2.0 / size.y));

		const positionBox = new THREE_ref.Box3().setFromObject(group);
		group.position.y = -positionBox.min.y;
		group.rotation.y = Math.PI / 4;

		globalMeshGroup = group;
		scene.add(group);
	}

	// Map point [u, w] back to 3D on the plane at height y (for the view
	// straight down, u runs along x and w along -z)
	function toPlane(axes, [u, w], y) {
		return [
			u * axes.axisU[0] + w * axes.axisW[0],
			y,
			u * axes.axisU[2] + w * axes.axisW[2],
		];
	}

	// The visible pieces as a flat mesh coloured by height (ocean low, amber
	// high), the outline as lines over them (with and without the mesh's
	// openings filled), and the filled openings as pale patches
	function buildProjectionMeshes(axes, regions, outline, filledOutline, y) {
		// heights of the pieces, from the depth at each piece's first point
		let lo = Infinity, hi = -Infinity;
		const heights = regions.map(r => r.pieces.map(p => {
			const h = -depthAt(r, p[0]);
			lo = Math.min(lo, h); hi = Math.max(hi, h);
			return h;
		}));
		const low = new THREE_ref.Color(0x2A5266), high = new THREE_ref.Color(0xF2A65A);

		const positions = [], colors = [];
		regions.forEach((r, i) => r.pieces.forEach((p, k) => {
			const c = low.clone().lerp(high, (heights[i][k] - lo) / ((hi - lo) || 1));
			for (let j = 1; j < p.length - 1; j++) {   // a convex piece as a fan of triangles
				for (const q of [p[0], p[j], p[j + 1]]) {
					positions.push(...toPlane(axes, q, y));
					colors.push(c.r, c.g, c.b);
				}
			}
		}));
		const geom = new THREE_ref.BufferGeometry();
		geom.setAttribute('position', new THREE_ref.Float32BufferAttribute(positions, 3));
		geom.setAttribute('color', new THREE_ref.Float32BufferAttribute(colors, 3));
		const piecesMesh = new THREE_ref.Mesh(geom, new THREE_ref.MeshBasicMaterial({
			vertexColors: true, side: THREE_ref.DoubleSide,
		}));
		piecesMesh.name = 'Pieces';

		function outlineLines(polygons, name) {
			const linePositions = [];
			for (const rings of polygons) {
				for (const ring of rings) {
					for (let j = 0; j < ring.length; j++) {
						linePositions.push(...toPlane(axes, ring[j], y), ...toPlane(axes, ring[(j + 1) % ring.length], y));
					}
				}
			}
			const lineGeom = new THREE_ref.BufferGeometry();
			lineGeom.setAttribute('position', new THREE_ref.Float32BufferAttribute(linePositions, 3));
			const lines = new THREE_ref.LineSegments(lineGeom, new THREE_ref.LineBasicMaterial({ color: 0xE8F4F8 }));
			lines.name = name;
			lines.renderOrder = 1;
			return lines;
		}

		// the holes that were filled: in the outline but not in the filled one
		const kept = new Set(filledOutline.flatMap(([, ...holes]) => holes));
		const fillPositions = [];
		for (const [, ...holes] of outline) {
			for (const hole of holes) {
				if (kept.has(hole)) continue;
				const contour = hole.map(([u, w]) => new THREE_ref.Vector2(u, w));
				for (const tri of THREE_ref.ShapeUtils.triangulateShape(contour, [])) {
					for (const k of tri) fillPositions.push(...toPlane(axes, hole[k], y));
				}
			}
		}
		const fillGeom = new THREE_ref.BufferGeometry();
		fillGeom.setAttribute('position', new THREE_ref.Float32BufferAttribute(fillPositions, 3));
		const fillMesh = new THREE_ref.Mesh(fillGeom, new THREE_ref.MeshBasicMaterial({
			color: 0xC8DDE6, side: THREE_ref.DoubleSide,
		}));
		fillMesh.name = 'Fill';

		const meshes = [piecesMesh, fillMesh, outlineLines(outline, 'Outline'), outlineLines(filledOutline, 'OutlineFilled')];
		for (const m of meshes) m.visible = isShown(m.name);
		return meshes;
	}

	// Which of the scene's parts are showing, from the checkboxes
	function isShown(name) {
		if (name === 'Model') return showModel;
		if (name === 'Pieces') return showPieces;
		if (name === 'Fill') return showPieces && fillOpenings;
		if (name === 'Outline') return showOutline && !fillOpenings;
		if (name === 'OutlineFilled') return showOutline && fillOpenings;
		return true;
	}

	function downloadGeoJSON() {
		if (!lastOutline) return;
		const gj = toGeoJSON(fillOpenings ? lastFilled : lastOutline, { model: lastModel, openingsFilled: fillOpenings });
		const blob = new Blob([JSON.stringify(gj)], { type: 'application/geo+json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `${lastModel}-silhouette.geojson`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	}

	function updateCamera() {
		if (!camera) return;
		const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
		const y = spherical.radius * Math.cos(spherical.phi);
		const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
		camera.position.set(x, y, z);
		camera.lookAt(0, 1.5, 0);
	}

	function toggleTopView() {
		if (!cameraAnim || cameraAnim.isAnimating()) return;
		if (!isTopView) {
			cameraAnim.animateTo({ theta: spherical.theta, phi: 0.01, radius: spherical.radius });
			isTopView = true;
			topViewBtn.textContent = '↩ Restore';
			if (arrowHelper) arrowHelper.visible = false;
			if (vectorLabelSprite) vectorLabelSprite.visible = false;
		} else {
			cameraAnim.animateTo({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 8 });
			isTopView = false;
			topViewBtn.textContent = '👁 View';
			if (arrowHelper) arrowHelper.visible = true;
			if (vectorLabelSprite) vectorLabelSprite.visible = true;
		}
	}

	function updateVisibility() {
		if (!globalMeshGroup) return;
		for (const child of globalMeshGroup.children) child.visible = isShown(child.name);
	}

	function showError(msg) {
		const err = document.createElement('div');
		err.style.cssText = errorCSS;
		err.textContent = msg;
		wrapper.appendChild(err);
		setTimeout(() => err.remove(), 5000);
	}

	function removeMesh() {
		if (!globalMeshGroup || !scene) return;
		scene.remove(globalMeshGroup);
		globalMeshGroup.traverse(child => {
			child.geometry?.dispose();
			child.material?.dispose();
		});
		globalMeshGroup = null;
	}

	async function loadGeometry(type) {
		if (!THREE_ref || !scene) return;

		if (type === 'teapot') {
			const { TeapotGeometry } = await import(
				'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/geometries/TeapotGeometry.js'
			);
			const group = new THREE_ref.Group();
			group.add(new THREE_ref.Mesh(new TeapotGeometry(0.8, 10)));
			return group;
		}

		const urls = {
			bunny: '/models/stanford-bunny.obj',
			dragon: '/api/proxy?url=https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/xyzrgb_dragon.obj',
		};
		const { OBJLoader } = await import(
			'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/OBJLoader.js'
		);
		return new Promise((resolve) => {
			new OBJLoader().load(
				urls[type],
				(group) => resolve(group),
				undefined,
				(err) => {
					console.error(`${type} load failed:`, err);
					showError(`Failed to load the ${type}.`);
					resolve(null);
				}
			);
		});
	}

	import('three').then(async THREE => {
		THREE_ref = THREE;

		cameraAnim = createCameraAnimator(spherical, updateCamera);

		const w = container.clientWidth;
		const h = container.clientHeight;

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(w, h);
		renderer.setPixelRatio(window.devicePixelRatio);
		wrapper.appendChild(renderer.domElement);

		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x1B3A4B);

		const aspect = w / h;
		camera = new THREE.OrthographicCamera(
			-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 100
		);
		updateCamera();

		// Lighting
		scene.add(new THREE.AmbientLight(0xffffff, 0.5));
		const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
		dirLight.position.set(5, 8, 5);
		scene.add(dirLight);
		const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
		fillLight.position.set(-5, -2, -5);
		scene.add(fillLight);

		// Grid slightly below y=0 so the projection always renders on top
		const grid = new THREE.GridHelper(8, 8, 0x2a5a6a, 0x2a5a6a);
		grid.position.y = -0.002;
		scene.add(grid);

		addAxesWithLabels(THREE, scene, 2);

		// Arrow — v_view above geometry pointing down
		arrowHelper = new THREE.ArrowHelper(
			new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 3.5, 0), 1.0, 0xE8F4F8, 0.25, 0.12
		);
		scene.add(arrowHelper);
		vectorLabelSprite = addVectorLabel(THREE, scene, {
			main: 'v',
			sub: 'view',
			vec: true,
			position: new THREE.Vector3(0, 3.5, 0),
		});

		stats.textContent = 'Projecting…';
		await meshChange(await loadGeometry('teapot'));

		// Mouse controls
		function onMouseDown(e) {
			isDragging = true;
			previousMouse = { x: e.clientX, y: e.clientY };
		}
		function onMouseMove(e) {
			if (!isDragging) return;
			const dx = e.clientX - previousMouse.x;
			const dy = e.clientY - previousMouse.y;
			spherical.theta -= dx * 0.01;
			spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy * 0.01));
			previousMouse = { x: e.clientX, y: e.clientY };
			updateCamera();
		}
		function onMouseUp() { isDragging = false; }
		function onWheel(e) {
			e.preventDefault();
			viewSize = Math.max(1, Math.min(20, viewSize + e.deltaY * 0.01));
			const aspect = camera.right / camera.top;
			camera.left = -viewSize * aspect;
			camera.right = viewSize * aspect;
			camera.top = viewSize;
			camera.bottom = -viewSize;
			camera.updateProjectionMatrix();
		}

		let lastTouch = null;
		let lastPinchDist = null;
		function onTouchStart(e) {
			if (e.touches.length === 1) {
				isDragging = true;
				lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
			}
			if (e.touches.length === 2) {
				lastPinchDist = Math.hypot(
					e.touches[0].clientX - e.touches[1].clientX,
					e.touches[0].clientY - e.touches[1].clientY
				);
			}
		}
		function onTouchMove(e) {
			e.preventDefault();
			if (e.touches.length === 1 && isDragging && lastTouch) {
				const dx = e.touches[0].clientX - lastTouch.x;
				const dy = e.touches[0].clientY - lastTouch.y;
				spherical.theta -= dx * 0.01;
				spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy * 0.01));
				lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
				updateCamera();
			}
			if (e.touches.length === 2) {
				const dist = Math.hypot(
					e.touches[0].clientX - e.touches[1].clientX,
					e.touches[0].clientY - e.touches[1].clientY
				);
				if (lastPinchDist) {
					spherical.radius = Math.max(2, Math.min(20, spherical.radius - (dist - lastPinchDist) * 0.02));
					updateCamera();
				}
				lastPinchDist = dist;
			}
		}
		function onTouchEnd() {
			isDragging = false;
			lastTouch = null;
			lastPinchDist = null;
		}

		renderer.domElement.addEventListener('mousedown', onMouseDown);
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
		renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
		renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
		renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
		renderer.domElement.addEventListener('touchend', onTouchEnd);

		function onResize() {
			const w = container.clientWidth;
			const h = container.clientHeight;
			renderer.setSize(w, h);
			const aspect = w / h;
			camera.left = -viewSize * aspect;
			camera.right = viewSize * aspect;
			camera.top = viewSize;
			camera.bottom = -viewSize;
			camera.updateProjectionMatrix();
		}
		window.addEventListener('resize', onResize);

		function animate() {
			animId = requestAnimationFrame(animate);
			cameraAnim.tick(performance.now());
			renderer.render(scene, camera);
		}
		animate();

		return function cleanup() {
			cancelAnimationFrame(animId);
			renderer.domElement.removeEventListener('mousedown', onMouseDown);
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			renderer.domElement.removeEventListener('wheel', onWheel);
			renderer.domElement.removeEventListener('touchstart', onTouchStart);
			renderer.domElement.removeEventListener('touchmove', onTouchMove);
			renderer.domElement.removeEventListener('touchend', onTouchEnd);
			window.removeEventListener('resize', onResize);
			renderer.dispose();
			container.innerHTML = '';
		};
	});
}
