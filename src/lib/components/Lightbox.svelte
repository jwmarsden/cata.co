<script lang="ts">
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';

	interface GalleryItem {
		src: string;
		alt: string;
		caption?: string;
	}

	let items = $state<GalleryItem[]>([]);
	let currentIndex = $state(0);
	let visible = $state(false);

	const current = $derived(items[currentIndex]);

	export function open(gallery: GalleryItem[], startIndex: number) {
		items = gallery;
		currentIndex = startIndex;
		visible = true;
	}

	function close() {
		visible = false;
	}

	function next() {
		if (items.length < 2) return;
		currentIndex = (currentIndex + 1) % items.length;
	}

	function prev() {
		if (items.length < 2) return;
		currentIndex = (currentIndex - 1 + items.length) % items.length;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowRight') next();
		else if (e.key === 'ArrowLeft') prev();
	}
</script>

<svelte:window onkeydown={visible ? handleKeydown : undefined} />

{#if visible && current}
	<div
		class="lightbox-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Image viewer"
		tabindex="-1"
		onclick={close}
		onkeydown={(e) => e.key === 'Escape' && close()}
	>
		<button class="lightbox-close" onclick={close} aria-label="Close">
			<X size={20} />
		</button>

		{#if items.length > 1}
			<button
				class="lightbox-nav lightbox-prev"
				onclick={(e) => { e.stopPropagation(); prev(); }}
				aria-label="Previous image"
			>
				<ChevronLeft size={28} />
			</button>
		{/if}

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="lightbox-content"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<img src={current.src} alt={current.alt} class="lightbox-image" />
			{#if current.caption}
				<p class="lightbox-caption">{current.caption}</p>
			{/if}
			{#if items.length > 1}
				<p class="lightbox-counter">{currentIndex + 1} / {items.length}</p>
			{/if}
		</div>

		{#if items.length > 1}
			<button
				class="lightbox-nav lightbox-next"
				onclick={(e) => { e.stopPropagation(); next(); }}
				aria-label="Next image"
			>
				<ChevronRight size={28} />
			</button>
		{/if}
	</div>
{/if}

<style>
	.lightbox-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 2rem;
	}

	.lightbox-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		max-width: 90vw;
		max-height: 90vh;
	}

	.lightbox-image {
		max-width: 90vw;
		max-height: 80vh;
		object-fit: contain;
		border-radius: 0.5rem;
		display: block;
	}

	.lightbox-caption {
		color: var(--color-mist-dark, #c8dde6);
		font-size: 0.875rem;
		margin-top: 0.75rem;
		text-align: center;
	}

	.lightbox-counter {
		color: var(--color-text-muted, #5a7a8a);
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}

	.lightbox-close,
	.lightbox-nav {
		position: fixed;
		border-radius: 9999px;
		background: rgba(0, 0, 0, 0.5);
		color: white;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 101;
		transition: background-color 0.2s;
	}

	.lightbox-close:hover,
	.lightbox-nav:hover {
		background: rgba(0, 0, 0, 0.75);
	}

	.lightbox-close {
		top: 1rem;
		right: 1rem;
		width: 2.5rem;
		height: 2.5rem;
	}

	.lightbox-nav {
		top: 50%;
		transform: translateY(-50%);
		width: 3rem;
		height: 3rem;
	}

	.lightbox-prev {
		left: 1rem;
	}

	.lightbox-next {
		right: 1rem;
	}
</style>
