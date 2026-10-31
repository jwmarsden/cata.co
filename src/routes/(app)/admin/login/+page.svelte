<script lang="ts">
	import { signIn, signOut } from '@auth/sveltekit/client';
	let { data } = $props();
</script>

<section>
	<div class="container" style="max-width: 400px; margin-top: 4rem; text-align: center;">
		<h1 class="mb-4">Admin</h1>
		{#if data.signedInAs}
			<p class="text-muted mb-4">
				You're signed in as {data.signedInAs}, which isn't the admin account.
			</p>
			<button class="btn" onclick={() => signOut({ callbackUrl: '/admin/login' })}>Sign out</button>
		{:else}
			<p class="text-muted mb-4">Sign in with your GitHub account to access the admin area.</p>
			<button class="btn btn-primary" onclick={() => signIn('github', { callbackUrl: '/admin' })}>
				Sign in with GitHub
			</button>
		{/if}
	</div>
</section>
