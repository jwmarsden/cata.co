import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { media } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export async function GET({ locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const files = await db.select().from(media).orderBy(desc(media.uploadedAt));
	return json({ files });
}