<script lang="ts">
	import { onMount } from 'svelte';
	import { Calendar, User, Tag } from 'lucide-svelte';
	import Giscus from '$lib/components/Giscus.svelte';

	let { data } = $props();

	let activeId = $state('');

	onMount(() => {
		// Immediately set activeId on TOC link click
		function handleTocClick(e: MouseEvent) {
			const link = (e.target as HTMLElement).closest('a[href^="#"]');
			if (!link) return;
			const id = link.getAttribute('href')?.slice(1);
			if (id) activeId = id;
		}

		document.addEventListener('click', handleTocClick);

		// More generous rootMargin — heading becomes active when it crosses the top third
		const observer = new IntersectionObserver(
			(entries) => {
				// Find the topmost visible heading
				const visible = entries
					.filter(e => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

				if (visible.length > 0) {
					activeId = visible[0].target.id;
				}
			},
			{
				rootMargin: '-5% 0% -50% 0%',
				threshold: 0,
			}
		);

		document.querySelectorAll('.article-content h2, .article-content h3').forEach(el => {
			observer.observe(el);
		});

		return () => {
			observer.disconnect();
			document.removeEventListener('click', handleTocClick);
		};
	});
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="description" content={data.excerpt} />
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css" />
</svelte:head>

<div class="max-w-6xl mx-auto px-6 py-16 flex gap-12">

	<!-- Main content -->
	<article class="flex-1 min-w-0">
		<h1 class="text-4xl font-bold text-ocean mt-4 mb-2">{data.title}</h1>

		<!-- Meta -->
		<div class="flex items-center gap-2 text-sm text-text-muted mb-8 flex-wrap">
			<span class="flex items-center gap-1">
				<Calendar size={14} />
				{data.date ? new Date(data.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown date'}
			</span>
			<span class="text-mist-dark">·</span>
			<span class="flex items-center gap-1">
				<User size={14} />
				<a href="/author/{data.author}" class="no-underline hover:text-amber">{data.author}</a>
			</span>
			{#if data.tags.length > 0}
				<span class="text-mist-dark">·</span>
				<span class="flex items-center gap-1 flex-wrap">
					<Tag size={14} />
					{#each data.tags as tag}
						<a
							href="/tag/{tag}"
							class="bg-mist text-ocean text-xs px-2 py-0.5 rounded-full no-underline transition-colors hover:bg-ocean hover:text-mist"
						>
							{tag}
						</a>
					{/each}
				</span>
			{/if}
		</div>

		<!-- Article body -->
		<div class="prose prose-md max-w-none article-content text-justify" style="word-break: break-word; text-justify: inter-word; text-align: justify; -webkit-hyphens: auto; -ms-hyphens: auto; hyphens: auto; word-break: break-word; ">
			{@html data.html}
		</div>
	</article>

	<!-- Floating TOC sidebar -->
	{#if data.toc.length > 0}
		<aside class="hidden lg:block w-56 shrink-0 border-l border-mist-dark/50 pl-6">
			<div class="sticky top-8">
				<p class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
					Contents
				</p>
				<div class="flex flex-col gap-1">
					{#each data.toc as entry}
						<a
							href="#{entry.id}"
							class="text-sm no-underline transition-colors leading-snug py-0.5
								{entry.level === 3 ? 'pl-4 text-xs' : 'font-medium'}
								{activeId === entry.id ? 'text-amber' : 'text-text-muted hover:text-ocean'}"
						>
							{entry.title}
						</a>
					{/each}
				</div>
			</div>
		</aside>
	{/if}

</div>

<style>
	/* External links */
	.prose :global(a[href^="http"]),
	.prose :global(a[href^="https"]) {
		color: var(--color-ocean);
		text-decoration: underline;
		text-decoration-color: var(--color-amber);
		text-underline-offset: 3px;
		transition: color 0.2s, background 0.2s;
		border-radius: 3px;
		padding: 0 2px;
	}

	.prose :global(a[href^="http"]:hover),
	.prose :global(a[href^="https"]:hover) {
		color: var(--color-amber);
		background: rgba(242, 166, 90, 0.1);
	}

	.prose :global(a[href^="http"])::after,
	.prose :global(a[href^="https"])::after {
		content: '';
		display: inline-block;
		width: 0.7em;
		height: 0.7em;
		margin-left: 0.2em;
		vertical-align: middle;
		opacity: 0.6;
		transition: opacity 0.2s;
		mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/%3E%3Cpolyline points='15 3 21 3 21 9'/%3E%3Cline x1='10' y1='14' x2='21' y2='3'/%3E%3C/svg%3E");
		-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/%3E%3Cpolyline points='15 3 21 3 21 9'/%3E%3Cline x1='10' y1='14' x2='21' y2='3'/%3E%3C/svg%3E");
		mask-repeat: no-repeat;
		-webkit-mask-repeat: no-repeat;
		mask-size: contain;
		-webkit-mask-size: contain;
		background-color: currentColor;
	}

	.prose :global(a[href^="http"]:hover)::after,
	.prose :global(a[href^="https"]:hover)::after {
		opacity: 1;
	}

	/* Internal links — subtle underline, no arrow */
	.prose :global(a[href^="/"]) {
		color: var(--color-ocean);
		text-decoration: underline;
		text-decoration-color: var(--color-amber);
		text-underline-offset: 3px;
		transition: color 0.2s;
	}

	.prose :global(a[href^="/"]:hover) {
		color: var(--color-amber);
	}
</style>
