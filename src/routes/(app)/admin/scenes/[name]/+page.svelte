<script lang="ts">
	let { data } = $props();

	let code = $state(data.code);
	let saving = $state(false);
	let saved = $state(false);
	let previewKey = $state(0);

	async function save() {
		saving = true;
		saved = false;
		try {
			const res = await fetch('/api/scenes', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: data.name, code }),
			});
			if (!res.ok) throw new Error('Save failed');
			saved = true;
			setTimeout(() => saved = false, 2000);
		} finally {
			saving = false;
		}
	}

	function refreshPreview() {
		previewKey += 1;
	}
</script>

<div class="h-screen flex flex-col">
	<!-- Header -->
	<div class="bg-ocean px-6 py-3 flex items-center justify-between shrink-0">
		<div class="flex items-center gap-4">
			<a href="/admin/scenes" class="text-mist-dark text-sm no-underline hover:text-amber">← Scenes</a>
			<span class="text-amber font-semibold">{data.name}</span>
			<span class="text-xs text-text-muted font-mono bg-ocean/50 px-2 py-0.5 rounded">
				![[scene:{data.name}]]
			</span>
		</div>
		<div class="flex gap-2">
			<button
				class="btn btn-sm border-mist-dark bg-transparent text-mist-dark hover:bg-mist/10"
				onclick={refreshPreview}
			>
				Refresh preview
			</button>
			<button
				class="btn btn-sm bg-amber text-ocean border-none hover:bg-amber/80"
				onclick={save}
				disabled={saving}
			>
				{#if saving}
					<span class="loading loading-spinner loading-xs"></span>
				{:else if saved}
					✓ Saved
				{:else}
					Save
				{/if}
			</button>
		</div>
	</div>

	<!-- Editor + Preview -->
	<div class="flex-1 flex min-h-0">
		<!-- Code editor -->
		<div class="w-1/2 flex flex-col border-r border-mist-dark">
			<div class="px-4 py-2 bg-base-200 text-xs text-text-muted font-mono border-b border-mist-dark">
				src/scenes/{data.name}.js
			</div>
			<textarea
				class="flex-1 font-mono text-sm p-4 resize-none border-none outline-none bg-ocean text-mist leading-relaxed"
				bind:value={code}
				spellcheck="false"
			></textarea>
		</div>

		<!-- Live preview -->
		<div class="w-1/2 flex flex-col bg-[#0a0a1a]">
			<div class="px-4 py-2 bg-base-200 text-xs text-text-muted font-mono border-b border-mist-dark">
				Preview
			</div>
			{#key previewKey}
				<iframe
					src="/scenes/{data.name}"
					title="Scene preview"
					class="flex-1 border-none"
				></iframe>
			{/key}
		</div>
	</div>
</div>