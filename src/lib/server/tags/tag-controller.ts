import redis from '$lib/server/mem/redis';
import { Tag } from './tag';

const TAGS_KEY = 'tag';

export async function createTag(tag: Tag): Promise<Tag> {
  await redis.set(
    `${TAGS_KEY}:${tag.name}`,
    JSON.stringify(tag)
  );
  return tag;
}

export async function getTag(tagHash: string): Promise<Tag | null> {
  const val = await redis.get(`${TAGS_KEY}:${tagHash}`);
  if (!val) return null;
  try {
    return JSON.parse(val) as Tag;
  } catch {
    return null;
  }
}

export async function updateTag(tag: Partial<Tag>): Promise<void> {
  const existing = await getTag(tag.name!);
  if (!existing) return;
  await redis.set(
    `${TAGS_KEY}:${tag.name}`,
    JSON.stringify({ ...existing, ...tag }),
  );
}

export async function getAllTags(): Promise<Tag[]> {
	const keys = await redis.keys(`${TAGS_KEY}:*`);
	if (!keys.length) return [];

	const values = await redis.mget(...keys);
	return values
		.filter(Boolean)
		.map(v => Tag.fromJSON(JSON.parse(v!)));
}