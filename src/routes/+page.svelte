<script lang="ts">
	
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	let clicking = $state(false);
	let location_map = new SvelteMap<string, { city: string; country: string; latitude: number; longitude: number; count: number }>();

	let source: EventSource;
	let error = $state<string | null>(null);
	let locating = $state(false);

	interface LocationData {
		city: string;
		latitude: number;
		longitude: number;
		country: string;
		source: 'browser' | 'ip';
	}

	let location: LocationData | null = $state(null);
	let loading = $state(true);

	onMount(() => {
		source = new EventSource('/api');
		source.onmessage = (e) => {
			const data = JSON.parse(e.data);
			location_map.set(data.city, { city: data.city, country: data.country, latitude: data.lat, longitude: data.lon, count: data.count });
			//console.log('Received Location:', data.city, data.latitude, data.longitude, data.count);
		};
	});

	onDestroy(() => {
		source?.close();
	});

	async function handleClick(location: LocationData | null) {

		clicking = true;
		try {
			const res = await fetch('/api', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

		if (res.status === 429) {
			error = 'Too many clicks — slow down!';
			setTimeout(() => error = '', 5000);
		}

		if (!res.ok) {
			error =  'Something went wrong.'
			setTimeout(() => error = '', 5000);
		}

		const data = await res.json();

		if (location_map.has(data.city)) {
			location_map.set(data.city, { city: data.city, country: data.country, latitude: data.lat, longitude: data.lon, count: data.count });
		} else {
			location_map.set(data.city, { city: data.city, country: data.country, latitude: data.lat, longitude: data.lon, count: data.count });
		}

		} catch (e) {
			error = e instanceof Error ? e.message : 'Network error';
			setTimeout(() => error = '', 5000);
		} finally {
			// 1s cooldown before allowing another click
			setTimeout(() => clicking = false, 1000);
		}
	}

	onMount(() => {
	});
</script>

<style>
	h1 {
		color: #003607;
	}
</style>

<nav id="top">
<a href="/" class="logo">CaTa</a>
<ul>
	<li><a href="/" class="active">Home</a></li>
</ul>
</nav>
<section>
	<div class="container text-center">
		<h1>Very Humble Beginnings for CaTa</h1>
		<p class="text-muted">A clean start with a calm ocean, mist, and amber palette.</p>
		<div class="flex gap-1" style="justify-content: center; margin-top: 1.5rem;">
			<button type="button" class="btn btn-primary" onclick={() => handleClick(location)} disabled={clicking || locating}>Click?</button>
		</div>
		{#if error}
			<p class="error">{error}</p>
		{/if}
	</div>
	<div class="container text-center">
		<ul class="list-centered mb-4">
			{#each location_map.entries() as [city, location_clicks] }
				<li>{city}, {location_clicks.country}: {location_clicks.count}</li>
			{/each}
			</ul>
	</div>
</section>

<hr>

<section>
<div class="container">
	<h2 class="mb-4">Featured</h2>
	<div class="flex flex-wrap gap-2">

	<div class="card" style="flex: 1; min-width: 220px;">
		<span class="badge badge-ocean mb-2">New</span>
		<h3>Card title</h3>
		<p class="text-muted">Some supporting text that describes what this card is about in a sentence or two.</p>
		<a href="/">Read more →</a>
	</div>

	<div class="card card-accent" style="flex: 1; min-width: 220px;">
		<span class="badge badge-amber mb-2">Featured</span>
		<h3>Accented card</h3>
		<p class="text-muted">This one uses the amber left border to draw attention to important content.</p>
		<a href="/">Read more →</a>
	</div>

	<div class="card" style="flex: 1; min-width: 220px;">
		<span class="badge badge-mist mb-2">Draft</span>
		<h3>Another card</h3>
		<p class="text-muted">Cards sit on the misty blue surface, keeping them distinct from the warm off-white page.</p>
		<a href="/">Read more →</a>
	</div>

	</div>
</div>
</section>

<hr>

<section>
<div class="container" style="max-width: 520px;">
	<h2 class="mb-4">Get in touch</h2>
	<div class="mb-2">
	<label for="name">Your name</label>
	<input type="text" id="name" placeholder="Jane Smith">
	</div>
	<div class="mb-2">
	<label for="email">Email address</label>
	<input type="email" id="email" placeholder="jane@example.com">
	</div>
	<div class="mb-4">
	<label for="message">Message</label>
	<textarea id="message" rows="4" placeholder="Say hello…"></textarea>
	</div>
	<button class="btn btn-primary">Send message</button>
</div>
</section>

<hr>

<footer>
<p>&copy; 2026 Cata.co | <a href="#top">Back to top</a></p>
</footer>
