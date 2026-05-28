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

async function uploadThumbnail(thumbnailKey: string, buffer: Buffer): Promise<void> {
	await s3.send(new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: thumbnailKey,
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

	await uploadThumbnail(thumbnailKey, thumbnail);
	return thumbnailKey;
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
		await uploadThumbnail(thumbnailKey, thumbnail);
		return thumbnailKey;
	} finally {
		// Clean up temp files
		if (existsSync(tempInput)) unlinkSync(tempInput);
		if (existsSync(tempOutput)) unlinkSync(tempOutput);
	}
}