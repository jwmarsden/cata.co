<script lang="ts">
	interface TagData {
		name: string;
		occurrences: number;
	}

	let { tags } = $props<{ tags: TagData[] }>();

	const min = $derived(Math.min(...tags.map((t: TagData) => t.occurrences)));
	const max = $derived(Math.max(...tags.map((t: TagData) => t.occurrences)));

	function fontSize(occurrences: number): string {
		if (max === min) return '1rem';
		const scale = (occurrences - min) / (max - min);
		const size = 0.8 + scale * 0.6;
		return `${size.toFixed(2)}rem`;
	}

	function opacity(occurrences: number): string {
		if (max === min) return '1';
		const scale = (occurrences - min) / (max - min);
		const op = 0.5 + scale * 0.5;
		return op.toFixed(2);
	}
</script>

<div class="flex flex-wrap gap-2 items-center justify-center py-1">
	{#each tags as tag}
		<a
			href="/tag/{tag.name}"
			class="no-underline transition-all hover:text-amber hover:scale-110"
			style="font-size: {fontSize(tag.occurrences)}; opacity: {opacity(tag.occurrences)}; color: #1B3A4B;"
			title="{tag.occurrences} {tag.occurrences === 1 ? 'occurrence' : 'occurrences'}"
		>
			#{tag.name}
		</a>
	{/each}
</div>