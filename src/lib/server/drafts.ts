import { dev } from '$app/environment';

// A post or article with `draft: true` in its frontmatter is shown when
// running locally (npm run dev) and hidden everywhere in production:
// listings, tags and its own page.
export function isHidden(data: { draft?: unknown }): boolean {
	return data.draft === true && !dev;
}
