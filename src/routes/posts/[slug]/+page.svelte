<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="description" content={data.excerpt} />
</svelte:head>

<section>
	<div class="container" style="max-width: 680px;">
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