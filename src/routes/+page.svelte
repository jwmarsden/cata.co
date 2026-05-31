<script lang="ts">
	import TagCloud from '$lib/components/TagCloud.svelte';

	interface PageData {
		tags: { name: string; occurrences: number; instances: { type: string; url: string; description: string }[] }[];
	}

	let { data } = $props<{ data: PageData }>();
</script>

<section class="py-16">
	<div class="max-w-5xl mx-auto px-6 text-center">
		<h1 class="text-4xl font-bold text-ocean mb-3">Very Humble Beginnings for CaTa</h1>
		<p class="text-text-muted">A clean start with a calm ocean, mist, and amber palette.</p>
	</div>
</section>

<hr class="h-px w-188 mx-auto my-8 bg-mist-dark border-0 ">

<section class="py-16">
	<div class="max-w-5xl mx-auto px-6">
		<h2 class="text-2xl font-bold text-ocean mb-8">Featured</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">

			<div class="card bg-mist border border-mist-dark">
				<div class="card-body">
					<div class="badge bg-ocean text-mist border-none mb-2">New</div>
					<h3 class="card-title text-ocean mb-4">Fast Tags!</h3>
					{#if data.tags.length === 0}
						<p class="text-text-muted text-sm">No tags yet.</p>
					{:else}
						<TagCloud tags={data.tags} />
					{/if}
				</div>
			</div>

			<div class="card bg-mist border border-mist-dark">
				<div class="card-body">
					<div class="badge bg-ocean text-mist border-none mb-2">New</div>
					<h3 class="card-title text-ocean">Check in!</h3>
					<p class="text-text-muted">Check in with CaTa!</p>
					<div class="card-actions mt-2">
						<a href="/about">Read more →</a>
					</div>
				</div>
			</div>

			<div class="card bg-mist border border-mist-dark border-l-4 border-l-amber">
				<div class="card-body">
					<div class="badge bg-amber text-ocean border-none mb-2">Featured</div>
					<h3 class="card-title text-ocean">Posting</h3>
					<p class="text-text-muted">Finally, I have a post! Its simple, but good to have on the board.</p>
					<div class="card-actions mt-2">
						<a href="/posts/202605/hello-world">Read more →</a>
					</div>
				</div>
			</div>



		</div>
	</div>
</section>

<hr class="h-px w-188 mx-auto my-8 bg-mist-dark border-0">