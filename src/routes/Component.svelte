<script>
	let { initial = 0 } = $props()
	let count = $state(initial)
</script>

intial: {initial}<br>
<div>
	<button onclick={() => count--}>-</button>
	<span>{count}</span>
	<button onclick={() => count++}>+</button>
</div>

<style>
	div {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	span {
		text-align: center;
	}

	button, span {
		flex: 1;
	}
</style>