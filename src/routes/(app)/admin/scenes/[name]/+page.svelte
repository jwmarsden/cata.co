<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { javascript } from '@codemirror/lang-javascript';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { EditorState } from '@codemirror/state';

	let { data } = $props();

	let editorContainer: HTMLDivElement;
	let editorView: EditorView | null = null;
	let saving = $state(false);
	let saved = $state(false);
	let previewKey = $state(0);

	onMount(() => {
		editorView = new EditorView({
			state: EditorState.create({
				doc: data.code ?? '',
				extensions: [
					basicSetup,
					javascript(),
					oneDark,
					EditorView.theme({
						'&': { height: '100%', fontSize: '13px' },
						'.cm-scroller': { overflow: 'auto', fontFamily: '"DM Mono", monospace' },
						'.cm-content': { padding: '8px 0' },
					}),
					EditorView.lineWrapping,
				],
			}),
			parent: editorContainer,
		});

		return () => editorView?.destroy();
	});

	function getCode(): string {
		return editorView?.state.doc.toString() ?? '';
	}

	async function save() {
		saving = true;
		saved = false;
		try {
			const res = await fetch('/api/scenes', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: data.name, code: getCode() }),
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
		<div class="w-1/2 flex flex-col border-r border-mist-dark/30 min-h-0">
			<div class="px-4 py-1.5 bg-ocean/80 text-xs text-mist-dark font-mono border-b border-mist-dark/30 shrink-0">
				{data.source === 'bucket' ? '☁' : '📁'} scenes/{data.name}.js
			</div>
			<div class="flex-1 overflow-hidden" bind:this={editorContainer}></div>
		</div>

		<!-- Preview -->
		<div class="w-1/2 flex flex-col">
			<div class="px-4 py-1.5 bg-base-200 text-xs text-text-muted font-mono border-b border-mist-dark/30 flex items-center justify-between shrink-0">
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

<style>
	:global(.cm-editor) {
		height: 100%;
	}
	:global(.cm-editor.cm-focused) {
		outline: none;
	}
</style>