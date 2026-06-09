<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();

	let code = $state('');
	let saving = $state(false);
	let saved = $state(false);
	let previewKey = $state(0);

	$effect(() => {
		code = data.code ?? '';
	});

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
		} catch (e) {
			console.error('Save failed:', e);
		} finally {
			saving = false;
		}
	}

	function refreshPreview() {
		previewKey += 1;
	}

	function handleKeydown(e: KeyboardEvent) {
		// Ctrl+S or Cmd+S to save
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			save();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="h-screen flex flex-col">

	<!-- Header -->
	<div class="bg-ocean px-6 py-3 flex items-center justify-between shrink-0 border-b border-mist-dark/30">
		<div class="flex items-center gap-4">
			<a href="/admin/scenes" class="text-mist-dark text-sm no-underline hover:text-amber">
				← Scenes
			</a>
			<span class="text-amber font-semibold">{data.name}</span>
			<span class="text-xs text-mist-dark font-mono bg-white/10 px-2 py-0.5 rounded">
				![[scene:{data.name}]]
			</span>
			<span class="badge badge-xs border-none {data.source === 'bucket' ? 'bg-amber text-ocean' : 'bg-mist text-ocean'}">
				{data.source === 'bucket' ? '☁ bucket' : '📁 static'}
			</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-xs text-mist-dark hidden sm:block">Ctrl+S to save</span>
			<button
				class="btn btn-sm border-mist-dark/50 bg-white/10 text-mist-dark hover:bg-white/20 hover:text-mist"
				onclick={refreshPreview}
			>
				↺ Refresh
			</button>
			<button
				class="btn btn-sm bg-amber text-ocean border-none hover:bg-amber/80 min-w-20"
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
		<div class="w-1/2 flex flex-col border-r border-mist-dark/30">
			<div class="px-4 py-1.5 bg-ocean/80 text-xs text-mist-dark font-mono border-b border-mist-dark/30">
				{data.source === 'bucket' ? '☁' : '📁'} src/scenes/{data.name}.js
			</div>
			<textarea
				class="flex-1 font-mono text-sm p-4 resize-none border-none outline-none leading-relaxed"
				style="background: #0d2233; color: #E8F4F8; tab-size: 2;"
				bind:value={code}
				spellcheck="false"
			></textarea>
		</div>

		<!-- Preview -->
		<div class="w-1/2 flex flex-col">
			<div class="px-4 py-1.5 bg-base-200 text-xs text-text-muted font-mono border-b border-mist-dark/30 flex items-center justify-between">
				<span>Preview — /scenes/{data.name}</span>
				<a
					href="/scenes/{data.name}"
					target="_blank"
					class="text-xs text-text-muted no-underline hover:text-amber"
				>
					Open in new tab ↗
				</a>
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