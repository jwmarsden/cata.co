<script lang="ts">
	import { onMount } from 'svelte';
	import { signIn } from '@auth/sveltekit/client';
	import { resolve } from '$app/paths';
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
		if (!data.signedIn || !root) return;
		const { startWeb } = await import('$lib/moomoo/web/web.js');
		await startWeb({
			root,
			// the relay connects by name; host and port are only shown
			worlds: data.worlds.map((w) => ({ ...w, tls: false, login: '' })),
			open,
			hint: 'Log in with: connect <name> <password>',
		});
	});
</script>

<svelte:head>
	<title>MooMoo</title>
</svelte:head>

{#if data.signedIn}
	<div bind:this={root}></div>
{:else}
	<main class="moo-signin">
		<h1>MooMoo</h1>
		<p>A MOO client, with SMud graphics. Sign in with GitHub to use it.</p>
		<button onclick={() => signIn('github', { callbackUrl: '/moo' })}>Sign in with GitHub</button>
		<p><a href={resolve('/')} data-sveltekit-reload>cata.co</a></p>
	</main>
{/if}

<style>
	.moo-signin {
		max-width: 26rem; margin: 6rem auto; padding: 0 16px; text-align: center;
		font: 15px system-ui, sans-serif;
	}
	.moo-signin button { padding: 8px 18px; font-size: 15px; }
</style>
