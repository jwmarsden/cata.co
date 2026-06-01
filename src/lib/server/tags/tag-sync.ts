import { db } from '$lib/server/db';
import { media } from '$lib/server/db/schema';
import { createTag, getTag, updateTag } from './tag-controller';
import { Tag } from './tag';

export async function syncMediaTagsToRedis(): Promise<void> {
	console.log('Syncing media tags to Redis...');

	const allMedia = await db.select({
		id: media.id,
		friendlyName: media.friendlyName,
		tags: media.tags,
		key: media.key,
	}).from(media);

	// Build a map of tag -> Tag instances
	const tagMap = new Map<string, Tag>();

	for (const item of allMedia) {
		const tags: string[] = JSON.parse(item.tags ?? '[]');
		const url = `/api/media/${item.id}?redirect=true`;
		const description = item.friendlyName;

		for (const tagName of tags) {
			if (!tagMap.has(tagName)) {
				tagMap.set(tagName, new Tag(tagName));
			}
			tagMap.get(tagName)!.addInstance('media', url, description);
		}
	}

	// Write each tag to Redis
	for (const tag of tagMap.values()) {
		const existing = await getTag(tag.name);
		if (existing) {
			await updateTag(tag);
		} else {
			await createTag(tag);
		}
	}

	console.log(`Synced ${tagMap.size} tags to Redis`);
}