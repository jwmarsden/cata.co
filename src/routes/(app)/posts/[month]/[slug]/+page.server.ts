import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { error } from '@sveltejs/kit';
import { marked } from '$lib/server/markdown';

export async function load({ params }) {
	console.log('Loading post:', params.slug);
	const filePath = path.resolve('src/posts', params.month, `${params.slug}.md`);

	if (!fs.existsSync(filePath)) {
		error(404, 'Post not found');
	}

	const raw = fs.readFileSync(filePath, 'utf-8');
	const { data, content } = matter(raw);
	const html = await marked(content);

	return {
		title: data.title ?? 'Untitled',
		date: data.date ? new Date(data.date).toISOString() : null,
		excerpt: data.excerpt ?? '',
		tags: data.tags ?? [],
		author: data.author ?? 'Unknown',
		html,
	};
}