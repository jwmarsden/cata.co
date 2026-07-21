import katex from 'katex';

/**
 * marked-katex-extension's inline rule requires the character immediately
 * after the closing `$` to be one of a fixed whitelist — whitespace or
 * `?!.,:` (see node_modules/marked-katex-extension/src/index.js). Semicolons,
 * closing brackets, and quotes aren't in that set, so e.g. `$z$;` silently
 * fails to render and falls through as literal text.
 *
 * This registers a second inline extension with a wider trailing-punctuation
 * set. It must be registered AFTER markedKatex() — marked tries inline
 * extensions in registration order and stops at the first one that produces
 * a token, so this only ever fires for the cases the upstream extension
 * already declined (e.g. `$y$,` still matches upstream's own rule first,
 * unchanged).
 */
const TRAILING_PUNCTUATION = /[\s?!.,:;)\]'"’”]/;
const inlineRule = /^\$(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\$/;

export function registerKatexPunctuationFix(markedInstance: { use: (...args: any[]) => void }) {
	markedInstance.use({
		extensions: [{
			name: 'inlineKatexPunctuationFix',
			level: 'inline',
			start(src: string) {
				const index = src.indexOf('$');
				return index === -1 ? undefined : index;
			},
			tokenizer(src: string) {
				const match = src.match(inlineRule);
				if (!match) return;

				const after = src.slice(match[0].length, match[0].length + 1);
				if (after && !TRAILING_PUNCTUATION.test(after)) return;

				return {
					type: 'inlineKatexPunctuationFix',
					raw: match[0],
					text: match[1].trim(),
				};
			},
			renderer(token: any) {
				return katex.renderToString(token.text, { throwOnError: false });
			}
		}]
	});
}
