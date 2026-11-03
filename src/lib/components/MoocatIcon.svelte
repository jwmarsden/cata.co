<script lang="ts">
	// moocat's cat-headed speech bubble, drawn like a lucide icon (24 grid,
	// 2px round strokes, currentColor) so it sits with the nav's others.
	let { size = 24, ...rest } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	{...rest}
>
	<path d="M3 3l4 3h10l4-3v12a3 3 0 0 1-3 3h-7l-4 3.5V18H6a3 3 0 0 1-3-3Z" />
	<path d="M9 11.5h.01" />
	<path d="M15 11.5h.01" />
	<path d="M11 14.5q1 1 2 0" />
</svg>
