import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function load() {
	const postsDir = path.resolve('src/posts');
	const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

	const posts = files.map(filename => {
		const raw = fs.readFileSync(path.join(postsDir, filename), 'utf-8');
		const { data } = matter(raw);
		return {
			slug: filename.replace('.md', ''),
			title: data.title ?? 'Untitled',
			date: data.date ? new Date(data.date).toISOString() : null,
			excerpt: data.excerpt ?? '',
		};
	});

	// Sort newest first
	posts.sort((a, b) => {
		if (!a.date) return 1;
		if (!b.date) return -1;
		return new Date(b.date).getTime() - new Date(a.date).getTime();
	});

	return { posts };
}