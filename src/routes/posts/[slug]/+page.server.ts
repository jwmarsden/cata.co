import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import markedFootnote from 'marked-footnote';
import markedShiki from 'marked-shiki';
import markedKatex from 'marked-katex-extension';
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
marked.use(markedKatex({ throwOnError: false }));
marked.use({
	renderer: {
		image({ href, title, text }) {
			const parts = text.split('|');
			const alt = parts[0].trim();
			const size = parts[1]?.trim() ?? '';

			let widthAttr = '';
			let heightAttr = '';

			if (size) {
				const wxh = size.match(/^(\d+)x(\d+)$/);
				const wOnly = size.match(/^(\d+)$/);
				if (wxh) {
					widthAttr = ` width="${wxh[1]}"`;
					heightAttr = ` height="${wxh[2]}"`;
				} else if (wOnly) {
					widthAttr = ` width="${wOnly[1]}"`;
				}
			}

			const titleAttr = title ? ` title="${title}"` : '';
			return `<img src="${href}" alt="${alt}"${titleAttr}${widthAttr}${heightAttr} style="max-width:100%; height:auto;" />`;
		}
	}
});

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