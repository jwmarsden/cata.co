<script lang="ts">
	let { data } = $props();

	const TYPE_LABELS: Record<string, string[]> = {
		post: ['Post','Posts'],
		page: ['Page','Pages'],
		project: ['Project','Projects'],
		media: ['Media','Media'],
		article: ['Article','Articles'],
	};

	const grouped = $derived(
		data.tag.instances.reduce((acc: Record<string, typeof data.tag.instances>, instance) => {
			const key = instance.type || 'other';
			if (!acc[key]) acc[key] = [];
			acc[key].push(instance);
			return acc;
		}, {})
	);
</script>

<svelte:head>
	<title>#{data.tag.name}</title>
	<meta name="description" content="All content tagged with {data.tag.name}" />
</svelte:head>

<section class="py-16">
	<div class="max-w-3xl mx-auto px-6">

		<!-- Header -->
		<a href="/posts" class="text-text-muted text-sm no-underline hover:text-amber">← Back to Posts</a>

		<div class="flex items-center gap-4 mt-4 mb-8">
			<h1 class="text-4xl font-bold text-ocean">#{data.tag.name}</h1>
			<div class="badge bg-amber text-ocean border-none text-sm px-3 py-3">
				{data.tag.occurrences} {data.tag.occurrences === 1 ? 'occurrence' : 'occurrences'}
			</div>
		</div>

		<!-- Instances -->
		{#if data.tag.instances.length === 0}
			<p class="text-text-muted">No content tagged with this tag yet.</p>
		{:else}
			{#each Object.entries(grouped) as [type, instances]}
				<div class="mb-8">
					<!-- Type heading -->
					<h2 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
						{TYPE_LABELS[type][1] ?? type + 's'}
					</h2>

					<div class="flex flex-col gap-3">
						{#each instances as instance}
							<div class="card bg-mist border border-mist-dark hover:border-amber transition-colors">
								<div class="card-body py-4">
									<div class="flex items-start justify-between gap-4">
										<div>
											<a
												href={instance.url}
												class="font-semibold text-ocean no-underline hover:text-amber transition-colors"
											>
												{instance.description}
											</a>
											<p class="text-text-muted text-sm mt-1">{instance.url}</p>
										</div>
										<div class="badge bg-ocean text-mist border-none shrink-0">
											{TYPE_LABELS[instance.type][0] ?? instance.type}
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		{/if}

	</div>
</section>