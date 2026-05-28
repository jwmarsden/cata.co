<script lang="ts">
	import { onMount } from 'svelte';

	interface MediaFile {
		key: string;
		filename: string;
		size: number;
		lastModified: string;
	}

	let files = $state<MediaFile[]>([]);
	let loading = $state(true);
	let uploading = $state(false);
	let uploadError = $state('');
	let copiedKey = $state('');
	let dragOver = $state(false);

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-AU', {
			day: 'numeric', month: 'short', year: 'numeric'
		});
	}

	function isImage(filename: string): boolean {
		return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename);
	}

	function isVideo(filename: string): boolean {
		return /\.(mp4|webm|mov|avi)$/i.test(filename);
	}

	function markdownLink(file: MediaFile): string {
		const url = `/api/media/${encodeURIComponent(file.key)}`;
		if (isImage(file.filename)) return `![${file.filename}](${url})`;
		return `[${file.filename}](${url})`;
	}

	async function loadFiles() {
		loading = true;
		try {
			const res = await fetch('/api/media/list');
			const data = await res.json();
			files = data.files;
		} finally {
			loading = false;
		}
	}

	async function uploadFile(file: File) {
		uploading = true;
		uploadError = '';
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/media/upload', {
				method: 'POST',
				body: formData,
			});
			if (!res.ok) throw new Error('Upload failed');
			await loadFiles();
		} catch (e) {
			uploadError = e instanceof Error ? e.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) uploadFile(file);
		input.value = '';
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) uploadFile(file);
	}

	function copyMarkdown(file: MediaFile) {
		navigator.clipboard.writeText(markdownLink(file));
		copiedKey = file.key;
		setTimeout(() => copiedKey = '', 2000);
	}

	onMount(loadFiles);
</script>

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
			aria-label="File upload zone"
		>
			{#if uploading}
				<p class="text-muted">Uploading...</p>
			{:else}
				<p class="text-muted">Drag and drop a file here, or</p>
				<label class="btn btn-primary" style="cursor: pointer; margin-top: 0.5rem;">
					Browse files
					<input
						type="file"
						accept="image/*,video/*"
						onchange={handleFileInput}
						style="display: none;"
					/>
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
							<div class="media-preview">
								{#if isImage(file.filename)}
									<img
										src="/api/media/{encodeURIComponent(file.key)}"
										alt={file.filename}
										loading="lazy"
									/>
								{:else if isVideo(file.filename)}
									<div class="media-icon">🎬</div>
								{:else}
									<div class="media-icon">📄</div>
								{/if}
							</div>
							<div class="media-info">
								<div class="media-filename" title={file.filename}>{file.filename}</div>
								<div class="media-meta">{formatSize(file.size)} · {formatDate(file.lastModified)}</div>
								<button
									class="btn-copy"
									onclick={() => copyMarkdown(file)}
								>
									{copiedKey === file.key ? '✓ Copied!' : 'Copy markdown'}
								</button>
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
	}

	.media-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.media-icon {
		font-size: 2.5rem;
	}

	.media-info {
		padding: 0.6rem 0.75rem;
	}

	.media-filename {
		font-size: 0.8rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 0.2rem;
	}

	.media-meta {
		font-size: 0.75rem;
		color: #888;
		margin-bottom: 0.5rem;
	}

	.btn-copy {
		font-size: 0.75rem;
		width: 100%;
		padding: 0.3rem;
		border: 1px solid var(--color-border, #ddd);
		border-radius: 4px;
		background: none;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-copy:hover {
		background: var(--color-mist, #f0f4f7);
	}
</style>