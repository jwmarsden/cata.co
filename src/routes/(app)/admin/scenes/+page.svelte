<script lang="ts">
	let { data } = $props();

	const TEMPLATES = [
		{ name: 'rotating-cube', label: 'Rotating Cube' },
		{ name: 'particle-field', label: 'Particle Field' },
	];

	let newName = $state('');
	let selectedTemplate = $state('rotating-cube');
	let creating = $state(false);
	let error = $state('');

	async function createScene() {
		if (!newName.trim()) return;
		creating = true;
		error = '';
		try {
			const res = await fetch('/api/scenes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName.trim(), template: selectedTemplate }),
			});
			if (!res.ok) throw new Error('Failed to create scene');
			window.location.href = `/admin/scenes/${newName.trim()}`;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create scene';
		} finally {
			creating = false;
		}
	}
</script>

<section class="py-8">
	<div class="max-w-4xl mx-auto px-6">
		<h1 class="text-3xl font-bold text-ocean mb-6">Scenes</h1>

		<!-- Create new -->
		<div class="card bg-mist border border-mist-dark mb-8">
			<div class="card-body">
				<h2 class="card-title text-ocean text-lg mb-4">New Scene</h2>
				<div class="flex flex-col gap-3 max-w-sm">
					<label class="text-sm font-semibold text-ocean" for="scene-name">
						Scene name (used in markdown)
						<input
							id="scene-name"
							type="text"
							class="input input-bordered w-full mt-1"
							bind:value={newName}
							placeholder="e.g. my-scene"
						/>
					</label>
					<label class="text-sm font-semibold text-ocean" for="scene-template">
						Start from template
						<select id="scene-template" class="select select-bordered w-full mt-1" bind:value={selectedTemplate}>
							{#each TEMPLATES as t}
								<option value={t.name}>{t.label}</option>
							{/each}
							<option value="blank">Blank</option>
						</select>
					</label>
					{#if error}
						<div class="alert alert-error text-sm"><span>{error}</span></div>
					{/if}
					<button
						class="btn bg-amber text-ocean border-none hover:bg-amber/80"
						onclick={createScene}
						disabled={creating || !newName.trim()}
					>
						{creating ? 'Creating...' : 'Create scene'}
					</button>
				</div>
			</div>
		</div>

		<!-- Existing scenes -->
		{#if data.scenes.length === 0}
			<p class="text-text-muted">No scenes yet.</p>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
				{#each data.scenes as scene}
					<div class="card bg-white border border-mist-dark hover:border-amber transition-colors">
						<div class="card-body py-4">
							<h3 class="font-semibold text-ocean">{scene.name}</h3>
							<p class="text-xs text-text-muted font-mono mt-1">![[scene:{scene.name}]]</p>
							<div class="flex gap-2 mt-3">
								<a
									href="/admin/scenes/{scene.name}"
									class="btn btn-xs bg-ocean text-mist border-none hover:bg-ocean/80 no-underline flex-1 text-center"
								>
									Edit
								</a>
								<a
									href="/scenes/{scene.name}"
									target="_blank"
									class="btn btn-xs border-mist-dark bg-transparent hover:bg-mist text-ocean no-underline flex-1 text-center"
								>
									Preview
								</a>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>