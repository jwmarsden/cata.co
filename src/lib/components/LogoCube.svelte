<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';

	let container: HTMLDivElement;

	onMount(() => {
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		let renderer: THREE.WebGLRenderer;
		try {
			renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
		} catch {
			return;
		}

		const size = 26;
		renderer.setSize(size, size);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		container.appendChild(renderer.domElement);

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
		camera.position.set(1.5, 1.25, 1.75);
		camera.lookAt(0, 0, 0);

		// Light shades close to the site's amber accent (#F2A65A), one per cube face.
		const shades = [0xf2a65a, 0xf5b978, 0xf7c68f, 0xf9d3a6, 0xfbdfbc, 0xfdebd3];
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const materials = shades.map((color) => new THREE.MeshLambertMaterial({ color }));
		const cube = new THREE.Mesh(geometry, materials);
		scene.add(cube);

		const edges = new THREE.LineSegments(
			new THREE.EdgesGeometry(geometry),
			new THREE.LineBasicMaterial({ color: 0x1b3a4b, transparent: true, opacity: 0.35 })
		);
		cube.add(edges);

		scene.add(new THREE.AmbientLight(0xffffff, 0.75));
		const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
		dirLight.position.set(2, 3, 4);
		scene.add(dirLight);

		let frameId: number;
		function animate() {
			if (!reduceMotion) {
				cube.rotation.x += 0.008;
				cube.rotation.y += 0.012;
			}
			renderer.render(scene, camera);
			frameId = requestAnimationFrame(animate);
		}
		animate();

		return () => {
			cancelAnimationFrame(frameId);
			geometry.dispose();
			materials.forEach((m) => m.dispose());
			edges.geometry.dispose();
			(edges.material as THREE.Material).dispose();
			renderer.dispose();
			container.removeChild(renderer.domElement);
		};
	});
</script>

<div bind:this={container} class="logo-cube" aria-hidden="true"></div>

<style>
	.logo-cube {
		width: 26px;
		height: 26px;
		display: inline-block;
		line-height: 0;
		vertical-align: middle;
	}
</style>
