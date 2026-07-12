import {
	addAxesWithLabels,
	addVectorLabel,
	extractGeometryData,
	createCameraAnimator,
	makeButton,
	makeUIContainer,
} from '/api/scenes/lib/scene-utils.js';

export const meta = {
	title: 'Base Geometry',
	description: 'An interactive mesh demonstrating models',
	height: 500,
};

export function init(container) {
	let animId = 0;
	let THREE_ref = null;
	let renderer, scene, camera;
	let isDragging = false;
	let previousMouse = { x: 0, y: 0 };
	let spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 8 };
	
	let globalMeshes = null;
	let globalMeshGroup = null;
	
	//let teapotWireframeMesh = null;
	let showWireframe = false;
	let showCullFaces = true;

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

	const wrapper = document.createElement('div');
	wrapper.style.cssText = 'position: relative; width: 100%; height: 100%;';
	wrapper.appendChild(ui);
	container.appendChild(wrapper);


	async function meshChange(meshGroup, degrees=0) {
		if (!meshGroup) return;
		removeMesh();

		const innerMesh = meshGroup.children.find(c => c.isMesh);

		globalMeshes = innerMesh;
		
		const cullMeshGroup = new THREE_ref.Group();
		cullMeshGroup.name = 'CullMeshGroup';
		
		const view_v = [ 0, -1, 0 ];
		
        cullMeshGroup.add(innerMesh);

		const sizeBox = new THREE_ref.Box3().setFromObject(cullMeshGroup);
		const size = sizeBox.getSize(new THREE_ref.Vector3());
		const maxDim = Math.max(size.x, size.y, size.z);

		const dimScale = Math.max(2.0 / maxDim, 2.0 / size.y);
		cullMeshGroup.scale.setScalar(dimScale);

		const positionBox = new THREE_ref.Box3().setFromObject(cullMeshGroup);
		cullMeshGroup.position.y = -positionBox.min.y;
		cullMeshGroup.rotation.y = Math.PI / 4;

		globalMeshGroup = cullMeshGroup;
		scene.add(cullMeshGroup);
	}


	function updateCamera() {
		if (!camera) return;
		const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
		const y = spherical.radius * Math.cos(spherical.phi);
		const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
		camera.position.set(x, y, z);
		camera.lookAt(0, 1.5, 0);
	}

	function updateWireframeVisibility() {
		if (!globalMeshGroup) return;
		const wfMeshes = [];
		globalMeshGroup.traverse(child => {
			if (child.isMesh && child.material?.wireframe) wfMeshes.push(child);
		});
		for (const m of wfMeshes) m.visible = showWireframe;
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
					'/api/proxy?url=https://graphics.stanford.edu/~mdfisher/Data/Meshes/bunny.obj',
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

        /*
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
        */
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