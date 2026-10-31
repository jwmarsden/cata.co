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
	let copied = $state('');

	const sortedScenes = $derived([...data.scenes].sort((a, b) => a.name.localeCompare(b.name)));

	async function copyDirective(name: string) {
		await navigator.clipboard.writeText(`![[scene:${name}]]`);
		copied = name;
		setTimeout(() => { if (copied === name) copied = ''; }, 1500);
	}

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
			<h2 class="text-xl font-bold text-ocean mb-4">Existing scenes <span class="text-sm font-normal text-text-muted">({data.scenes.length})</span></h2>
			<!-- One row per scene: name and directive on the left, actions on the right;
			     on narrow screens the actions drop below -->
			<ul class="border border-mist-dark rounded-xl bg-white divide-y divide-mist-dark overflow-hidden">
				{#each sortedScenes as scene (scene.name)}
					<li class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-mist/40 transition-colors">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2 min-w-0">
								<a href="/admin/scenes/{scene.name}" class="font-semibold text-ocean no-underline hover:text-amber break-all" title={scene.name}>
									{scene.name}
								</a>
								<span class="badge badge-xs border-none shrink-0 {scene.source === 'bucket' ? 'bg-amber text-ocean' : 'bg-mist text-ocean'}">
									{scene.source === 'bucket' ? '☁ bucket' : '📁 static'}
								</span>
							</div>
							<button
								class="mt-1 text-xs text-text-muted font-mono hover:text-ocean break-all text-left cursor-pointer"
								title="Copy the embed directive"
								onclick={() => copyDirective(scene.name)}
							>
								![[scene:{scene.name}]] <span class="font-sans">{copied === scene.name ? '✓ copied' : '⧉'}</span>
							</button>
						</div>
						<div class="flex gap-2 shrink-0">
							<a
								href="/admin/scenes/{scene.name}"
								class="btn btn-xs bg-ocean text-mist border-none hover:bg-ocean/80 no-underline"
							>
								Edit
							</a>
							<a
								href="/scenes/{scene.name}"
								target="_blank"
								class="btn btn-xs border-mist-dark bg-transparent hover:bg-mist text-ocean no-underline"
							>
								Preview ↗
							</a>
							{#if scene.source === 'bucket'}
								<button
									class="btn btn-xs border-mist-dark bg-transparent hover:bg-error/10 hover:text-error hover:border-error/30 text-ocean"
									title="Delete {scene.name}"
									onclick={() => deleteScene(scene.name)}
								>
									✕
								</button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>