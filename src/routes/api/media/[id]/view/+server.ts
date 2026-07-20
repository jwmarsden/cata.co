import { serveImageVariant } from '$lib/server/bucket/serveMedia';
import { generateLightboxVariant } from '$lib/server/bucket/thumbnail';

// Public, unauthenticated: serves the ~2000px lightbox variant for images
// referenced via the `![[image:ID]]` markdown directive.
export async function GET({ params }) {
	return serveImageVariant(params.id, 'largeKey', generateLightboxVariant);
}
