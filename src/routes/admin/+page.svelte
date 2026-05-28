<script lang="ts">
	import { onMount } from 'svelte';
	import type { Media } from '$lib/server/db/media.schema';

	let files = $state<Media[]>([]);
	let loading = $state(true);
	let uploading = $state(false);
	let uploadError = $state('');
	let dragOver = $state(false);
	let copiedId = $state('');

	// Upload form
	let selectedFile = $state<File | null>(null);
	let friendlyName = $state('');
	let altText = $state('');
	let description = $state('');

	// Lightbox
	let lightboxFile = $state<Media | null>(null);
	let lightboxUrl = $state('');

	// Edit modal
	let editingFile = $state<Media | null>(null);
	let editName = $state('');
	let editAlt = $state('');
	let editDesc = $state('');

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString('en-AU', {
			day: 'numeric', month: 'short', year: 'numeric'
		});
	}

	function isImage(contentType: string) {
		return contentType.startsWith('image/');
	}

	function isVideo(contentType: string) {
		return contentType.startsWith('video/');
	}

	function markdownLink(file: Media): string {
		const url = `/api/media/${file.id}?redirect=true`;
		if (isImage(file.contentType)) {
			return `![${file.altText || file.friendlyName}](${url})`;
		}
		return `[${file.friendlyName}](${url})`;
	}

	function namedMarkdown(file: Media): string {
		// For future named embed support: ![[friendly-name]]
		return `![[${file.friendlyName}]]`;
	}

	// In +page.svelte
	async function loadFiles() {
		loading = true;
		try {
			const res = await fetch('/api/media/files');  // changed from /list
			const data = await res.json();
			files = data.files;
		} finally {
			loading = false;
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		selectedFile = input.files?.[0] ?? null;
		if (selectedFile && !friendlyName) {
			// Pre-fill friendly name from filename
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

			const res = await fetch('/api/media/upload', {
				method: 'POST',
				body: formData,
			});
			if (!res.ok) throw new Error('Upload failed');

			// Reset form
			selectedFile = null;
			friendlyName = '';
			altText = '';
			description = '';
			await loadFiles();
		} catch (e) {
			uploadError = e instanceof Error ? e.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	async function openLightbox(file: Media) {
		lightboxFile = file;
		lightboxUrl = '';
		const res = await fetch(`/api/media/${file.id}`);
		const data = await res.json();
		lightboxUrl = data.url;
	}

	function closeLightbox() {
		lightboxFile = null;
		lightboxUrl = '';
	}

	function openEdit(file: Media) {
		editingFile = file;
		editName = file.friendlyName;
		editAlt = file.altText;
		editDesc = file.description;
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
			}),
		});
		editingFile = null;
		await loadFiles();
	}

	async function deleteFile(file: Media) {
		if (!confirm(`Delete "${file.friendlyName}"? This cannot be undone.`)) return;
		await fetch(`/api/media/${file.id}`, { method: 'DELETE' });
		await loadFiles();
	}

	async function copyMarkdown(file: Media) {
		await navigator.clipboard.writeText(markdownLink(file));
		copiedId = file.id;
		setTimeout(() => copiedId = '', 2000);
	}

	onMount(loadFiles);
</script>

