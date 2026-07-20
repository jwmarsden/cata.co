import { db } from '$lib/server/db';
import { media } from '$lib/server/db/media.schema';
import { eq } from 'drizzle-orm';

function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Registers the `![[image:MEDIA_ID]] {optional caption}` block directive,
 * embedding an admin-uploaded image at its 1200px "medium" size with a
 * click-to-open lightbox (wired up client-side via the `.lightbox-trigger`
 * class — see Lightbox.svelte).
 *
 * Shaped after the existing `scene` extension for the tokenizer, but the
 * renderer needs a DB lookup, and marked does NOT await a Promise returned
 * from a custom extension's `renderer` (it just stringifies it, producing
 * "[object Promise]"). The supported way to do async work per-token is
 * `walkTokens`, which marked chains across multiple `.use()` calls and does
 * await when `async: true` — so the lookup happens there, stashing the
 * resulting HTML on the token, and `renderer` just returns it synchronously.
 */
export function registerImageEmbed(markedInstance: { use: (...args: any[]) => void }) {
	markedInstance.use({
		async: true,
		extensions: [{
			name: 'media-image',
			level: 'block',
			start(src: string) {
				return src.indexOf('![[image:');
			},
			tokenizer(src: string) {
				const match = src.match(/^!\[\[image:([^\]]+)\]\](\s*\{([^}]*)\})?/);
				if (match) {
					return {
						type: 'media-image',
						raw: match[0],
						id: match[1].trim(),
						caption: match[3]?.trim() ?? '',
						html: '',
					};
				}
			},
			renderer(token: any) {
				return token.html;
			}
		}],
		async walkTokens(token: any) {
			if (token.type !== 'media-image') return;

			const rows = await db.select().from(media).where(eq(media.id, token.id)).limit(1);
			const row = rows[0];
			if (!row || !row.contentType.startsWith('image/')) {
				token.html = `<!-- image embed: media "${token.id}" not found -->`;
				return;
			}

			const alt = escapeAttr(token.caption || row.altText || row.friendlyName || '');
			const widthAttr = row.width ? ` width="${row.width}"` : '';
			const heightAttr = row.height ? ` height="${row.height}"` : '';
			const figcaption = token.caption ? `<figcaption>${token.caption}</figcaption>` : '';

			token.html = `<figure class="media-embed"><img src="/api/media/${row.id}/embed" data-full="/api/media/${row.id}/view" alt="${alt}"${widthAttr}${heightAttr} loading="lazy" class="lightbox-trigger" />${figcaption}</figure>`;
		}
	});
}
