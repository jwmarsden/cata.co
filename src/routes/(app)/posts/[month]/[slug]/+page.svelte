<script lang="ts">
	let { data } = $props();
	import { Calendar, User, Tag } from 'lucide-svelte';
	import Giscus from '$lib/components/Giscus.svelte';
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="description" content={data.excerpt} />
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css" />
</svelte:head>

<section class="py-16">
	<div class="max-w-3xl mx-auto px-6">

		<a href="/posts" class="text-text-muted text-sm no-underline hover:text-amber">← Back to Posts</a>

		<h1 class="text-4xl font-bold text-ocean mt-4 mb-2">{data.title}</h1>

		<!-- Post meta -->
		<div class="flex items-center gap-2 text-sm text-[#888] mb-8 flex-wrap">
			<span class="flex items-center gap-1">
				<Calendar size={14} />
				{data.date ? new Date(data.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown date'}
			</span>
			<span class="text-[#ccc]">·</span>
			<span class="flex items-center gap-1">
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
			<span class="text-[#ccc]">·</span>
			<span class="flex items-center gap-1">
				<User size={14} />
				<a href="/author/{data.author}" class="text-text-muted no-underline hover:text-amber">{data.author}</a>
			</span>
		</div>

		<!-- Post content -->
		<div class="prose prose-lg max-w-none">
			{@html data.html}
		</div>

		<div class="divider mt-12"></div>

		<Giscus />

	</div>
</section>


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

	.prose :global(img) {
		border-radius: 1em;
		display: block;
		margin: 1.5rem auto;
		max-width: 100%;
		height: auto;
	}
</style>
