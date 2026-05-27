<script lang="ts">
	let { data } = $props();
</script>

<section>
	<div class="container" style="margin-top: 2rem;">
		<h1 class="mb-2">Dashboard</h1>
		<p class="text-muted">Welcome back, {data.session?.user?.name ?? 'Guest'}.</p>

		<div class="flex flex-wrap gap-2" style="margin-top: 2rem;">
			<div class="card" style="flex: 1; min-width: 200px;">
				<h3>Posts</h3>
				<p class="text-muted">Write and manage blog posts.</p>
				<a href="/admin/posts">Manage posts →</a>
			</div>
			<div class="card" style="flex: 1; min-width: 200px;">
				<h3>Media</h3>
				<p class="text-muted">Upload and manage media files.</p>
				<a href="/admin/media">Manage media →</a>
			</div>
		</div>
	</div>
</section>