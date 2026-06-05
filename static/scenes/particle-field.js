export const meta = {
	title: 'Particle Field',
	description: 'A field of floating particles.',
	height: 400,
};

/**
 * @param {HTMLElement} container
 */
export function init(container) {
	const script = document.createElement('script');
	script.type = 'importmap';
	script.textContent = JSON.stringify({
		imports: { 'three': 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js' }
	});
	document.head.appendChild(script);
	
	let animId = 0;

	import('three').then(THREE => {
		const w = container.clientWidth;
		const h = container.clientHeight;

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(w, h);
		renderer.setPixelRatio(window.devicePixelRatio);
		container.appendChild(renderer.domElement);

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0a0a1a);

		const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
		camera.position.z = 50;

		const count = 2000;
		const positions = new Float32Array(count * 3);
		for (let i = 0; i < count * 3; i++) {
			positions[i] = (Math.random() - 0.5) * 100;
		}

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		const material = new THREE.PointsMaterial({
			color: 0xE8F4F8,
			size: 0.3,
		});

		scene.add(new THREE.Points(geometry, material));

		let t = 0;
		function animate() {
			animId = requestAnimationFrame(animate);
			t += 0.001;
			camera.position.x = Math.sin(t) * 10;
			camera.position.y = Math.cos(t * 0.5) * 5;
			camera.lookAt(0, 0, 0);
			renderer.render(scene, camera);
		}
		animate();
	});

	return function cleanup() {
		cancelAnimationFrame(animId);
		container.innerHTML = '';
	};
}