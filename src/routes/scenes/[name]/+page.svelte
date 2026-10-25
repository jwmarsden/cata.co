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
	import { Maximize, Minimize } from 'lucide-svelte';

	let { data } = $props();
	let container: HTMLDivElement;

	// Fullscreen toggle. Escape is handled by the browser; listening for
	// fullscreenchange keeps the icon right however fullscreen ends.
	let canFullscreen = $state(false);
	let isFullscreen = $state(false);

	function toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			document.documentElement.requestFullscreen().catch((e) => {
				console.warn('Fullscreen request failed:', e);
			});
		}
	}

	onMount(() => {
		canFullscreen = document.fullscreenEnabled;
		const onFullscreenChange = () => (isFullscreen = !!document.fullscreenElement);
		document.addEventListener('fullscreenchange', onFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
	});

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

	.fullscreen-toggle {
		position: fixed; top: 12px; right: 12px; z-index: 10;
		display: flex; align-items: center; justify-content: center;
		width: 32px; height: 32px; padding: 0;
		background: rgba(27,58,75,0.9);
		color: #E8F4F8;
		border: 1px solid #C8DDE6;
		border-radius: 6px;
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s;
	}

	.fullscreen-toggle:hover { color: #F2A65A; border-color: #F2A65A; }
</style>

<div class="scene-container" bind:this={container}></div>

{#if canFullscreen}
	<button
		class="fullscreen-toggle"
		onclick={toggleFullscreen}
		title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
		aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
	>
		{#if isFullscreen}<Minimize size={16} />{:else}<Maximize size={16} />{/if}
	</button>
{/if}
