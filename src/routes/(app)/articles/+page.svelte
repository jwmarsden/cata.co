<script lang="ts">
	let { data } = $props();
</script>

<section class="py-16">
	<div class="max-w-3xl mx-auto px-6">
		<h1 class="text-4xl font-bold text-ocean mb-2">Articles</h1>
		<p class="text-text-muted mb-10">Long-form writing on topics I find interesting.</p>

		{#if data.articles.length === 0}
			<p class="text-text-muted">No articles yet.</p>
		{:else}
			<div class="flex flex-col gap-6">
				{#each data.articles as article}
					<div class="card bg-mist border border-mist-dark hover:border-amber transition-colors">
						<div class="card-body">
							{#if article.date}
								<p class="text-text-muted text-xs mb-1">
									{new Date(article.date).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
								</p>
							{/if}
							<h2 class="card-title text-ocean">
								<a href="/articles/{article.month}/{article.slug}" class="no-underline hover:text-amber">
									{article.title}
								</a>
							</h2>
							{#if article.excerpt}
								<p class="text-text-muted">{article.excerpt}</p>
							{/if}
							{#if article.tags.length > 0}
								<div class="flex flex-wrap gap-1 mt-1">
									{#each article.tags as tag}
										<a href="/tag/{tag}" class="badge bg-ocean text-mist border-none text-xs no-underline hover:bg-amber hover:text-ocean transition-colors">
											#{tag}
										</a>
									{/each}
								</div>
							{/if}
							<div class="card-actions mt-2">
								<a href="/articles/{article.month}/{article.slug}" class="text-ocean text-sm font-semibold no-underline hover:text-amber">
									Read article →
								</a>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>