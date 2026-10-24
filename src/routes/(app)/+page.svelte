<script lang="ts">
	import TagCloud from '$lib/components/TagCloud.svelte';

	interface PageData {
		tags: { name: string; occurrences: number; instances: { type: string; url: string; description: string }[] }[];
	}

	let { data } = $props<{ data: PageData }>();
</script>

<section class="pt-6 pb-3">
	<div class="max-w-5xl mx-auto px-6 text-center">
		<h1 class="text-3xl font-bold text-ocean mb-2">Very Humble Beginnings for <span class="logo">CaTa</span></h1>
		<p class="text-text-muted">A clean start with a calm ocean, mist, and amber palette.</p>
	</div>
</section>

<hr class="h-px w-[calc(100%-3rem)] max-w-3xl mx-auto my-3 bg-mist-dark border-0">

<section class="pt-3 pb-8">
	<div class="max-w-5xl mx-auto px-6">
		<h2 class="text-2xl font-bold text-ocean mb-3">Featured</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">

			<div class="card bg-mist border border-mist-dark">
				<div class="card-body p-5">
					<div class="badge bg-ocean text-mist border-none mb-2">New</div>
					<h3 class="card-title text-ocean mb-2">Fast Tags!</h3>
					{#if data.tags.length === 0}
						<p class="text-text-muted text-sm">No tags yet.</p>
					{:else}
						<TagCloud tags={data.tags} />
					{/if}
				</div>
			</div>

			<div class="card bg-mist border border-mist-dark border-l-4 border-l-amber">
				<div class="card-body p-5">
					<div class="badge bg-amber text-ocean border-none mb-2">Featured Article</div>
					<h3 class="card-title text-ocean">Occlusion Culling</h3>
					<p class="text-text-muted">Learn about the process of occlusion culling in computer graphics.</p>
					<img src="/api/media/af1b0915-393a-44c8-82c5-53ec4421ca22/view" alt="Occlusion Cull" width="200" class="feature border-l-amber"/>
					<div class="card-actions mt-2">
						<a href="articles/graphics/occlusion-culling">Read more →</a>
					</div>
				</div>
			</div>

			<div class="card bg-mist border border-mist-dark">
				<div class="card-body p-5">
					<div class="badge bg-ocean text-mist border-none mb-2">Latest Post</div>
					<h3 class="card-title text-ocean">Posting</h3>
					<p class="text-text-muted"><span class="logo">CaTa</span>.co has ground to a halt. What else is going on?</p>
					<img src="/images/train-crash.svg" alt="A train running off the broken end of its track" width="200" class="feature"/>
					<div class="card-actions mt-2">
						<a href="/posts/202610/salvage-story">Read more →</a>
					</div>
				</div>
			</div>



		</div>
	</div>
</section>

<hr class="h-px w-[calc(100%-3rem)] max-w-3xl mx-auto my-4 bg-mist-dark border-0">

<style>
	.feature {
		border-radius: 1em;
		display: block;
		margin: 1rem auto;
		max-width: 100%;
		height: auto;
	}
</style>