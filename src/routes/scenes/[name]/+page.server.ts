import fs from 'fs';
import path from 'path';
import { s3 } from '$lib/server/bucket/s3';
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BUCKET_NAME } from '$env/static/private';
import { error } from '@sveltejs/kit';

const STATIC_SCENES_DIR = path.resolve('static/scene-files');
const BUCKET_PREFIX = 'scenes/';

export async function load({ params }) {
	const { name } = params;

	// Check if file actually exists in bucket first
	try {
		await s3.send(new HeadObjectCommand({
			Bucket: BUCKET_NAME,
			Key: `${BUCKET_PREFIX}${name}.js`,
		}));

		// File exists — generate presigned URL
		const url = await getSignedUrl(s3, new GetObjectCommand({
			Bucket: BUCKET_NAME,
			Key: `${BUCKET_PREFIX}${name}.js`,
		}), { expiresIn: 3600 });

		return { name, scriptUrl: url, source: 'bucket' };
	} catch {
		// Not in bucket, fall through to static
	}

	// Fall back to static
	const staticPath = path.join(STATIC_SCENES_DIR, `${name}.js`);
	if (fs.existsSync(staticPath)) {
		return { name, scriptUrl: `/scene-files/${name}.js`, source: 'static' };
	}

	error(404, 'Scene not found');
}