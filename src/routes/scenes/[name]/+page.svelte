<svelte:head>
	<script type="importmap">
		{
			"imports": {
				"three": "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js",
				"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"
			}
		}
	</script>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();
	let container: HTMLDivElement;

	onMount(async () => {
		try {
			// Always load via your own server, never direct bucket URL
			const scriptUrl = `/api/scenes/${data.name}/script`;
			const mod = await import(/* @vite-ignore */ scriptUrl);
			const cleanup = mod.init(container);
			return cleanup;
		} catch (e) {
			console.error('Scene failed to load:', e);
			if (container) {
				container.innerHTML = '<p style="color:white;padding:1rem;">Failed to load scene.</p>';
			}
		}
	});
</script>

<style>
	.scene-container { width: 100vw; height: 100vh; }
</style>

<div class="scene-container" bind:this={container}></div>