import fs from 'fs';
import path from 'path';
import { s3 } from '$lib/server/bucket/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { BUCKET_NAME } from '$env/static/private';
import { json, error } from '@sveltejs/kit';

const STATIC_SCENES_DIR = path.resolve('static/scene-files');
const BUCKET_PREFIX = 'scenes/';

export async function GET({ params, locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const { name } = params;

	// Try bucket first
	try {
		const res = await s3.send(new GetObjectCommand({
			Bucket: BUCKET_NAME,
			Key: `${BUCKET_PREFIX}${name}.js`,
		}));
		const code = await res.Body?.transformToString();
		if (code) return json({ code, source: 'bucket' });
	} catch {
		// Not in bucket, fall through
	}

	// Fall back to static
	const staticPath = path.join(STATIC_SCENES_DIR, `${name}.js`);
	if (fs.existsSync(staticPath)) {
		const code = fs.readFileSync(staticPath, 'utf-8');
		return json({ code, source: 'static' });
	}

	error(404, 'Scene not found');
}