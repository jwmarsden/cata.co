<script lang="ts">
	import { onMount } from 'svelte';
	import '$lib/moomoo/frontend/style.css';
	import '$lib/moomoo/web/web.css';

	let { data } = $props();
	let root: HTMLElement | undefined = $state();

	// A WebSocket to the relay, open and ready, for one world.
	async function open(world: { name: string }) {
		const res = await fetch('/moo/ticket', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ world: world.name }),
		});
		if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? res.statusText);
		const { ticket } = await res.json();
		const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
		const ws = new WebSocket(`${proto}//${location.host}/moo/relay?ticket=${ticket}`);
		ws.binaryType = 'arraybuffer';
		await new Promise((resolve, reject) => {
			ws.addEventListener('open', resolve, { once: true });
			ws.addEventListener('close', () => reject(new Error('the relay turned us away')), { once: true });
		});
		return ws;
	}

	onMount(async () => {
		if (!root) return;
		const { startWeb } = await import('$lib/moomoo/web/web.js');
		await startWeb({
			root,
			// the relay connects by name; host and port are only shown
			worlds: data.worlds.map((w) => ({ ...w, tls: false, login: '' })),
			open,
			hint: 'Log in with: connect <name> <password>',
			// the site's colours first; the desktop app's dark ones to pick
			themes: ['cata', 'tokyo-night'],
		});
	});
</script>

<svelte:head>
	<title>MooMoo</title>
	<!-- the Cata theme's fonts, as the rest of the site has them -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,600;0,700;1,400&family=DM+Mono&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div bind:this={root}></div>
