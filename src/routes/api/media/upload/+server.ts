import { s3 } from '$lib/server/bucket/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { BUCKET_NAME } from '$env/static/private';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { media } from '$lib/server/db/schema';
import { generateImageThumbnail, generateVideoThumbnail } from '$lib/server/bucket/thumbnail';

export async function POST({ request, locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const formData = await request.formData();
	const file = formData.get('file') as File;
	const friendlyName = (formData.get('friendlyName') as string)?.trim();
	const altText = (formData.get('altText') as string)?.trim() ?? '';
	const description = (formData.get('description') as string)?.trim() ?? '';

	if (!file) error(400, 'No file provided');
	if (!friendlyName) error(400, 'Friendly name required');

	const ext = file.name.split('.').pop()?.toLowerCase();
	const id = crypto.randomUUID();
	const key = `media/${id}.${ext}`;
	const buffer = Buffer.from(await file.arrayBuffer());

	// Upload original
	await s3.send(new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
		Body: buffer,
		ContentType: file.type,
	}));

	// Generate thumbnail
	let thumbnailKey: string | null = null;
	try {
		if (file.type.startsWith('image/')) {
			thumbnailKey = await generateImageThumbnail(buffer, id);
		} else if (file.type.startsWith('video/')) {
			thumbnailKey = await generateVideoThumbnail(buffer, id);
		}
	} catch (err) {
		// Log but don't fail the upload if thumbnail generation fails
		console.error('Thumbnail generation failed:', err);
	}

	await db.insert(media).values({
		id,
		key,
		thumbnailKey,
		filename: file.name,
		friendlyName,
		altText,
		description,
		contentType: file.type,
		size: file.size,
	});

	return json({ id, key });
}