<script lang="ts">
  import { dev } from '$app/environment';
  export let measurementId = 'G-5Q8B1PCVHZ';
</script>
<!-- Load the Google Analytics Script -->
<svelte:head>
<script async src="https://www.googletagmanager.com/gtag/js?id={measurementId}"></script>
<script>
    import { afterNavigate } from '$app/navigation';
    // Replace with your actual GA4 Measurement ID (e.g., G-XXXXXXXXXX)
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    
    // Initialize without sending an automatic page view 
    // (because afterNavigate handles the first load and subsequent changes)
    gtag('config', measurementId, { send_page_view: false });

    afterNavigate(({ to }) => {
        // Prevent t
        // racking in local development or if GA isn't loaded
        if (dev || !to || typeof gtag === 'undefined') return;

        // Track the pageview in SvelteKit's client-side router
        gtag('config', measurementId, {
            page_path: to.url.pathname
        });
    });
</script>
</svelte:head>