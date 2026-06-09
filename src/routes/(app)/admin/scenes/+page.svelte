<script lang="ts">
	let { data } = $props();

	const TEMPLATES = [
		{ name: 'rotating-cube', label: 'Rotating Cube' },
		{ name: 'particle-field', label: 'Particle Field' },
		{ name: 'example-vector', label: 'Vector Demo' },
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
			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: 'Failed to create scene' }));
				throw new Error(err.message ?? 'Failed to create scene');
			}
			window.location.href = `/admin/scenes/${newName.trim()}`;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create scene';
		} finally {
			creating = false;
		}
	}
	
	async function deleteScene(name: string) {
		if (!confirm(`Delete scene "${name}"? This cannot be undone.`)) return;
		const res = await fetch(`/admin/scenes/${name}`, { method: 'DELETE' });
		if (res.ok) {
			window.location.reload();
		} else {
			const err = await res.json().catch(() => ({ message: 'Delete failed' }));
			alert(err.message ?? 'Delete failed');
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
						Scene name
						<span class="text-xs font-normal text-text-muted ml-1">(lowercase, hyphens only)</span>
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
			<p class="text-text-muted">No scenes yet — create one above.</p>
		{:else}
			<h2 class="text-xl font-bold text-ocean mb-4">Existing scenes</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
				{#each data.scenes as scene}
					<div class="card bg-white border border-mist-dark hover:border-amber transition-colors">
						<div class="card-body py-4">
							<div class="flex items-center justify-between mb-1">
								<h3 class="font-semibold text-ocean">{scene.name}</h3>
								<span class="badge badge-xs border-none {scene.source === 'bucket' ? 'bg-amber text-ocean' : 'bg-mist text-ocean'}">
									{scene.source === 'bucket' ? '☁ bucket' : '📁 static'}
								</span>
							</div>
							<p class="text-xs text-text-muted font-mono mt-1 mb-3">![[scene:{scene.name}]]</p>
							<div class="flex gap-2">
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
									Preview ↗
								</a>
								{#if scene.source === 'bucket'}
									<button
										class="btn btn-xs border-mist-dark bg-transparent hover:bg-error/10 hover:text-error hover:border-error/30 text-ocean"
										onclick={() => deleteScene(scene.name)}
									>
										✕
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>