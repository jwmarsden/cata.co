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

		<div class="divider mt-12"></div>
	</article>

	<!-- Floating TOC sidebar -->
	{#if data.toc.length > 0}
		<aside class="hidden lg:block w-56 shrink-0">
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
