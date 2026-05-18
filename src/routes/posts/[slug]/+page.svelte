<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="description" content={data.excerpt} />
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css" />
</svelte:head>

<section>
	<div class="container" style="max-width: 800px;">
		<a href="/posts" class="text-muted" style="font-size: 0.9rem;">← Back to Posts</a>
		<h1 class="mb-2" style="margin-top: 1rem;">{data.title}</h1>
		{#if data.date}
			<p class="text-muted" style="font-size: 0.85rem; margin-bottom: 2rem;">
				{new Date(data.date).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
			</p>
		{/if}
		<div class="prose">
			{@html data.html}
		</div>
        
	</div>
</section>

<style>
	/* .prose is scoped to this component */
	/* but its children are raw HTML so we need :global() inside it */
	.prose :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1.5rem;
		font-size: 0.95em;
	}

    .prose :global(code) {
        background: none;
        padding: 0;
        border-radius: 0;
        font-size: 1em;
    }

    .prose :global(table) {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 1.5rem;
        font-size: 0.95em;
    }

    .prose :global(thead) {
        background-color: var(--color-ocean, #2a6b8a);
        color: white;
    }

    .prose :global(th) {
        text-align: left;
        padding: 0.6rem 1rem;
        font-weight: 600;
        border: 1px solid var(--color-border, #ddd);
    }

    .prose :global(td) {
        padding: 0.6rem 1rem;
        border: 1px solid var(--color-border, #ddd);
        vertical-align: top;
    }

    .prose :global(tbody tr:nth-child(even)) {
        background-color: var(--color-mist, #f0f4f7);
    }

    .prose :global(tbody tr:hover) {
        background-color: var(--color-hover, #e6eef3);
    }
</style>