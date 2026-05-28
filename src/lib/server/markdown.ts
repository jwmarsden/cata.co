import { marked } from 'marked';
import markedFootnote from 'marked-footnote';
import markedShiki from 'marked-shiki';
import markedKatex from 'marked-katex-extension';
import { createHighlighter } from 'shiki';

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

export { marked };