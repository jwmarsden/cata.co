<script lang="ts">
	
	import { onMount } from 'svelte';
	let clicks: number = 0;
	interface LocationData {
		lat: number;
		lon: number;
		city: string;
		source: 'browser' | 'ip';
	}

	let location: LocationData | null = null;
	let loading = true;

	// Fallback function using a free IP API
	async function getIPLocation() {
		try {
			const res = await fetch('https://ipapi.co/json/');
			const data = await res.json();
			location = {
			lat: data.latitude,
			lon: data.longitude,
			city: data.city,
			source: 'ip'
			};
		} catch (e) {
			console.error('IP Geolocation failed', e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		getIPLocation();
	});

	function addToClicks() {
		clicks += 1;
	}

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
	<button type="button" class="btn btn-primary" onclick={addToClicks}>Clicked</button>
	</div>
	<p class="text-muted">{clicks} times.</p>
	{#if loading}
	<p>Determining your location...</p>
	{:else if location}
	<p>Coordinates: {location.lat}, {location.lon}</p>
	{/if}
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
