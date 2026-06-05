export const meta = {
	title: 'Rotating Cube',
	description: 'A simple rotating cube with lambert shading.',
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
		scene.background = new THREE.Color(0xAAAAAA);

		const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
		camera.position.z = 3;

		const geometry = new THREE.BoxGeometry();
		const material = new THREE.MeshLambertMaterial({ color: 0xF2A65A });
		const cube = new THREE.Mesh(geometry, material);
		scene.add(cube);

		const light = new THREE.DirectionalLight(0xffffff, 2);
		light.position.set(2, 3, 4);
		scene.add(light);
		scene.add(new THREE.AmbientLight(0xffffff, 0.4));

		function animate() {
			animId = requestAnimationFrame(animate);
			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;
			renderer.render(scene, camera);
		}
		animate();
	});

	return function cleanup() {
		cancelAnimationFrame(animId);
		container.innerHTML = '';
	};
}