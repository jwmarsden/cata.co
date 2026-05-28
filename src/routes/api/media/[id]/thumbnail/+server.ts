import { s3 } from '$lib/server/bucket/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BUCKET_NAME } from '$env/static/private';
import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { media } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params, locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const file = await db.select().from(media).where(eq(media.id, params.id)).limit(1);
	if (!file.length) error(404, 'Not found');
	if (!file[0].thumbnailKey) error(404, 'No thumbnail');

	const url = await getSignedUrl(s3, new GetObjectCommand({
		Bucket: BUCKET_NAME,
		Key: file[0].thumbnailKey,
	}), { expiresIn: 3600 });

	redirect(302, url);
}