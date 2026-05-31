import { getAllTags } from '$lib/server/tags/tag-controller';

export async function load() {
	const tags = await getAllTags();
	return {
		tags: tags.map(t => t.toJSON()).sort((a, b) => b.occurrences - a.occurrences),
	};
}