<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();
	let container: HTMLDivElement;

	onMount(async () => {
		try {
			const mod = await import(/* @vite-ignore */ data.scriptUrl);
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
	:global(body) { margin: 0; overflow: hidden; background: #1B3A4B; }
	.scene-container { width: 100vw; height: 100vh; }
</style>

<div class="scene-container" bind:this={container}></div>