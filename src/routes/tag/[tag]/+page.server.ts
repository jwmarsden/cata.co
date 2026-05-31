import { getTag } from '$lib/server/tags/tag-controller';
import { Tag } from '$lib/server/tags/tag';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const tagData = await getTag(params.tag);

	if (!tagData) {
		error(404, `Tag "${params.tag}" not found`);
	}

	// Deserialize using fromJSON so we get a proper Tag instance
	const tag = Tag.fromJSON(tagData);

	return {
		tag: tag.toJSON(),
	};
}