<script lang="ts">

	import favicon from '$lib/assets/favicon.ico';
	import { page } from '$app/state';
	let { children } = $props();

</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com">
	<link href="https://fonts.googleapis.com/css2?family=ABeeZee:ital@0;1&display=swap" rel="stylesheet">
</svelte:head>

<nav id="top">
	<a href="https://cata.co" class="logo">CaTa</a>
	<ul>
		<li><a href="/" class:active={page.url.pathname === '/'}>Home</a></li>
		<li><a href="/posts" class:active={page.url.pathname.startsWith('/posts')}>Posts</a></li>
		<li><a href="/about" class:active={page.url.pathname === '/about'}>About</a></li>
	</ul>
</nav>

<style>
	:global(*) {
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
	}

	:global(#marker) {
		background: yellow;
		border: 4px solid red;
		width: 50px;
		height: 50px;
		border-radius: 50%;
		cursor: pointer;
	}

		
	/* --- Navigation --- */
	nav {
		background-color: var(--color-ocean);
		padding: 1rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: "ABeeZee", sans-serif;
		font-style: normal;
		text-decoration: none;
	}
	nav .logo {
		color: var(--color-amber);
		font-size: 1.5rem;
		font-weight: 800;
	}
	nav ul {
		list-style: none;
		display: flex;
		gap: 1.5rem;
		text-align: center;
	}
	nav ul a {
		color: var(--color-mist-dark);
		text-decoration: none;
		font-size: 0.9rem;
		transition: color 0.2s;
	}
		nav ul a:hover,
		nav ul a.active {
		color: var(--color-amber);
	}
</style>
{@render children()}
<footer>
<p>&copy; 2026 Cata.co | <a href="#top">Back to top</a></p>
</footer>
