<script lang="ts">
	import { onMount } from 'svelte';
	import type { Media } from '$lib/server/db/media.schema';
	import { FFmpeg } from '@ffmpeg/ffmpeg';
	import { fetchFile, toBlobURL } from '@ffmpeg/util';
	import TagInput from '$lib/components/TagInput.svelte';

	interface MediaWithTags extends Omit<Media, 'tags'> {
		tags: string[];
	}

	let availableTags = $state<string[]>([]);
	let selectedTags = $state<string[]>([]);
	let editTags = $state<string[]>([]);

	let files = $state<MediaWithTags[]>([]);
	let loading = $state(true);
	let uploading = $state(false);
	let uploadError = $state('');
	let dragOver = $state(false);
	let copiedId = $state('');

	let selectedFile = $state<File | null>(null);
	let friendlyName = $state('');
	let altText = $state('');
	let description = $state('');

	let lightboxFile = $state<MediaWithTags | null>(null);
	let lightboxUrl = $state('');

	let editingFile = $state<MediaWithTags | null>(null);
	let editName = $state('');
	let editAlt = $state('');
	let editDesc = $state('');

	let ffmpegLoaded = false;
	let ffmpeg: FFmpeg | null = null;

	async function loadFFmpeg(): Promise<FFmpeg> {
		if (ffmpegLoaded && ffmpeg) return ffmpeg;
		ffmpeg = new FFmpeg();
		await ffmpeg.load({
			coreURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js', 'text/javascript'),
			wasmURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm', 'application/wasm'),
		});
		ffmpegLoaded = true;
		return ffmpeg;
	}

	async function extractVideoThumbnail(file: File): Promise<File> {
		const ff = await loadFFmpeg();
		await ff.writeFile('input', await fetchFile(file));
		await ff.exec([
			'-i', 'input',
			'-ss', '00:00:01',
			'-vframes', '1',
			'-vf', 'scale=400:300:force_original_aspect_ratio=increase,crop=400:300',
			'thumb.jpg'
		]);
		const data = await ff.readFile('thumb.jpg');
		let arrayBuffer: ArrayBuffer;
		if (typeof data === 'string') {
			const encoded = new TextEncoder().encode(data);
			arrayBuffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
		} else {
			arrayBuffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice().buffer;
		}
		return new File([new Blob([arrayBuffer], { type: 'image/jpeg' })], 'thumbnail.jpg', { type: 'image/jpeg' });
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function isImage(contentType: string) { return contentType.startsWith('image/'); }
	function isVideo(contentType: string) { return contentType.startsWith('video/'); }

	function markdownLink(file: MediaWithTags): string {
		const url = `/api/media/${file.id}?redirect=true`;
		return isImage(file.contentType)
			? `![${file.altText || file.friendlyName}](${url})`
			: `[${file.friendlyName}](${url})`;
	}

	async function loadFiles() {
		loading = true;
		try {
			const res = await fetch('/api/media/files');
			if (!res.ok) throw new Error('Failed to load files');
			const data = await res.json();
			files = data.files ?? [];
			availableTags = data.availableTags ?? [];
		} catch (e) {
			console.error('Failed to load files:', e);
			files = [];
		} finally {
			loading = false;
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		selectedFile = input.files?.[0] ?? null;
		if (selectedFile && !friendlyName) {
			friendlyName = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		selectedFile = e.dataTransfer?.files[0] ?? null;
		if (selectedFile && !friendlyName) {
			friendlyName = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
		}
	}

	async function handleUpload() {
		if (!selectedFile || !friendlyName.trim()) return;
		uploading = true;
		uploadError = '';
		try {
			const formData = new FormData();
			formData.append('file', selectedFile);
			formData.append('friendlyName', friendlyName.trim());
			formData.append('altText', altText.trim());
			formData.append('description', description.trim());
			formData.append('tags', JSON.stringify(selectedTags));

			if (selectedFile.type.startsWith('video/')) {
				try {
					uploadError = 'Extracting video thumbnail...';
					const thumbnail = await extractVideoThumbnail(selectedFile);
					formData.append('thumbnail', thumbnail);
					uploadError = '';
				} catch (e) {
					console.error('Thumbnail extraction failed:', e);
					uploadError = '';
				}
			}

			const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
			if (!res.ok) throw new Error('Upload failed');
			selectedFile = null;
			friendlyName = '';
			altText = '';
			description = '';
			selectedTags = [];
			await loadFiles();
		} catch (e) {
			uploadError = e instanceof Error ? e.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	async function openLightbox(file: MediaWithTags) {
		lightboxFile = file;
		lightboxUrl = '';
		const res = await fetch(`/api/media/${file.id}`);
		const data = await res.json();
		lightboxUrl = data.url;
	}

	function closeLightbox() { lightboxFile = null; lightboxUrl = ''; }

	function openEdit(file: MediaWithTags) {
		editingFile = file;
		editName = file.friendlyName;
		editAlt = file.altText;
		editDesc = file.description;
		editTags = file.tags ?? [];
	}

	async function saveEdit() {
		if (!editingFile) return;
		await fetch(`/api/media/${editingFile.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				friendlyName: editName,
				altText: editAlt,
				description: editDesc,
				tags: editTags,
			}),
		});
		editingFile = null;
		await loadFiles();
	}

	async function deleteFile(file: MediaWithTags) {
		if (!confirm(`Delete "${file.friendlyName}"? This cannot be undone.`)) return;
		await fetch(`/api/media/${file.id}`, { method: 'DELETE' });
		await loadFiles();
	}

	async function copyMarkdown(file: MediaWithTags) {
		await navigator.clipboard.writeText(markdownLink(file));
		copiedId = file.id;
		setTimeout(() => copiedId = '', 2000);
	}

	onMount(loadFiles);
</script>

<!-- Lightbox -->
{#if lightboxFile}
	<div
		class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Media preview"
		tabindex="-1"
		onclick={closeLightbox}
		onkeydown={(e) => e.key === 'Escape' && closeLightbox()}
	>
		<div class="bg-white rounded-xl overflow-hidden max-w-[90vw] max-h-[90vh] flex flex-col relative">
			<button
				class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white border-none cursor-pointer z-10 flex items-center justify-center"
				onclick={closeLightbox}
			>✕</button>
			{#if lightboxUrl}
				{#if isImage(lightboxFile.contentType)}
					<img src={lightboxUrl} alt={lightboxFile.altText || lightboxFile.friendlyName} class="max-w-[80vw] max-h-[70vh] object-contain block" />
				{:else if isVideo(lightboxFile.contentType)}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video src={lightboxUrl} controls autoplay class="max-w-full max-h-[70vh]"></video>
				{/if}
			{:else}
				<div class="flex items-center justify-center p-8">
					<span class="loading loading-spinner loading-md text-ocean"></span>
				</div>
			{/if}
			<div class="p-4 text-sm">
				<strong class="text-ocean">{lightboxFile.friendlyName}</strong>
				{#if lightboxFile.description}
					<p class="text-text-muted mt-1 text-xs">{lightboxFile.description}</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Edit modal -->
{#if editingFile}
	<div
		class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Edit metadata"
		tabindex="-1"
		onclick={() => editingFile = null}
		onkeydown={(e) => e.key === 'Escape' && (editingFile = null)}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-white rounded-xl p-6 w-96 max-w-[95vw]"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h3 class="text-base font-semibold text-ocean mb-4">Edit metadata</h3>
			<label class="label text-sm font-semibold text-ocean" for="edit-name">Friendly name</label>
			<input id="edit-name" type="text" class="input input-bordered w-full mb-3" bind:value={editName} />
			<label class="label text-sm font-semibold text-ocean" for="edit-tags">Tags</label>
			<TagInput
				selected={editTags}
				available={availableTags}
				onchange={(tags) => editTags = tags}
			/>
			<label class="label text-sm font-semibold text-ocean" for="edit-alt">Alt text</label>
			<input id="edit-alt" type="text" class="input input-bordered w-full mb-3" bind:value={editAlt} placeholder="Describe the image" />
			<label class="label text-sm font-semibold text-ocean" for="edit-desc">Description</label>
			<textarea id="edit-desc" class="textarea textarea-bordered w-full mb-4" bind:value={editDesc} rows="3" placeholder="Optional longer description"></textarea>
			<div class="flex gap-2">
				<button class="btn flex-1" onclick={() => editingFile = null}>Cancel</button>
				<button class="btn bg-amber text-ocean border-none hover:bg-amber/80 flex-1" onclick={saveEdit}>Save</button>
			</div>
		</div>
	</div>
{/if}

<section class="py-8">
	<div class="max-w-5xl mx-auto px-6">
		<h1 class="text-3xl font-bold text-ocean mb-6">Media</h1>

		<!-- Upload zone -->
		<div
			class="border-2 border-dashed rounded-lg p-8 text-center transition-colors
				{dragOver ? 'border-ocean bg-mist' : 'border-mist-dark'}"
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={() => dragOver = false}
			ondrop={handleDrop}
			role="region"
			aria-label="File upload zone"
		>
			{#if selectedFile}
				<p class="font-medium text-ocean mb-4">📎 {selectedFile.name}</p>
				<div class="text-left max-w-sm mx-auto flex flex-col gap-3">
					<label class="text-sm font-semibold text-ocean" for="friendly-name">
						Friendly name <span class="text-error">*</span>
						<input id="friendly-name" type="text" class="input input-bordered w-full mt-1" bind:value={friendlyName} placeholder="e.g. hero image" />
					</label>
					<label class="text-sm font-semibold text-ocean" for="file-tags">
						Tags
					</label>
					<TagInput
						selected={selectedTags}
						available={availableTags}
						onchange={(tags) => selectedTags = tags}
					/>
					<label class="text-sm font-semibold text-ocean" for="alt-text">
						Alt text
						<input id="alt-text" type="text" class="input input-bordered w-full mt-1" bind:value={altText} placeholder="Describe the image" />
					</label>
					<label class="text-sm font-semibold text-ocean" for="file-desc">
						Description
						<textarea id="file-desc" class="textarea textarea-bordered w-full mt-1" bind:value={description} rows="2" placeholder="Optional longer description"></textarea>
					</label>
					<div class="flex gap-2 mt-1">
						<button
							class="btn flex-1"
							onclick={() => { selectedFile = null; friendlyName = ''; altText = ''; description = ''; }}
						>
							Cancel
						</button>
						<button
							class="btn bg-amber text-ocean border-none hover:bg-amber/80 flex-1"
							onclick={handleUpload}
							disabled={uploading || !friendlyName.trim()}
						>
							{#if uploading}
								<span class="loading loading-spinner loading-sm"></span>
								{uploadError || 'Uploading...'}
							{:else}
								Upload
							{/if}
						</button>
					</div>
				</div>
			{:else}
				<p class="text-text-muted mb-3">Drag and drop a file here, or</p>
				<label class="btn bg-amber text-ocean border-none hover:bg-amber/80 cursor-pointer">
					Browse files
					<input type="file" accept="image/*,video/*" onchange={handleFileSelect} class="hidden" />
				</label>
			{/if}
		</div>

		{#if uploadError && !uploading}
			<div class="alert alert-error mt-3">
				<span>{uploadError}</span>
			</div>
		{/if}

		<!-- File grid -->
		<div class="mt-8">
			{#if loading}
				<div class="flex items-center gap-2 text-text-muted">
					<span class="loading loading-spinner loading-sm"></span>
					Loading files...
				</div>
			{:else if files.length === 0}
				<p class="text-text-muted">No files uploaded yet.</p>
			{:else}
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{#each files as file}
						<div class="card bg-white border border-mist-dark overflow-hidden">
							<button
								class="w-full h-36 bg-mist flex items-center justify-center overflow-hidden border-none p-0 cursor-pointer relative group"
								onclick={() => openLightbox(file)}
								aria-label="View {file.friendlyName}"
							>
								{#if file.thumbnailKey}
									<img
										src="/api/media/{file.id}/thumbnail"
										alt={file.altText || file.friendlyName}
										loading="lazy"
										class="w-full h-full object-cover transition-opacity group-hover:opacity-85"
									/>
									{#if isVideo(file.contentType)}
										<div class="absolute text-3xl text-white drop-shadow-lg pointer-events-none">▶</div>
									{/if}
								{:else if isImage(file.contentType)}
									<img
										src="/api/media/{file.id}?redirect=true"
										alt={file.altText || file.friendlyName}
										loading="lazy"
										class="w-full h-full object-cover transition-opacity group-hover:opacity-85"
									/>
								{:else}
									<span class="text-4xl">🎬</span>
								{/if}
							</button>

							<div class="p-2">
								<p class="text-xs font-medium text-ocean truncate mb-0.5" title={file.friendlyName}>
									{file.friendlyName}
								</p>
								<p class="text-xs text-text-muted mb-1">
									{formatSize(file.size)} · {formatDate(file.uploadedAt)}
								</p>
								{#if file.altText}
									<p class="text-xs text-[#aaa] italic truncate mb-1" title={file.altText}>
										{file.altText}
									</p>
								{/if}
								{#if file.tags?.length > 0}
									<div class="flex flex-wrap gap-1 mt-1 mb-1">
										{#each file.tags as tag}
											<span class="badge badge-xs bg-mist text-ocean border-none">#{tag}</span>
										{/each}
									</div>
								{/if}
								<div class="flex gap-1 mt-1">
									<button
										class="btn btn-xs flex-1 border-mist-dark bg-transparent hover:bg-mist text-ocean"
										onclick={() => copyMarkdown(file)}
									>
										{copiedId === file.id ? '✓' : '⎘'} {copiedId === file.id ? 'Done' : 'Copy'}
									</button>
									<button
										class="btn btn-xs border-mist-dark bg-transparent hover:bg-mist text-ocean"
										onclick={() => openEdit(file)}
									>✎</button>
									<button
										class="btn btn-xs border-mist-dark bg-transparent hover:bg-error/10 hover:text-error hover:border-error/30 text-ocean"
										onclick={() => deleteFile(file)}
									>✕</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>