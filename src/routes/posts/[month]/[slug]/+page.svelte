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
    .prose :global(h1) { 
        color: var(--color-text-layer1);
    }

    .prose :global(h2) { 
        color: var(--color-text-layer2);
    }

    .prose :global(h3) { 
        margin-top: 0.3em;
        margin-bottom: 0.3em;
        color: var(--color-text-layer3);
    }

    .prose :global(h4) { 
        margin-top: 0.5em;
        margin-bottom: 0.5em;
        color: var(--color-text-layer4);
    }
    .prose :global(h5) { 
        margin-top: 0.3em;
        margin-bottom: 0.3em;
        color: var(--color-text-layer5);
    }

    .prose :global(img) {
        background: none;
        border-radius: 1em;
        display: block; 
        margin-top: 0.5em;
        margin-bottom: 0.5em;
        margin-left: auto; 
        margin-right: auto;
    }

    /* External links get an arrow icon */
    .prose :global(a[href^="http"])::after,
    .prose :global(a[href^="https"])::after {
        content: '';
        display: inline-block;
        width: 0.75em;
        height: 0.75em;
        margin-left: 0.25em;
        vertical-align: middle;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/%3E%3Cpolyline points='15 3 21 3 21 9'/%3E%3Cline x1='10' y1='14' x2='21' y2='3'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-size: contain;
        opacity: 0.6;
    }

    /* Internal links get nothing, or a different icon */
    .prose :global(a[href^="/"]) {
        /* no icon for internal links */
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