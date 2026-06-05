import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked, extractToc } from '$lib/server/articles/markdown';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const filePath = path.resolve('src/articles', params.month, `${params.slug}.md`);

	if (!fs.existsSync(filePath)) {
		error(404, 'Article not found');
	}

	const raw = fs.readFileSync(filePath, 'utf-8');
	const { data, content } = matter(raw);
	const html = await marked(content);

	// Use frontmatter TOC if provided, otherwise auto-generate
	const toc = data.toc ?? extractToc(content);

	return {
		title: data.title ?? 'Untitled',
		date: data.date ? new Date(data.date).toISOString() : null,
		excerpt: data.excerpt ?? '',
		author: data.author ?? 'Unknown',
		tags: data.tags ?? [],
		toc,
		html,
	};
}