<script lang="ts">
	
	import { onMount, mount, unmount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	import maplibregl from 'maplibre-gl'
	import Component from "./Component.svelte"
	
	let mapContainer
	let map: maplibregl.Map
	let componentMount

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
			location_map.set(data.city, { city: data.city, country: data.country, latitude: data.latitude, longitude: data.longitude, count: data.count });
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
			location_map.set(data.city, { city: data.city, country: data.country, latitude: data.latitude, longitude: data.longitude, count: data.count });
		} else {
			location_map.set(data.city, { city: data.city, country: data.country, latitude: data.latitude, longitude: data.longitude, count: data.count });
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
		map = new maplibregl.Map({
			container: 'map', // container id
			style: 'https://tiles.openfreemap.org/styles/bright', // style URL
			center: [0,0], // starting position [lng, lat]
			zoom: 5, // starting zoom
			cooperativeGestures: true,
			maplibreLogo: false,
		});

		map.on('style.load', () => {
			map.setProjection({
				type: 'globe', // Set projection to globe
			});
		});
		map.addControl(new maplibregl.FullscreenControl());
		map.addControl(new maplibregl.NavigationControl());

		// mount the Svelte component
		const componentDom = document.createElement("div")
		componentMount = mount(Component, {
			target: componentDom,
			props: {initial: 13}
		})

	});

	function onTick() {
		counter += 1
		if (location_map.size === 0) return;
		const keys = location_map.keys().toArray();
		
		const randomIndex = Math.floor(Math.random() * keys.length);   		
    	const randomValue = location_map.get(keys[randomIndex]);
		if (!randomValue) return;

		console.log('Random Location:', randomValue);
		map.flyTo({ center: [randomValue.longitude, randomValue.latitude], zoom: 8, essential: true })

		working = false;
	}
	
	let ms = 10000
	let counter = 0
	
	let clear
	let working: boolean = false
	onTick();
	if (!working) {
		working = true;
		//clearInterval(clear)
		clear = setInterval(onTick, ms)
	}

</script>

<svelte:head>
    <link rel='stylesheet' href='https://unpkg.com/maplibre-gl@5.3.0/dist/maplibre-gl.css' />	
</svelte:head>

<style>
	:global(*) {
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
	}

	:global(#marker) {
		background: yellow;
		border: 4px solid red;
		width: 50px;
		height: 50px;
		border-radius: 50%;
		cursor: pointer;
	}

	:global(.maplibregl-popup) {
		min-width: 200px;
		max-width: 300px;
		color: black;
	}

	#map {
		border: 1px solid #ccc;
		margin-top: 10px;
		margin-bottom: 10px;
		margin-left: auto;
		margin-right: auto;
		text-align: center;
		height: 400px;
		width: 90%;
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
	<div id="map" bind:this={mapContainer}></div>
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
