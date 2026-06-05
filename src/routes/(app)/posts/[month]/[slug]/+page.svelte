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
