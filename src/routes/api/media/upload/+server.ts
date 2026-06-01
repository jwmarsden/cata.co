import { s3 } from '$lib/server/bucket/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { BUCKET_NAME } from '$env/static/private';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { media } from '$lib/server/db/schema';
import { generateImageThumbnail } from '$lib/server/bucket/thumbnail';
import { syncMediaTagsToRedis } from '$lib/server/tags/tag-sync';

export async function POST({ request, locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const formData = await request.formData();
	const file = formData.get('file') as File;
	const thumbnail = formData.get('thumbnail') as File | null;
	const friendlyName = (formData.get('friendlyName') as string)?.trim();
	const altText = (formData.get('altText') as string)?.trim() ?? '';
	const description = (formData.get('description') as string)?.trim() ?? '';

	if (!file) error(400, 'No file provided');
	if (!friendlyName) error(400, 'Friendly name required');

	const ext = file.name.split('.').pop()?.toLowerCase();
	const id = crypto.randomUUID();
	const key = `media/${id}.${ext}`;
	const buffer = Buffer.from(await file.arrayBuffer());

	// Upload original file
	await s3.send(new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
		Body: buffer,
		ContentType: file.type,
	}));

	// Generate or use pre-supplied thumbnail
	let thumbnailKey: string | null = null;
	try {
		if (thumbnail) {
			// Use client-side generated thumbnail (video)
			const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());
			thumbnailKey = `thumbnails/${id}.jpg`;
			await s3.send(new PutObjectCommand({
				Bucket: BUCKET_NAME,
				Key: thumbnailKey,
				Body: thumbBuffer,
				ContentType: 'image/jpeg',
			}));
		} else if (file.type.startsWith('image/')) {
			// Generate server-side thumbnail for images
			thumbnailKey = await generateImageThumbnail(buffer, id);
		}
	} catch (err) {
		console.error('Thumbnail failed:', err);
	}

	const tagsRaw = formData.get('tags') as string;
	const tags = tagsRaw ? JSON.parse(tagsRaw) : [];

	await db.insert(media).values({
		id,
		key,
		thumbnailKey,
		filename: file.name,
		friendlyName,
		altText,
		description,
		tags: JSON.stringify(tags),
		contentType: file.type,
		size: file.size,
	});

	await syncMediaTagsToRedis();

	return json({ id, key });
}