import sharp from 'sharp';
import { execFileSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { s3 } from './s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { BUCKET_NAME } from '$env/static/private';

const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 300;
const EMBED_MAX_WIDTH = 1200;
const LIGHTBOX_MAX_WIDTH = 2000;

async function uploadJpeg(key: string, buffer: Buffer): Promise<void> {
	await s3.send(new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
		Body: buffer,
		ContentType: 'image/jpeg',
	}));
}

export async function generateImageThumbnail(
	sourceBuffer: Buffer,
	id: string
): Promise<string> {
	const thumbnailKey = `thumbnails/${id}.jpg`;

	const thumbnail = await sharp(sourceBuffer)
		.resize(THUMB_WIDTH, THUMB_HEIGHT, {
			fit: 'cover',
			position: 'centre',
		})
		.jpeg({ quality: 80 })
		.toBuffer();

	await uploadJpeg(thumbnailKey, thumbnail);
	return thumbnailKey;
}

export async function getImageDimensions(
	sourceBuffer: Buffer
): Promise<{ width: number | null; height: number | null }> {
	const meta = await sharp(sourceBuffer).metadata();
	return { width: meta.width ?? null, height: meta.height ?? null };
}

export async function generateEmbedVariant(
	sourceBuffer: Buffer,
	id: string
): Promise<string> {
	const mediumKey = `medium/${id}.jpg`;

	const resized = await sharp(sourceBuffer)
		.resize({ width: EMBED_MAX_WIDTH, fit: 'inside', withoutEnlargement: true })
		.jpeg({ quality: 82 })
		.toBuffer();

	await uploadJpeg(mediumKey, resized);
	return mediumKey;
}

export async function generateLightboxVariant(
	sourceBuffer: Buffer,
	id: string
): Promise<string> {
	const largeKey = `large/${id}.jpg`;

	const resized = await sharp(sourceBuffer)
		.resize({ width: LIGHTBOX_MAX_WIDTH, fit: 'inside', withoutEnlargement: true })
		.jpeg({ quality: 85 })
		.toBuffer();

	await uploadJpeg(largeKey, resized);
	return largeKey;
}

export async function generateVideoThumbnail(
	sourceBuffer: Buffer,
	id: string
): Promise<string> {
	const thumbnailKey = `thumbnails/${id}.jpg`;

	// Write video to temp file
	const tempInput = join(tmpdir(), `${id}-input`);
	const tempOutput = join(tmpdir(), `${id}-thumb.jpg`);

	try {
		writeFileSync(tempInput, sourceBuffer);

		// Extract frame at 1 second using ffmpeg
		execFileSync('ffmpeg', [
			'-i', tempInput,
			'-ss', '00:00:01',
			'-vframes', '1',
			'-vf', `scale=${THUMB_WIDTH}:${THUMB_HEIGHT}:force_original_aspect_ratio=increase,crop=${THUMB_WIDTH}:${THUMB_HEIGHT}`,
			'-q:v', '2',
			'-y',
			tempOutput,
		]);

		const thumbnail = readFileSync(tempOutput);
		await uploadJpeg(thumbnailKey, thumbnail);
		return thumbnailKey;
	} finally {
		// Clean up temp files
		if (existsSync(tempInput)) unlinkSync(tempInput);
		if (existsSync(tempOutput)) unlinkSync(tempOutput);
	}
}