import { serveImageVariant } from '$lib/server/bucket/serveMedia';
import { generateEmbedVariant } from '$lib/server/bucket/thumbnail';

// Public, unauthenticated: serves the ~1200px in-body variant for images
// referenced via the `![[image:ID]]` markdown directive.
export async function GET({ params }) {
	return serveImageVariant(params.id, 'mediumKey', generateEmbedVariant);
}
