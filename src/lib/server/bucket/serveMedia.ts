import { s3 } from './s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { BUCKET_NAME } from '$env/static/private';
import { db } from '$lib/server/db';
import { media, type Media } from '$lib/server/db/media.schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * Serves a resized image variant (medium/large) for an unauthenticated public request.
 * Lazily generates + persists the variant on first request if it's missing,
 * so pre-existing media doesn't need a batch migration.
 */
export async function serveImageVariant(
	id: string,
	variantField: 'mediumKey' | 'largeKey',
	generate: (sourceBuffer: Buffer, id: string) => Promise<string>
): Promise<Response> {
	const rows = await db.select().from(media).where(eq(media.id, id)).limit(1);
	if (!rows.length) error(404, 'Not found');

	const row: Media = rows[0];
	if (!row.contentType.startsWith('image/')) error(404, 'Not an image');

	let key = row[variantField];

	if (!key) {
		const original = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: row.key }));
		const sourceBuffer = Buffer.from(await original.Body!.transformToByteArray());
		key = await generate(sourceBuffer, id);
		await db.update(media).set({ [variantField]: key }).where(eq(media.id, id));
	}

	const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
	const bytes = await res.Body!.transformToByteArray();

	return new Response(bytes as unknown as BodyInit, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': CACHE_CONTROL,
			'Content-Disposition': 'inline',
		},
	});
}
