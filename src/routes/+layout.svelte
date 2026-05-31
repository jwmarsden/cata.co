<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=ABeeZee:ital@0;1&display=swap" rel="stylesheet">

<script lang="ts">
	import '../styles/palette.css';
	import favicon from '$lib/assets/favicon.ico';
	import { page } from '$app/state';
	import { House, BookOpen, Info } from 'lucide-svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,600;0,700;1,400&family=DM+Mono&display=swap" rel="stylesheet">
</svelte:head>

<div data-theme="cata" class="min-h-screen flex flex-col">
<nav class="bg-ocean px-6 py-3 flex items-center justify-between">
	<a href="/" class="logo">CaTa</a>
	<ul class="flex items-center gap-6 list-none m-0 p-0">
		<li>
			<a href="/" class:active={page.url.pathname === '/'} class="flex items-center gap-1.5 text-sm">
				<House size={14} />Home
			</a>
		</li>
		<li>
			<a href="/posts" class:active={page.url.pathname.startsWith('/posts')} class="flex items-center gap-1.5 text-sm">
				<BookOpen size={14} />Posts
			</a>
		</li>
		<li>
			<a href="/about" class:active={page.url.pathname === '/about'} class="flex items-center gap-1.5 text-sm">
				<Info size={14} />About
			</a>
		</li>
	</ul>
</nav>

<main>
	{@render children()}
</main>

<footer>
	<p>&copy; 2026 Cata.co | <a href="#top">Back to top</a></p>
</footer>
</div>

