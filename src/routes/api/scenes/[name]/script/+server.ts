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
	//console.log('Looking for scene:', name);

	// Try bucket first
	try {
		await s3.send(new HeadObjectCommand({
			Bucket: BUCKET_NAME,
			Key: `${BUCKET_PREFIX}${name}.js`,
		}));
		//console.log('Found in bucket');
	} catch {
		//console.log('Not in bucket, trying static at:', path.join(STATIC_DIR, `${name}.js`));
	}

	const staticPath = path.join(STATIC_DIR, `${name}.js`);
	//console.log('Static path exists:', fs.existsSync(staticPath));

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