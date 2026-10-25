import {
	addAxesWithLabels,
	addVectorLabel,
	extractGeometryData,
	createCameraAnimator,
	makeButton,
	makeUIContainer,
} from '/api/scenes/lib/scene-utils.js';
import {
	extractGeometry,
	doBackfaceCull,
	occlusionCullGrid,
} from '/api/scenes/lib/culling.js';

export const meta = {
	title: 'Occlusion Cull',
	description: 'An interactive mesh demonstrating back-face and occlusion culling',
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
	
	let globalMeshes = null;
	let globalMeshGroup = null;
	
	//let teapotWireframeMesh = null;
	let showWireframe = false;
	let showCullFaces = true;
	let showOccludedFaces = true;

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
	`
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
		loadGeometry(select.value).then(group => {
			meshChange(group);
		});
	});
	ui.appendChild(select);

	// Wireframe checkbox
	const wireLabel = document.createElement('label');
	wireLabel.style.cssText = labelCSS;
	const wireCheckbox = document.createElement('input');
	wireCheckbox.type = 'checkbox';
	wireCheckbox.checked = false;
	wireCheckbox.style.cursor = 'pointer';
	wireCheckbox.addEventListener('change', () => {
		showWireframe = wireCheckbox.checked;
		updateWireframeVisibility();
	});
	wireLabel.appendChild(wireCheckbox);
	wireLabel.appendChild(document.createTextNode('Wireframe'));
	ui.appendChild(wireLabel);

	// Show Cull checkbox
	const showCullLabel = document.createElement('label');
	showCullLabel.style.cssText = labelCSS;
	const showCullCheckbox = document.createElement('input');
	showCullCheckbox.type = 'checkbox';
	showCullCheckbox.checked = true;
	showCullCheckbox.style.cursor = 'pointer';
	showCullCheckbox.addEventListener('change', () => {
		showCullFaces = showCullCheckbox.checked;
		updateCullVisibility();
	});
	showCullLabel.appendChild(showCullCheckbox);
	showCullLabel.appendChild(document.createTextNode('Back-faces'));
	ui.appendChild(showCullLabel);

	// Show Occluded checkbox
	const showOccludedLabel = document.createElement('label');
	showOccludedLabel.style.cssText = labelCSS;
	const showOccludedCheckbox = document.createElement('input');
	showOccludedCheckbox.type = 'checkbox';
	showOccludedCheckbox.checked = true;
	showOccludedCheckbox.style.cursor = 'pointer';
	showOccludedCheckbox.addEventListener('change', () => {
		showOccludedFaces = showOccludedCheckbox.checked;
		updateOccludedVisibility();
	});
	showOccludedLabel.appendChild(showOccludedCheckbox);
	showOccludedLabel.appendChild(document.createTextNode('Occluded'));
	ui.appendChild(showOccludedLabel);
	
	// Top view button
	topViewBtn = makeButton('👁 View', () => toggleTopView());
	ui.appendChild(topViewBtn);

	// Rotation slider
	const rotateLabel = document.createElement('label');
	rotateLabel.style.cssText = labelCSS + 'flex-direction: column; align-items: stretch; gap: 4px;';

	const rotateLabelText = document.createElement('span');
	rotateLabelText.textContent = 'Rotate';
	rotateLabelText.style.cssText = 'font-size: 12px;';

	const rotateSlider = document.createElement('input');
	rotateSlider.type = 'range';
	rotateSlider.min = '-180';
	rotateSlider.max = '180';
	rotateSlider.value = '45'; // matches your current Math.PI/4 default
	rotateSlider.step = '1';
	rotateSlider.style.cssText = `
		width: 140px;
		cursor: pointer;
		accent-color: #F2A65A;
	`;

	rotateSlider.addEventListener('input', () => {
		const degrees = parseFloat(rotateSlider.value);
		if (globalMeshGroup) {
			//globalMeshGroup.rotation.z = degrees * (Math.PI / 180);
			meshChange(globalMeshGroup, degrees)
		}
	});

	//rotateLabel.appendChild(rotateLabelText);
	//rotateLabel.appendChild(rotateSlider);
	//ui.appendChild(rotateLabel);

	const wrapper = document.createElement('div');
	wrapper.style.cssText = 'position: relative; width: 100%; height: 100%;';
	wrapper.appendChild(ui);
	container.appendChild(wrapper);

	// Face counts and the time the culling took
	const stats = document.createElement('div');
	stats.style.cssText = statsCSS;
	wrapper.appendChild(stats);


	async function meshChange(meshGroup, degrees=0) {
		if (!meshGroup) return;
		removeMesh();

		const innerMesh = meshGroup.children.find(c => c.isMesh);

		globalMeshes = innerMesh;
		
		const cullMeshGroup = new THREE_ref.Group();
		cullMeshGroup.name = 'CullMeshGroup';
		
		const view_v = [ 0, -1, 0 ];

		innerMesh.rotation.z = parseFloat(rotateSlider.value) * (Math.PI / 180);

		// Back-face cull, then occlusion cull the faces left facing the viewer
		const start = performance.now();
		const { vSet, fSet } = extractGeometry(innerMesh);
		const { frontFaces, backFaces } = doBackfaceCull(view_v, vSet, fSet);
		const { visibleFaces, occludedFaces } = occlusionCullGrid(view_v, vSet, frontFaces);
		const ms = performance.now() - start;

		const fmt = (n) => n.toLocaleString('en-AU');
		stats.textContent =
			`${fmt(fSet.length)} faces · ${fmt(backFaces.length)} back · ` +
			`${fmt(occludedFaces.length)} occluded · ${fmt(visibleFaces.length)} visible · ${ms.toFixed(0)} ms`;

		for (const mesh of buildCullMeshes(innerMesh, vSet, visibleFaces, backFaces, occludedFaces)) {
			cullMeshGroup.add(mesh);
		}

		const sizeBox = new THREE_ref.Box3().setFromObject(cullMeshGroup);
		const size = sizeBox.getSize(new THREE_ref.Vector3());
		const maxDim = Math.max(size.x, size.y, size.z);

		const dimScale = Math.max(2.0 / maxDim, 2.0 / size.y);
		cullMeshGroup.scale.setScalar(dimScale);

		const positionBox = new THREE_ref.Box3().setFromObject(cullMeshGroup);
		cullMeshGroup.position.y = -positionBox.min.y;
		cullMeshGroup.rotation.y = Math.PI / 4;
		//cullMeshGroup.rotation.z = parseFloat(rotateSlider.value) * (Math.PI / 180);

		globalMeshGroup = cullMeshGroup;
		scene.add(cullMeshGroup);
	}

	// Builds three meshes from the face sets: visible faces (amber), back
	// faces (red) and occluded faces (purple). Faces are [n, o, p] arrays.
	function buildCullMeshes(originalMesh, vertices, visibleFaces, culledFaces, occludedFaces) {
		// Flatten vertex array into a Float32Array for BufferGeometry
		const positions = new Float32Array(vertices.length * 3);
		for (let i = 0; i < vertices.length; i++) {
			positions[i * 3]     = vertices[i][0];
			positions[i * 3 + 1] = vertices[i][1];
			positions[i * 3 + 2] = vertices[i][2];
		}

		// Visible faces mesh — uses original-style material
		const visibleGeom = new THREE_ref.BufferGeometry();
		visibleGeom.setAttribute('position', new THREE_ref.BufferAttribute(positions, 3));
		visibleGeom.setIndex(visibleFaces.flat());
		visibleGeom.computeVertexNormals();

		const visibleMaterial = new THREE_ref.MeshPhongMaterial({
			color: 0xF2A65A,
			shininess: 80,
			specular: 0x444444,
			side: THREE_ref.FrontSide,
		});

		const visibleMesh = new THREE_ref.Mesh(visibleGeom, visibleMaterial);
		visibleMesh.name = originalMesh.name + 'Visible';

		// Culled faces mesh — red and transparent
		const culledGeom = new THREE_ref.BufferGeometry();
		culledGeom.setAttribute('position', new THREE_ref.BufferAttribute(positions, 3));
		culledGeom.setIndex(culledFaces.flat());
		culledGeom.computeVertexNormals();

		const culledMaterial = new THREE_ref.MeshBasicMaterial({
			color: 0xff3333,
			transparent: true,
			opacity: 0.35,
			side: THREE_ref.DoubleSide,
			depthWrite: false,
		});

		const culledMesh = new THREE_ref.Mesh(culledGeom, culledMaterial);
		culledMesh.name = originalMesh.name + 'Culled';
		culledMesh.visible = showCullFaces;

		// Occluded faces mesh — purple and transparent
		const occludedGeom = new THREE_ref.BufferGeometry();
		occludedGeom.setAttribute('position', new THREE_ref.BufferAttribute(positions, 3));
		occludedGeom.setIndex(occludedFaces.flat());
		occludedGeom.computeVertexNormals();

		const occludedMaterial = new THREE_ref.MeshBasicMaterial({
			color: 0x9B5DE5,
			transparent: true,
			opacity: 0.55,
			side: THREE_ref.DoubleSide,
			depthWrite: false,
		});

		const occludedMesh = new THREE_ref.Mesh(occludedGeom, occludedMaterial);
		occludedMesh.name = originalMesh.name + 'Occluded';
		occludedMesh.visible = showOccludedFaces;

		// Wireframe overlays for all three, matching existing pattern
		visibleMesh.add(createWireframeForMesh(visibleMesh));
		culledMesh.add(createWireframeForMesh(culledMesh));
		occludedMesh.add(createWireframeForMesh(occludedMesh));

		return [visibleMesh, culledMesh, occludedMesh];
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
			// Hide arrow and label
			if (arrowHelper) arrowHelper.visible = false;
			if (vectorLabelSprite) vectorLabelSprite.visible = false;
		} else {
			cameraAnim.animateTo({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 8 });
			isTopView = false;
			topViewBtn.textContent = '👁 View';
			// Restore arrow and label
			if (arrowHelper) arrowHelper.visible = true;
			if (vectorLabelSprite) vectorLabelSprite.visible = true;
		}
	}

	function updateWireframeVisibility() {
		if (!globalMeshGroup) return;
		const wfMeshes = [];
		globalMeshGroup.traverse(child => {
			if (child.isMesh && child.material?.wireframe) wfMeshes.push(child);
		});
		for (const m of wfMeshes) m.visible = showWireframe;
	}

	function updateCullVisibility() {
		if (!globalMeshGroup) return;
		globalMeshGroup.traverse(child => {
			if (child.isMesh && child.name.endsWith('Culled')) {
				child.visible = showCullFaces;
			}
		});
	}
	
	function updateOccludedVisibility() {
		if (!globalMeshGroup) return;
		globalMeshGroup.traverse(child => {
			if (child.isMesh && child.name.endsWith('Occluded')) {
				child.visible = showOccludedFaces;
			}
		});
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
		const toDispose = [];
		globalMeshGroup.traverse?.(child => toDispose.push(child));
		for (const child of toDispose) {
			child.geometry?.dispose();
			if (child.material) {
				Array.isArray(child.material)
					? child.material.forEach(m => m.dispose())
					: child.material.dispose();
			}
		}
		globalMeshGroup = null;
		globalMeshes = null;
	}

	async function loadGeometry(type) {
		console.log('Loading geometry:', type);
		if (!THREE_ref || !scene) return;

		const meshMaterial = new THREE_ref.MeshPhongMaterial({
			color: 0xF2A65A,
			shininess: 80,
			specular: 0x444444,
			side: THREE_ref.DoubleSide,
		});


		if (type === 'teapot') {
			const { TeapotGeometry } = await import(
				'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/geometries/TeapotGeometry.js'
			);

			const teapotGeom = new TeapotGeometry(0.8, 10);
			const teapotMesh = new THREE_ref.Mesh(teapotGeom, meshMaterial);
			teapotMesh.name = 'TeapotMesh';

			const teapotWireframeMesh = createWireframeForMesh(teapotMesh);
			teapotMesh.add(teapotWireframeMesh);

			const teapotMeshGroup = new THREE_ref.Group();
			teapotMeshGroup.name = 'TeapotGroup';
			teapotMeshGroup.add(teapotMesh);

			return teapotMeshGroup;

		} else if (type === 'bunny') {
			const { OBJLoader } = await import(
				'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/OBJLoader.js'
			);

			return new Promise((resolve) => {
				const loader = new OBJLoader();
				loader.load(
					'/models/stanford-bunny.obj',
					(bunnyGroup) => {
						bunnyGroup.name = 'BunnyGroup';

						const meshes = [];
						bunnyGroup.traverse(child => {
							if (child.isMesh) {
								child.name = 'BunnyMesh';
								child.material = meshMaterial;
								meshes.push(child);
							}
						});
						for (const child of meshes) {
							child.add(createWireframeForMesh(child));
						}
						resolve(bunnyGroup);
					},
					undefined,
					(err) => {
						console.error('Bunny load failed:', err);
						showError('Failed to load bunny.');
						resolve(null);
					}
				);
			});
		} else if (type === 'dragon') { 
			const { OBJLoader } = await import(
				'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/OBJLoader.js'
			);

			return new Promise((resolve) => {
				const loader = new OBJLoader();
				loader.load(
					'/api/proxy?url=https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/xyzrgb_dragon.obj',
					(bunnyGroup) => {
						bunnyGroup.name = 'DragonGroup';

						const meshes = [];
						bunnyGroup.traverse(child => {
							if (child.isMesh) {
								child.name = 'DragonMesh';
								child.material = meshMaterial;
								meshes.push(child);
							}
						});
						for (const child of meshes) {
							child.add(createWireframeForMesh(child));
						}
						resolve(bunnyGroup);
					},
					undefined,
					(err) => {
						console.error('Dragon load failed:', err);
						showError('Failed to load bunny.');
						resolve(null);
					}
				);
			});
		}
	}

	function createWireframeForMesh(mesh) {
		const wireMaterial =new THREE_ref.MeshBasicMaterial({
			color: 0xE8F4F8,
			wireframe: true,
			transparent: true,
			opacity: 0.25,
		});
		const wireframeMesh = new THREE_ref.Mesh(mesh.geometry, wireMaterial);
		wireframeMesh.name = mesh.name + 'Wireframe';
		wireframeMesh.visible = showWireframe;
		return wireframeMesh;
	}

	import('three').then(async THREE => {
		THREE_ref = THREE;

		cameraAnim = createCameraAnimator(spherical, updateCamera);

		const w = container.clientWidth;
		const h = container.clientHeight;

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(w, h);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.shadowMap.enabled = true;
		wrapper.appendChild(renderer.domElement);

		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x1B3A4B);

		//camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
		const aspect = w / h;
		camera = new THREE.OrthographicCamera(
			-viewSize * aspect,  // left
			viewSize * aspect,  // right
			viewSize,           // top
			-viewSize,           // bottom
			0.1,                 // near
			100                  // far
		);
		
		
		updateCamera();

		// Lighting
		scene.add(new THREE.AmbientLight(0xffffff, 0.5));
		const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
		dirLight.position.set(5, 8, 5);
		dirLight.castShadow = true;
		scene.add(dirLight);
		const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
		fillLight.position.set(-5, -2, -5);
		scene.add(fillLight);

		// Grid slightly below y=0 so axes always render on top
		const grid = new THREE.GridHelper(8, 8, 0x2a5a6a, 0x2a5a6a);
		grid.position.y = -0.001;
		scene.add(grid);

		// Axes with labels from library
		addAxesWithLabels(THREE, scene, 2);

		// Arrow — v_view above geometry pointing down
		const arrowOrigin = new THREE.Vector3(0, 3.5, 0);
		const arrowDir = new THREE.Vector3(0, -1, 0);
		// Arrow — v_view above geometry pointing down
		arrowHelper = new THREE.ArrowHelper(arrowDir, arrowOrigin, 1.0, 0xE8F4F8, 0.25, 0.12);
		scene.add(arrowHelper);

		// Vector label from library — store the returned sprite
		vectorLabelSprite = addVectorLabel(THREE, scene, {
			main: 'v',
			sub: 'view',
			vec: true,
			position: new THREE.Vector3(0, 3.5, 0),
		});

		globalMeshGroup = await loadGeometry('teapot');
		await meshChange(globalMeshGroup);

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
			const aspect = camera.right / camera.top; // current aspect
			camera.left   = -viewSize * aspect;
			camera.right  =  viewSize * aspect;
			camera.top    =  viewSize;
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
			camera.left   = -viewSize * aspect;
			camera.right  =  viewSize * aspect;
			camera.top    =  viewSize;
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