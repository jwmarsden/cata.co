<script lang="ts">
	let { children, data } = $props();
</script>

<div data-theme="cata" class="min-h-screen flex flex-col">
	<nav class="bg-ocean px-6 py-4 flex items-center justify-between">
		<span class="text-amber text-xl font-bold">CaTa Admin</span>
		<div class="flex items-center gap-6">
			<a href="/admin" class="text-mist-dark text-sm no-underline hover:text-amber">Dashboard</a>
			<a href="/admin/media" class="text-mist-dark text-sm no-underline hover:text-amber">Media</a>
			<a href="/admin/posts" class="text-mist-dark text-sm no-underline hover:text-amber">Posts</a>
			<form method="POST" action="/auth/signout">
				<input type="hidden" name="callbackUrl" value="/" />
				<button type="submit" class="text-mist-dark text-sm bg-transparent border-none cursor-pointer hover:text-amber">
					Sign out
				</button>
			</form>
		</div>
	</nav>

	<main class="w-full flex-1">
		{@render children()}
	</main>
</div>