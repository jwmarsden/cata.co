import fs from 'fs';
import path from 'path';
import { s3 } from '$lib/server/bucket/s3';
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { BUCKET_NAME } from '$env/static/private';
import { error } from '@sveltejs/kit';

const BUCKET_PREFIX = 'scenes/';
const STATIC_DIR = path.resolve('static/scene-files');

export async function GET({ params }) {
	const { name } = params;

	// Try bucket first
	try {
		await s3.send(new HeadObjectCommand({
			Bucket: BUCKET_NAME,
			Key: `${BUCKET_PREFIX}${name}.js`,
		}));

		const res = await s3.send(new GetObjectCommand({
			Bucket: BUCKET_NAME,
			Key: `${BUCKET_PREFIX}${name}.js`,
		}));

		const code = await res.Body?.transformToString();
		if (!code) error(404, 'Empty scene');

		return new Response(code, {
			headers: {
				'Content-Type': 'application/javascript',
				'Cache-Control': 'no-cache',
			},
		});
	} catch {
		// Not in bucket, fall through
	}

	// Fall back to static
	const staticPath = path.join(STATIC_DIR, `${name}.js`);
	if (fs.existsSync(staticPath)) {
		const code = fs.readFileSync(staticPath, 'utf-8');
		return new Response(code, {
			headers: {
				'Content-Type': 'application/javascript',
				'Cache-Control': 'no-cache',
			},
		});
	}

	error(404, 'Scene not found');
}