<!-- Lightbox -->
{#if lightboxFile}
	<div
		class="lightbox"
		role="dialog"
		aria-modal="true"
		aria-label="Media preview"
		tabindex="-1"
		onclick={closeLightbox}
		onkeydown={(e) => e.key === 'Escape' && closeLightbox()}
	>
		<div class="lightbox-inner">
			<button class="lightbox-close" onclick={closeLightbox}>✕</button>
			{#if lightboxUrl}
				{#if isImage(lightboxFile.contentType)}
					<img src={lightboxUrl} alt={lightboxFile.altText || lightboxFile.friendlyName} />
				{:else if isVideo(lightboxFile.contentType)}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video src={lightboxUrl} controls autoplay style="max-width:100%;max-height:70vh;"></video>
				{/if}
			{:else}
				<p class="text-muted">Loading...</p>
			{/if}
			<div class="lightbox-meta">
				<strong>{lightboxFile.friendlyName}</strong>
				{#if lightboxFile.description}
					<p>{lightboxFile.description}</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
<!-- Edit modal -->
{#if editingFile}
	<div
		class="lightbox"
		role="dialog"
		aria-modal="true"
		aria-label="Edit metadata"
		tabindex="-1"
		onclick={() => editingFile = null}
		onkeydown={(e) => e.key === 'Escape' && (editingFile = null)}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="edit-modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h3>Edit metadata</h3>
			<label for="edit-name">Friendly name</label>
			<input id="edit-name" type="text" bind:value={editName} />
			<label for="edit-alt">Alt text</label>
			<input id="edit-alt" type="text" bind:value={editAlt} placeholder="Describe the image for accessibility" />
			<label for="edit-desc">Description</label>
			<textarea id="edit-desc" bind:value={editDesc} rows="3" placeholder="Optional longer description"></textarea>
			<div class="modal-actions">
				<button onclick={() => editingFile = null}>Cancel</button>
				<button class="btn btn-primary" onclick={saveEdit}>Save</button>
			</div>
		</div>
	</div>
{/if}

<section>
	<div class="container" style="margin-top: 2rem;">
		<h1 class="mb-4">Media</h1>

		<!-- Upload zone -->
		<div
			class="upload-zone"
			class:drag-over={dragOver}
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={() => dragOver = false}
			ondrop={handleDrop}
			role="region"
		>
			{#if selectedFile}
				<p style="font-weight: 500; margin-bottom: 1rem;">📎 {selectedFile.name}</p>
				<div class="upload-fields">
					<label>
						Friendly name <span style="color:red">*</span>
						<input type="text" bind:value={friendlyName} placeholder="e.g. hero image" />
					</label>
					<label>
						Alt text
						<input type="text" bind:value={altText} placeholder="Describe the image" />
					</label>
					<label>
						Description
						<textarea bind:value={description} rows="2" placeholder="Optional longer description"></textarea>
					</label>
					<div style="display:flex; gap: 0.5rem; margin-top: 0.5rem;">
						<button onclick={() => { selectedFile = null; friendlyName = ''; altText = ''; description = ''; }}>
							Cancel
						</button>
						<button class="btn btn-primary" onclick={handleUpload} disabled={uploading || !friendlyName.trim()}>
							{uploading ? 'Uploading...' : 'Upload'}
						</button>
					</div>
				</div>
			{:else}
				<p class="text-muted">Drag and drop a file here, or</p>
				<label class="btn btn-primary" style="cursor: pointer; margin-top: 0.5rem; display: inline-block;">
					Browse files
					<input type="file" accept="image/*,video/*" onchange={handleFileSelect} style="display:none;" />
				</label>
			{/if}
		</div>

		{#if uploadError}
			<p class="error" style="margin-top: 0.5rem;">{uploadError}</p>
		{/if}

		<!-- File grid -->
		<div style="margin-top: 2rem;">
			{#if loading}
				<p class="text-muted">Loading files...</p>
			{:else if files.length === 0}
				<p class="text-muted">No files uploaded yet.</p>
			{:else}
				<div class="media-grid">
					{#each files as file}
						<div class="media-card">
							<button class="media-preview" onclick={() => openLightbox(file)} aria-label="View {file.friendlyName}">
							{#if file.thumbnailKey}
								<img
									src="/api/media/{file.id}/thumbnail"
									alt={file.altText || file.friendlyName}
									loading="lazy"
								/>
								{#if isVideo(file.contentType)}
									<div class="video-badge">▶</div>
								{/if}
							{:else if isImage(file.contentType)}
								<img
									src="/api/media/{file.id}?redirect=true"
									alt={file.altText || file.friendlyName}
									loading="lazy"
								/>
							{:else}
								<div class="media-icon">🎬</div>
							{/if}
						</button>
							<div class="media-info">
								<div class="media-filename" title={file.friendlyName}>{file.friendlyName}</div>
								<div class="media-meta">{formatSize(file.size)} · {formatDate(file.uploadedAt)}</div>
								{#if file.altText}
									<div class="media-alt" title={file.altText}>{file.altText}</div>
								{/if}
								<div class="media-actions">
									<button class="btn-action" onclick={() => copyMarkdown(file)}>
										{copiedId === file.id ? '✓' : '⎘'} {copiedId === file.id ? 'Copied' : 'Copy'}
									</button>
									<button class="btn-action" onclick={() => openEdit(file)}>✎ Edit</button>
									<button class="btn-action danger" onclick={() => deleteFile(file)}>✕</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>

<style>
	.upload-zone {
		border: 2px dashed var(--color-border, #ddd);
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
		transition: border-color 0.2s, background 0.2s;
	}

	.upload-zone.drag-over {
		border-color: var(--color-ocean, #2a6b8a);
		background: var(--color-mist, #f0f4f7);
	}

	.upload-fields {
		text-align: left;
		max-width: 400px;
		margin: 0 auto;
	}

	.upload-fields label {
		display: block;
		font-size: 0.85rem;
		margin-bottom: 0.75rem;
	}

	.upload-fields input,
	.upload-fields textarea {
		display: block;
		width: 100%;
		margin-top: 0.25rem;
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1rem;
	}

	.media-card {
		border: 1px solid var(--color-border, #ddd);
		border-radius: 8px;
		overflow: hidden;
		background: white;
	}

	.media-preview {
		width: 100%;
		height: 140px;
		background: var(--color-mist, #f0f4f7);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border: none;
		padding: 0;
		cursor: pointer;
		position: relative;
	}

	.media-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: opacity 0.2s;
	}

	.media-preview:hover img {
		opacity: 0.85;
	}

	.video-badge {
		position: absolute;
		font-size: 2rem;
		color: white;
		text-shadow: 0 2px 8px rgba(0,0,0,0.5);
		pointer-events: none;
	}

	.media-info {
		padding: 0.6rem 0.75rem;
	}

	.media-filename {
		font-size: 0.85rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 0.15rem;
	}

	.media-meta {
		font-size: 0.75rem;
		color: #888;
		margin-bottom: 0.25rem;
	}

	.media-alt {
		font-size: 0.75rem;
		color: #aaa;
		font-style: italic;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 0.4rem;
	}

	.media-actions {
		display: flex;
		gap: 4px;
		margin-top: 0.4rem;
	}

	.btn-action {
		flex: 1;
		font-size: 0.72rem;
		padding: 0.25rem 0.3rem;
		border: 1px solid var(--color-border, #ddd);
		border-radius: 4px;
		background: none;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-action:hover {
		background: var(--color-mist, #f0f4f7);
	}

	.btn-action.danger:hover {
		background: #fef2f2;
		color: #b91c1c;
		border-color: #fca5a5;
	}

	/* Lightbox */
	.lightbox {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.lightbox-inner {
		background: white;
		border-radius: 12px;
		overflow: hidden;
		max-width: 90vw;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.lightbox-inner img {
		max-width: 80vw;
		max-height: 70vh;
		object-fit: contain;
		display: block;
	}

	.lightbox-close {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgba(0,0,0,0.5);
		color: white;
		border: none;
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
		cursor: pointer;
		font-size: 0.9rem;
		z-index: 1;
	}

	.lightbox-meta {
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
	}

	.lightbox-meta p {
		margin-top: 0.25rem;
		color: #666;
		font-size: 0.85rem;
	}

	/* Edit modal */
	.edit-modal {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		width: 380px;
		max-width: 95vw;
	}

	.edit-modal h3 {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.edit-modal label {
		display: block;
		font-size: 0.85rem;
		margin-bottom: 0.75rem;
	}

	.edit-modal input,
	.edit-modal textarea {
		display: block;
		width: 100%;
		margin-top: 0.25rem;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.modal-actions button {
		flex: 1;
	}
</style>