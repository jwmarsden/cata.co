<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
</script>

<section>
	<div class="container" style="max-width: 400px; margin-top: 4rem; text-align: center;">
		<h1 class="mb-4">Admin</h1>
		<p class="text-muted mb-4">Sign in with your GitHub account to access the admin area.</p>
		<button class="btn btn-primary" onclick={() => signIn('github', { callbackUrl: '/admin' })}>
			Sign in with GitHub
		</button>
	</div>
</section>