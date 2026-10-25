import fs from 'fs';
import path from 'path';
import { marked, type Token } from 'marked';
import markedFootnote from 'marked-footnote';
import markedShiki from 'marked-shiki';
import markedKatex from 'marked-katex-extension';
import { createHighlighter } from 'shiki';
import { registerImageEmbed } from '$lib/server/markdown/imageEmbed';
import { registerKatexPunctuationFix } from '$lib/server/markdown/katexPunctuationFix';

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
registerKatexPunctuationFix(marked);
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
						allow="fullscreen"
						allowfullscreen
					></iframe>
					${token.caption ? `<p style="text-align:center;font-size:0.85rem;color:#5A7A8A;margin-top:0.5rem;">${token.caption}</p>` : ''}
				</div>
			`;
		}
	}]
});

// ![[code:culling#rayTriangleIntersect]] quotes a function from a scene
// library (static/scene-files/lib/culling.js), with the comments above it,
// so articles show the code the scenes actually run.
const SCENE_LIB_DIR = path.resolve('static/scene-files/lib');

function extractFunction(source: string, name: string): string | null {
	const start = source.search(new RegExp(`^(export )?(async )?function ${name}\\(`, 'm'));
	if (start < 0) return null;

	// Walk to the matching closing brace, skipping strings and comments
	let depth = 0;
	let end = -1;
	for (let i = source.indexOf('{', start); i < source.length; i++) {
		const c = source[i];
		if (c === '/' && source[i + 1] === '/') { i = source.indexOf('\n', i); if (i < 0) break; continue; }
		if (c === '/' && source[i + 1] === '*') { i = source.indexOf('*/', i + 2) + 1; continue; }
		if (c === '"' || c === "'" || c === '`') {
			for (i++; i < source.length && source[i] !== c; i++) if (source[i] === '\\') i++;
			continue;
		}
		if (c === '{') depth++;
		else if (c === '}' && --depth === 0) { end = i + 1; break; }
	}
	if (end < 0) return null;

	// Take in the comment lines directly above the function
	const lines = source.slice(0, start).split('\n');
	lines.pop();
	const comment: string[] = [];
	while (lines.length && /^\s*\/\//.test(lines[lines.length - 1])) comment.unshift(lines.pop()!);

	return [...comment, source.slice(start, end)].join('\n');
}

marked.use({
	extensions: [{
		name: 'code-embed',
		level: 'block',
		start(src: string) { return src.indexOf('![[code:'); },
		tokenizer(src: string) {
			const match = src.match(/^!\[\[code:([\w-]+)#([\w$]+)\]\]/);
			if (match) {
				return { type: 'code-embed', raw: match[0], file: match[1], name: match[2] };
			}
		},
		renderer(token: any) {
			const file = `${token.file}.js`;
			let code: string | null = null;
			try {
				code = extractFunction(fs.readFileSync(path.join(SCENE_LIB_DIR, file), 'utf-8'), token.name);
			} catch {
				// missing file: reported below
			}
			if (!code) return `<!-- code embed: ${token.name} not found in ${file} -->`;
			const html = highlighter.codeToHtml(code, { lang: 'javascript', theme: 'github-light' });
			return `<div class="code-embed">${html}<p class="code-embed-source">From <a href="/api/scenes/lib/${file}"><code>${file}</code></a>, the code the scenes run.</p></div>`;
		}
	}]
});

registerImageEmbed(marked);

export { marked };