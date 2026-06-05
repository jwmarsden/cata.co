<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();
    let container: HTMLDivElement;

	onMount(async () => {
		try {
			const mod = await import(/* @vite-ignore */ `/scenes/${data.name}.js`);
			const cleanup = mod.init(container);
			return cleanup;
		} catch (e) {
			console.error('Scene failed to load:', e);
			if (container) container.innerHTML = '<p style="color:white;padding:1rem;">Failed to load scene.</p>';
		}
	});
</script>

<svelte:head>
	<title>{data.name}</title>
</svelte:head>

<style>
	:global(body) { margin: 0; overflow: hidden; }
	.scene-container { width: 100vw; height: 100vh; }
</style>

<div class="scene-container" bind:this={container}></div>