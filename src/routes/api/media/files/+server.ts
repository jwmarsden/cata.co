import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { media } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { getAllTags } from '$lib/server/tags/tag-controller';

export async function GET({ locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const files = await db.select().from(media).orderBy(desc(media.uploadedAt));
	const tags = await getAllTags();

	return json({
		files: files.map(f => ({
			...f,
			tags: JSON.parse(f.tags ?? '[]'),
		})),
		availableTags: tags.map(t => t.name),
	});
}