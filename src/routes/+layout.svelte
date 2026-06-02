<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=ABeeZee:ital@0;1&display=swap" rel="stylesheet">

<script lang="ts">
	import '../styles/palette.css';
	import favicon from '$lib/assets/favicon.ico';
	import { page } from '$app/state';
	import { House, BookOpen, Info, Menu, KeySquare } from 'lucide-svelte';
	import Analytics from '$lib/components/Analytics.svelte';
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
		<li class="dropdown dropdown-end">
			<button tabindex="0" class="flex items-center cursor-pointer bg-transparent border-none p-1 text-mist-dark hover:text-amber">
				<Menu size={18} />
				<!-- or: <MoreHorizontal size={18} /> -->
			</button>
			<ul class="dropdown-content menu bg-ocean border border-mist-dark rounded-lg shadow-lg mt-1 w-36 p-1 z-50">
				<li><a href="/about"><Info size={14} />About</a></li>
				<li><a href="/admin"><KeySquare size={14} />Admin</a></li>
			</ul>
		</li>
	</ul>
</nav>

<main>
	{@render children()}
</main>

<footer>
	<p>&copy; 2026 Cata.co | <a href="#top">Back to top</a></p>
</footer>

<Analytics />
</div>

