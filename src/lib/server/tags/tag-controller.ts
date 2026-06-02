import redis from '$lib/server/mem/redis';
import { Tag } from './tag';

const TAGS_KEY = 'tag';

export async function createTag(tag: Tag): Promise<Tag> {
	await redis.set(`${TAGS_KEY}:${tag.name}`, JSON.stringify(tag.toJSON()));
	return tag;
}

export async function getTag(tagName: string): Promise<Tag | null> {
	const val = await redis.get(`${TAGS_KEY}:${tagName}`);
	if (!val) return null;
	try {
		return Tag.fromJSON(JSON.parse(val));
	} catch {
		return null;
	}
}

export async function updateTag(tag: Tag): Promise<void> {
	await redis.set(`${TAGS_KEY}:${tag.name}`, JSON.stringify(tag.toJSON()));
}

export async function getAllTags(): Promise<Tag[]> {
	const keys = await redis.keys(`${TAGS_KEY}:*`);
	if (!keys.length) return [];
	const values = await redis.mget(...keys);
	return values
		.filter(Boolean)
		.map(v => Tag.fromJSON(JSON.parse(v!)));
}

export async function deleteAllTags(): Promise<void> {
	const keys = await redis.keys(`${TAGS_KEY}:*`);
	if (keys.length) {
		await redis.del(...keys);
	}
}

export async function deleteTag(tagName: string): Promise<void> {
	await redis.del(`${TAGS_KEY}:${tagName}`);
}