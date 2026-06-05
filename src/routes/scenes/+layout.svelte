<script lang="ts">
	import favicon from '$lib/assets/favicon.ico';
	import Analytics from '$lib/components/Analytics.svelte';
	let { children } = $props();
</script>
<style>
	:global(body) { margin: 0; overflow: hidden; }
</style>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<Analytics />