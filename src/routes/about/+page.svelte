<script lang="ts">

	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import maplibregl from 'maplibre-gl';

	interface LocationData {
		city: string;
		latitude: number;
		longitude: number;
		country: string;
	}

	let mapContainer: HTMLElement;
	let map: maplibregl.Map;

	let clicking = $state(false);
	let locating = $state(false);
	let error = $state<string | null>(null);
	let location = $state<LocationData | null>(null);

	let location_map = new SvelteMap<string, {
		city: string;
		country: string;
		latitude: number;
		longitude: number;
		count: number;
	}>();

	let source: EventSource;

	let counter = 0;
	let activePopup: maplibregl.Popup | null = null;
	let flyTimeout: ReturnType<typeof setTimeout> | null = null;
	let isMidFly = false;

	const PAUSE_AT_DESTINATION = 4000;
	const FADE_IN_DELAY        = 400;
	const FADE_IN_DURATION     = 1000;
	const FADE_OUT_DURATION    = 600;

	function onTick() {
		if (flyTimeout) clearTimeout(flyTimeout);

		if (location_map.size === 0) {
			flyTimeout = setTimeout(onTick, 2000);
			return;
		}

		const keys = [...location_map.keys()];
		const index = counter % keys.length;
		counter += 1;
		const loc = location_map.get(keys[index]);
		if (!loc) {
			flyTimeout = setTimeout(onTick, 2000);
			return;
		}

		const prev = activePopup;
		activePopup = null;
		if (prev) {
			const el = prev.getElement();
			if (el) {
				el.style.transition = `opacity ${FADE_OUT_DURATION}ms ease`;
				el.style.opacity = '0';
			}
			setTimeout(() => prev.remove(), FADE_OUT_DURATION);
		}

		const popup = new maplibregl.Popup({ closeOnClick: false, closeButton: false })
			.setLngLat([loc.longitude, loc.latitude])
			.setHTML(`<div id="popup-content">${loc.count} check-in${loc.count !== 1 ? 's' : ''} from ${loc.city}, ${loc.country}</div>`);

		popup.addTo(map);
		const el = popup.getElement();
		if (el) {
			el.style.opacity = '0';
			el.style.transition = 'none';
		}
		activePopup = popup;
		isMidFly = true;

		map.flyTo({
			center: [loc.longitude, loc.latitude],
			zoom: 10,
			speed: 0.6,
			essential: true,
		});
	}

	onMount(() => {
		source = new EventSource('/api');
		source.onmessage = (e) => {
			const data = JSON.parse(e.data);
			location_map.set(data.city, {
				city: data.city,
				country: data.country,
				latitude: data.latitude,
				longitude: data.longitude,
				count: data.count
			});
		};

		map = new maplibregl.Map({
			container: 'map',
			style: {
				version: 8,
				projection: { type: 'globe' },
				sources: {
					satellite: {
						tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'],
						type: 'raster'
					}
				},
				layers: [{ id: 'Satellite', type: 'raster', source: 'satellite' }],
				light: { anchor: 'map', position: [1.5, 90, 80] }
			},
			zoom: 2,
			cooperativeGestures: true,
			maplibreLogo: false,
		});

		map.boxZoom.disable();
		map.scrollZoom.disable();
		map.dragPan.disable();
		map.dragRotate.disable();
		map.keyboard.disable();
		map.doubleClickZoom.disable();
		map.touchZoomRotate.disable();
		map.touchPitch.disable();

		map.addControl(new maplibregl.FullscreenControl());

		map.on('moveend', () => {
			if (!isMidFly) return;
			isMidFly = false;

			setTimeout(() => {
				if (!activePopup) return;
				const el = activePopup.getElement();
				if (el) {
					el.style.transition = `opacity ${FADE_IN_DURATION}ms ease`;
					el.style.opacity = '1';
				}
				// Pause at destination, then fly to next
				flyTimeout = setTimeout(onTick, PAUSE_AT_DESTINATION);
			}, FADE_IN_DELAY);
		});

		map.on('load', () => {
			flyTimeout = setTimeout(onTick, 1500);
		});

		return () => {
			source?.close();
			if (flyTimeout) clearTimeout(flyTimeout);
			map?.remove();
		};
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
				return;
			}

			if (!res.ok) {
				error = 'Something went wrong.';
				setTimeout(() => error = '', 5000);
				return;
			}

			const data = await res.json();
			location_map.set(data.city, {
				city: data.city,
				country: data.country,
				latitude: data.latitude,
				longitude: data.longitude,
				count: data.count
			});

		} catch (e) {
			error = e instanceof Error ? e.message : 'Network error';
			setTimeout(() => error = '', 5000);
		} finally {
			setTimeout(() => clicking = false, 1000);
		}
	}

</script>

<svelte:head>
	<link rel='stylesheet' href='https://unpkg.com/maplibre-gl@5.3.0/dist/maplibre-gl.css' />
</svelte:head>

<style>
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
		width: 70%;
		background-color: #0a0a1a;
		background-image:
			radial-gradient(1px 1px at 10% 20%, white, transparent),
			radial-gradient(1px 1px at 25% 75%, white, transparent),
			radial-gradient(1px 1px at 40% 10%, white, transparent),
			radial-gradient(1px 1px at 55% 55%, white, transparent),
			radial-gradient(1px 1px at 70% 30%, white, transparent),
			radial-gradient(1px 1px at 85% 80%, white, transparent),
			radial-gradient(1.5px 1.5px at 15% 45%, white, transparent),
			radial-gradient(1.5px 1.5px at 35% 90%, white, transparent),
			radial-gradient(1.5px 1.5px at 60% 15%, white, transparent),
			radial-gradient(1.5px 1.5px at 80% 60%, white, transparent),
			radial-gradient(1px 1px at 5% 60%, rgba(255,255,255,0.6), transparent),
			radial-gradient(1px 1px at 45% 35%, rgba(255,255,255,0.6), transparent),
			radial-gradient(1px 1px at 65% 85%, rgba(255,255,255,0.6), transparent),
			radial-gradient(1px 1px at 90% 15%, rgba(255,255,255,0.6), transparent),
			radial-gradient(1px 1px at 20% 5%, rgba(255,255,255,0.4), transparent),
			radial-gradient(1px 1px at 75% 50%, rgba(255,255,255,0.4), transparent),
			radial-gradient(1px 1px at 50% 70%, rgba(255,255,255,0.4), transparent),
			radial-gradient(1px 1px at 30% 25%, rgba(255,255,255,0.4), transparent);
	}
</style>

<section>
	<div class="container text-center">
		<h1>Very Humble Beginnings for CaTa</h1>
		<p class="text-muted">A clean start with a calm ocean, mist, and amber palette.</p>
		<div class="flex gap-1" style="justify-content: center; margin-top: 1.5rem;">
			<button type="button" class="btn btn-primary" onclick={() => handleClick(location)} disabled={clicking || locating}>I want to check in!</button>
		</div>
		{#if error}
			<div class="error">{error}</div>
		{/if}
	</div>
	<div id="map" bind:this={mapContainer}></div>
</section>

<hr>