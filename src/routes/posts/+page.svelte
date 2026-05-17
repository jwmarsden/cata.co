<script lang="ts">
	let { data } = $props();
</script>

<section>
	<div class="container">
		<h1 class="mb-4">Cata Posts</h1>
		{#each data.posts as post}
			<div class="card mb-4">
				<h2><a href="/posts/{post.slug}">{post.title}</a></h2>
				{#if post.date}
					<p class="text-muted" style="font-size: 0.85rem;">
						{new Date(post.date).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
					</p>
				{/if}
				{#if post.excerpt}
					<p>{post.excerpt}</p>
				{/if}
				<a href="/posts/{post.slug}">Read more →</a>
			</div>
		{/each}

		{#if data.posts.length === 0}
			<p class="text-muted">No posts yet.</p>
		{/if}
	</div>
</section>