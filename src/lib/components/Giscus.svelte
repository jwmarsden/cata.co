<script lang="ts">
	import { onMount } from 'svelte';
    import {
		PUBLIC_GISCUS_REPO,
		PUBLIC_GISCUS_REPO_ID,
		PUBLIC_GISCUS_CATEGORY,
		PUBLIC_GISCUS_CATEGORY_ID
	} from '$env/static/public';

	let container: HTMLDivElement;

	onMount(() => {
        let giscusRepo = PUBLIC_GISCUS_REPO;
        let giscusRepoID = PUBLIC_GISCUS_REPO_ID;
        let giscusCategory = PUBLIC_GISCUS_CATEGORY;
        let giscusCategoryID = PUBLIC_GISCUS_CATEGORY_ID;

        if (!giscusRepo || !giscusRepoID || !giscusCategory || !giscusCategoryID) {
            console.error('Giscus configuration is missing. Please set the environment variables for Giscus.');
            return;
        }

		const script = document.createElement('script');
		script.src = 'https://giscus.app/client.js';
		script.setAttribute('data-repo', giscusRepo);
		script.setAttribute('data-repo-id', giscusRepoID);
		script.setAttribute('data-category', giscusCategory);
		script.setAttribute('data-category-id', giscusCategoryID);
		script.setAttribute('data-mapping', 'pathname');
		script.setAttribute('data-strict', '0');
		script.setAttribute('data-reactions-enabled', '1');
		script.setAttribute('data-emit-metadata', '0');
		script.setAttribute('data-input-position', 'bottom');
		script.setAttribute('data-theme', 'light');
		script.setAttribute('data-lang', 'en');
		script.crossOrigin = 'anonymous';
		script.async = true;
		container.appendChild(script);
	});
</script>

<div class="giscus-wrapper" bind:this={container}></div>

<style>
	.giscus-wrapper {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid #ddd;
	}
</style>