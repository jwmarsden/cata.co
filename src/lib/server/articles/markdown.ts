import { marked, type Token } from 'marked';
import markedFootnote from 'marked-footnote';
import markedShiki from 'marked-shiki';
import markedKatex from 'marked-katex-extension';
import { createHighlighter } from 'shiki';

export interface TocEntry {
	title: string;
	id: string;
	level: number;
}

const highlighter = await createHighlighter({
	themes: ['github-light'],
	langs: ['typescript', 'javascript', 'python', 'sql', 'svelte', 'bash', 'json', 'css', 'html'],
});

marked.use(markedFootnote());
marked.use(markedShiki({
	highlight(code: string, lang: string | undefined) {
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
				if (wxh) { widthAttr = ` width="${wxh[1]}"`; heightAttr = ` height="${wxh[2]}"`; }
				else if (wOnly) { widthAttr = ` width="${wOnly[1]}"`; }
			}
			const titleAttr = title ? ` title="${title}"` : '';
			return `<img src="${href}" alt="${alt}"${titleAttr}${widthAttr}${heightAttr} style="max-width:100%; height:auto;" />`;
		},
		heading({ text, depth }) {
			// Add id to headings for TOC anchor links
			const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
			return `<h${depth} id="${id}">${text}</h${depth}>`;
		}
	}
});

export function extractToc(content: string): TocEntry[] {
	const toc: TocEntry[] = [];
	const headingRegex = /^(#{2,3})\s+(.+)$/gm;
	let match;

	while ((match = headingRegex.exec(content)) !== null) {
		const level = match[1].length;
		const text = match[2].trim();
		const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
		//console.log(`TOC entry found: level=${level} text="${text}" id="${id}"`);
		toc.push({ title: text, id, level });
	}

	console.log(`Total TOC entries: ${toc.length}`);
	return toc;
}

marked.use({
	extensions: [{
		name: 'scene',
		level: 'block',
		start(src: string) { return src.indexOf('![[scene:'); },
		tokenizer(src: string) {
			const match = src.match(/^!\[\[scene:([^\]]+)\]\](\s*\{([^}]*)\})?/);
			if (match) {
				return {
					type: 'scene',
					raw: match[0],
					name: match[1].trim(),
					caption: match[3]?.trim() ?? '',
				};
			}
		},
		renderer(token: any) {
			const height = 400;
			return `
				<div class="scene-embed" style="margin: 2rem 0;">
					<iframe
						src="/scenes/${token.name}"
						title="${token.caption || token.name}"
						style="width:100%;height:${height}px;border:none;border-radius:0.5rem;display:block;"
						loading="lazy"
					></iframe>
					${token.caption ? `<p style="text-align:center;font-size:0.85rem;color:#5A7A8A;margin-top:0.5rem;">${token.caption}</p>` : ''}
				</div>
			`;
		}
	}]
});

export { marked };