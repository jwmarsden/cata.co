export const meta = {
	title: 'Vector Demo',
	description: 'An interactive mesh with a labelled vector, following the right-hand rule.',
	height: 500,
};

export function init(container) {
	const script = document.createElement('script');
	script.type = 'importmap';
	script.textContent = JSON.stringify({
		imports: { 
            'three': 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js'
         }
	});
	document.head.appendChild(script);
	
	let animId = 0;
	let renderer, scene, camera;
	let isDragging = false;
	let previousMouse = { x: 0, y: 0 };
	let spherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 8 };

	import('three').then(THREE => {
		const w = container.clientWidth;
		const h = container.clientHeight;

		// Renderer
		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(w, h);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.shadowMap.enabled = true;
		container.appendChild(renderer.domElement);

		// Scene
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x1B3A4B);

		// Camera — right-hand rule: x right, y up, z toward viewer
		camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
		updateCamera();

		// Lighting
		scene.add(new THREE.AmbientLight(0xffffff, 0.5));
		const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
		dirLight.position.set(5, 8, 5);
		dirLight.castShadow = true;
		scene.add(dirLight);

		// Axes helper — x=red, y=green, z=blue
		const axes = new THREE.AxesHelper(2);
		scene.add(axes);

		// Axis labels
		addAxisLabel(THREE, scene, 'x', new THREE.Vector3(2.3, 0, 0), '#ff4444');
		addAxisLabel(THREE, scene, 'y', new THREE.Vector3(0, 2.3, 0), '#44ff44');
		addAxisLabel(THREE, scene, 'z', new THREE.Vector3(0, 0, 2.3), '#4488ff');

		// Mesh — icosahedron
		//const geometry = new THREE.IcosahedronGeometry(1, 2);
		//const material = new THREE.MeshPhongMaterial({
		//	color: 0xF2A65A,
		//	shininess: 60,
		//	wireframe: false,
		//});
		//const mesh = new THREE.Mesh(geometry, material);
		//mesh.castShadow = true;
		//scene.add(mesh);

        const geometry = new tp( 50, 18 );
        const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
        const teapot = new THREE.Mesh( geometry, material );
        scene.add( teapot );

		// Wireframe overlay
		const wireMat = new THREE.MeshBasicMaterial({ color: 0x1B3A4B, wireframe: true, transparent: true, opacity: 0.3 });
		scene.add(new THREE.Mesh(geometry, wireMat));

		// Vector arrow v = [0, -1, 0] starting above the mesh
		const arrowOrigin = new THREE.Vector3(0, 3.5, 0);
		const arrowDir = new THREE.Vector3(0, -1, 0);
		const arrowLength = 1;
		const arrowColor = 0xE8F4F8;
		const arrow = new THREE.ArrowHelper(arrowDir, arrowOrigin, arrowLength, arrowColor, 0.3, 0.15);
		scene.add(arrow);

		// Vector label — rendered as a canvas texture
		addVectorLabel(THREE, scene, 'v_{view}', new THREE.Vector3(0.35, 3.5, 0));

		// Grid
		const grid = new THREE.GridHelper(6, 6, 0x2a5a6a, 0x2a5a6a);
		grid.position.y = -1.2;
		scene.add(grid);

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

		function onMouseUp() { 
            isDragging = false; 
        }

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

	function updateCamera() {
		const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
		const y = spherical.radius * Math.cos(spherical.phi);
		const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
		if (camera) {
			camera.position.set(x, y, z);
			camera.lookAt(0, 0.5, 0);
		}
	}

	function addAxisLabel(THREE, scene, text, position, color) {
		const canvas = document.createElement('canvas');
		canvas.width = 64;
		canvas.height = 64;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = color;
		ctx.font = 'bold 48px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(text, 32, 32);
		const texture = new THREE.CanvasTexture(canvas);
		const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
		const sprite = new THREE.Sprite(mat);
		sprite.position.copy(position);
		sprite.scale.set(0.4, 0.4, 1);
		scene.add(sprite);
	}

	function addVectorLabel(THREE, scene, text, position) {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 64;
		const ctx = canvas.getContext('2d');

		ctx.fillStyle = 'rgba(27, 58, 75, 0.85)';
		ctx.beginPath();
		ctx.roundRect(4, 4, 120, 56, 12);
		ctx.fill();

		ctx.fillStyle = '#E8F4F8';
		ctx.font = 'italic bold 28px serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('v', 28, 28);

		ctx.font = 'italic 20px serif';
		ctx.fillText('view', 80, 36);

		const texture = new THREE.CanvasTexture(canvas);
		const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
		const sprite = new THREE.Sprite(mat);
		sprite.position.copy(position);
		sprite.scale.set(1.2, 0.6, 1);
		scene.add(sprite);
	}
}