import {
	addAxesWithLabels,
	addVectorLabel,
	extractGeometryData,
	createCameraAnimator,
	makeButton,
	makeUIContainer,
} from '/api/scenes/lib/scene-utils.js';

export const meta = {
	title: 'Vector Demo',
	description: 'An interactive mesh with a labelled vector. Switch between geometries and toggle wireframe.',
	height: 500,
};

export function init(container) {
	let animId = 0;
	let renderer, scene, camera;
	let isDragging = false;
	let previousMouse = { x: 0, y: 0 };
	let spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 8 };
	let currentMesh = null;
	let wireframeMesh = null;
	let showWireframe = true;
	let THREE_ref = null;
	let isTopView = false;
	let topViewBtn = null;
	let cameraAnim = null;
	let arrowHelper = null;
	let vectorLabelSprite = null;

	const GEOMETRIES = [
		{ value: 'teapot', label: '🫖 Teapot' },
		{ value: 'bunny', label: '🐰 Bunny' },
	];

	// --- UI ---
	const ui = makeUIContainer();

	// Geometry dropdown
	const select = document.createElement('select');
	select.style.cssText = `
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
	GEOMETRIES.forEach(g => {
		const opt = document.createElement('option');
		opt.value = g.value;
		opt.textContent = g.label;
		select.appendChild(opt);
	});
	select.addEventListener('change', () => loadGeometry(select.value));
	ui.appendChild(select);

	// Wireframe checkbox
	const wireLabel = document.createElement('label');
	wireLabel.style.cssText = `
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
	const wireCheckbox = document.createElement('input');
	wireCheckbox.type = 'checkbox';
	wireCheckbox.checked = true;
	wireCheckbox.style.cursor = 'pointer';
	wireCheckbox.addEventListener('change', () => {
		showWireframe = wireCheckbox.checked;
		updateWireframeVisibility();
	});
	wireLabel.appendChild(wireCheckbox);
	wireLabel.appendChild(document.createTextNode('Wireframe'));
	ui.appendChild(wireLabel);

	// Top view button
	topViewBtn = makeButton('👁 View', () => toggleTopView());
	ui.appendChild(topViewBtn);

	const wrapper = document.createElement('div');
	wrapper.style.cssText = 'position: relative; width: 100%; height: 100%;';
	wrapper.appendChild(ui);
	container.appendChild(wrapper);

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
		if (!currentMesh) return;
		const wfMeshes = [];
		currentMesh.traverse(child => {
			if (child.isMesh && child.material?.wireframe) wfMeshes.push(child);
		});
		for (const m of wfMeshes) m.visible = showWireframe;
	}

	function showError(msg) {
		const err = document.createElement('div');
		err.style.cssText = `
			position: absolute; bottom: 12px; left: 12px;
			color: #ff6b6b; font-size: 12px;
			font-family: 'DM Sans', sans-serif;
			background: rgba(0,0,0,0.6);
			padding: 6px 10px; border-radius: 4px;
		`;
		err.textContent = msg;
		wrapper.appendChild(err);
		setTimeout(() => err.remove(), 5000);
	}

	function removeMesh() {
		if (!currentMesh || !scene) return;
		scene.remove(currentMesh);
		const toDispose = [];
		currentMesh.traverse?.(child => toDispose.push(child));
		for (const child of toDispose) {
			child.geometry?.dispose();
			if (child.material) {
				Array.isArray(child.material)
					? child.material.forEach(m => m.dispose())
					: child.material.dispose();
			}
		}
		currentMesh = null;
		wireframeMesh = null;
	}

	async function loadGeometry(type) {
		if (!THREE_ref || !scene) return;
		removeMesh();

		if (type === 'teapot') {
			const { TeapotGeometry } = await import(
				'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/geometries/TeapotGeometry.js'
			);

			const teapotGeom = new TeapotGeometry(0.8, 10);
			const material = new THREE_ref.MeshPhongMaterial({
				color: 0xF2A65A,
				shininess: 80,
				specular: 0x444444,
			});
			const mesh = new THREE_ref.Mesh(teapotGeom, material);
			mesh.rotation.y = Math.PI / 4;

			const box = new THREE_ref.Box3().setFromObject(mesh);
			mesh.position.y = -box.min.y;

			const wireMat = new THREE_ref.MeshBasicMaterial({
				color: 0xE8F4F8,
				wireframe: true,
				transparent: true,
				opacity: 0.25,
			});
			wireframeMesh = new THREE_ref.Mesh(teapotGeom, wireMat);
			wireframeMesh.rotation.y = Math.PI / 4;
			wireframeMesh.position.copy(mesh.position);
			wireframeMesh.visible = showWireframe;

			currentMesh = new THREE_ref.Group();
			currentMesh.add(mesh);
			currentMesh.add(wireframeMesh);
			scene.add(currentMesh);

			const { vertices, faces } = extractGeometryData(teapotGeom);
			console.log(`Teapot: ${vertices.length / 3} vertices, ${faces.length / 3} faces`);

		} else if (type === 'bunny') {
			const { OBJLoader } = await import(
				'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/OBJLoader.js'
			);

			const loader = new OBJLoader();
			loader.load(
				'/api/proxy?url=https://graphics.stanford.edu/~mdfisher/Data/Meshes/bunny.obj',
				(obj) => {
					obj.rotation.y = +Math.PI / 4;

					const box = new THREE_ref.Box3().setFromObject(obj);
					const size = box.getSize(new THREE_ref.Vector3());
					const maxDim = Math.max(size.x, size.y, size.z);
					const scale = 2.5 / maxDim;
					obj.scale.setScalar(scale);

					const box2 = new THREE_ref.Box3().setFromObject(obj);
					obj.position.y = -box2.min.y;

					const meshes = [];
					obj.traverse(child => {
						if (child.isMesh) meshes.push(child);
					});

					wireframeMesh = null;
					let allVertices = [];
					let allFaces = [];
					let vertexOffset = 0;

					for (const child of meshes) {
						child.material = new THREE_ref.MeshPhongMaterial({
							color: 0xF2A65A,
							shininess: 60,
						});

						const wireMat = new THREE_ref.MeshBasicMaterial({
							color: 0xE8F4F8,
							wireframe: true,
							transparent: true,
							opacity: 0.25,
						});
						const wm = new THREE_ref.Mesh(child.geometry, wireMat);
						wm.visible = showWireframe;
						child.add(wm);
						if (!wireframeMesh) wireframeMesh = wm;

						const { vertices, faces } = extractGeometryData(child.geometry);
						allVertices = allVertices.concat(vertices);
						allFaces = allFaces.concat(faces.map(i => i + vertexOffset));
						vertexOffset += vertices.length / 3;
					}

					currentMesh = obj;
					scene.add(currentMesh);

					console.log(`Bunny: ${allVertices.length / 3} vertices, ${allFaces.length / 3} faces`);
				},
				undefined,
				(err) => {
					console.error('Bunny load failed:', err);
					showError('Failed to load bunny.');
				}
			);
		}
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

		camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
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

		await loadGeometry('teapot');

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
			spherical.radius = Math.max(2, Math.min(20, spherical.radius + e.deltaY * 0.01));
			updateCamera();
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
			camera.aspect = w / h;
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