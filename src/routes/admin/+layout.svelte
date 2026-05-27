<script lang="ts">
	import { signOut } from '@auth/sveltekit/client';
	let { children, data } = $props();
</script>

<nav id="top" style="background: var(--color-ocean); padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between;">
	<span style="color: var(--color-amber); font-size: 1.2rem; font-weight: 700;">CaTa Admin</span>
	<div style="display: flex; gap: 1.5rem; align-items: center;">
		<a href="/admin" style="color: var(--color-mist-dark); font-size: 0.9rem;">Dashboard</a>
		<a href="/admin/media" style="color: var(--color-mist-dark); font-size: 0.9rem;">Media</a>
		<a href="/admin/posts" style="color: var(--color-mist-dark); font-size: 0.9rem;">Posts</a>
		<button
			onclick={() => signOut({ callbackUrl: '/' })}
			style="font-size: 0.85rem; color: var(--color-mist-dark); background: none; border: none; cursor: pointer;">
			Sign out
		</button>
	</div>
</nav>

<main>
	{@render children()}
</main>