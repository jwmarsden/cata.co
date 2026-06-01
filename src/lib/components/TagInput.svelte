<script lang="ts">
	interface Props {
		selected: string[];
		available: string[];
		onchange: (tags: string[]) => void;
	}

	let { selected, available, onchange }: Props = $props();

	let input = $state('');
	let showSuggestions = $state(false);

	const suggestions = $derived(
		input.trim().length > 0
			? available.filter(t =>
				t.toLowerCase().includes(input.toLowerCase()) &&
				!selected.includes(t)
			)
			: available.filter(t => !selected.includes(t))
	);

	function addTag(tag: string) {
		const normalised = tag.toLowerCase().trim();
		if (!normalised || selected.includes(normalised)) return;
		onchange([...selected, normalised]);
		input = '';
		showSuggestions = false;
	}

	function removeTag(tag: string) {
		onchange(selected.filter(t => t !== tag));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			if (input.trim()) addTag(input.trim());
		}
		if (e.key === 'Backspace' && !input && selected.length > 0) {
			removeTag(selected[selected.length - 1]);
		}
		if (e.key === 'Escape') {
			showSuggestions = false;
		}
	}
</script>

<div class="relative">
	<!-- Selected tags + input -->
	<div
		class="flex flex-wrap gap-1.5 p-2 border border-mist-dark rounded-lg bg-white min-h-10 cursor-text"
		onclick={() => { showSuggestions = true; }}
		onkeydown={() => {}}
		role="button"
		tabindex="-1"
	>
		{#each selected as tag}
			<span class="badge bg-ocean text-mist border-none gap-1 pl-2">
				#{tag}
				<button
					type="button"
					class="btn btn-ghost btn-xs p-0 min-h-0 h-auto text-mist hover:text-error hover:bg-transparent"
					onclick={(e) => { e.stopPropagation(); removeTag(tag); }}
				>✕</button>
			</span>
		{/each}
		<input
			type="text"
			class="flex-1 min-w-24 border-none outline-none text-sm bg-transparent text-ocean placeholder:text-text-muted"
			placeholder={selected.length === 0 ? 'Add tags...' : ''}
			bind:value={input}
			onkeydown={handleKeydown}
			onfocus={() => showSuggestions = true}
			onblur={() => setTimeout(() => showSuggestions = false, 150)}
		/>
	</div>

	<!-- Suggestions dropdown -->
	{#if showSuggestions && (suggestions.length > 0 || input.trim())}
		<div class="absolute top-full left-0 right-0 mt-1 bg-white border border-mist-dark rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
			{#if input.trim() && !available.includes(input.toLowerCase().trim()) && !selected.includes(input.toLowerCase().trim())}
				<button
					type="button"
					class="w-full text-left px-3 py-2 text-sm hover:bg-mist text-ocean flex items-center gap-2"
					onmousedown={() => addTag(input.trim())}
				>
					<span class="badge bg-amber text-ocean border-none text-xs">new</span>
					Create "#{input.trim()}"
				</button>
			{/if}
			{#each suggestions as suggestion}
				<button
					type="button"
					class="w-full text-left px-3 py-2 text-sm hover:bg-mist text-ocean"
					onmousedown={() => addTag(suggestion)}
				>
					#{suggestion}
				</button>
			{/each}
		</div>
	{/if}
</div>

<p class="text-xs text-text-muted mt-1">Press Enter or comma to add a tag</p>