import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import markedFootnote from 'marked-footnote';
import markedShiki from 'marked-shiki';
import { createHighlighter } from 'shiki';
import { error } from '@sveltejs/kit';

const highlighter = await createHighlighter({
	themes: ['github-light'],
	langs: ['typescript', 'javascript', 'python', 'sql', 'svelte', 'bash', 'json', 'css', 'html'],
});

marked.use(markedFootnote());
marked.use(markedShiki({
	highlight(code, lang) {
		return highlighter.codeToHtml(code, {
			lang: lang || 'plaintext',
			theme: 'github-light',
		});
	}
}));

export async function load({ params }) {
	const filePath = path.resolve('src/posts', `${params.slug}.md`);

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
		html,
	};
}