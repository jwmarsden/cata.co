<script lang="ts">
	let { data } = $props();
</script>

<section class="py-16">
	<div class="max-w-3xl mx-auto px-6">
		<h1 class="text-4xl font-bold text-ocean mb-10">Posts</h1>

		{#if data.posts.length === 0}
			<p class="text-text-muted">No posts yet.</p>
		{:else}
			<div class="flex flex-col gap-6">
				{#each data.posts as post}
					<div class="card bg-mist border border-mist-dark hover:border-amber transition-colors">
						<div class="card-body">
							{#if post.date}
								<p class="text-text-muted text-xs mb-1">
									{new Date(post.date).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
								</p>
							{/if}
							<h2 class="card-title text-ocean">
								<a href="/posts/{post.slug}" class="no-underline hover:text-amber">{post.title}</a>
							</h2>
							{#if post.excerpt}
								<p class="text-text-muted">{post.excerpt}</p>
							{/if}
							<div class="card-actions mt-2">
								<a href="/posts/{post.slug}" class="text-ocean text-sm font-semibold no-underline hover:text-amber">
									Read more →
								</a>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>