import fs from 'fs';
import path from 'path';
import { s3 } from '$lib/server/bucket/s3';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { BUCKET_NAME } from '$env/static/private';

const STATIC_SCENES_DIR = path.resolve('static/scene-files');
const BUCKET_PREFIX = 'scenes/';

export async function load({ locals }) {
	// Static scenes
	const staticScenes = fs.existsSync(STATIC_SCENES_DIR)
		? fs.readdirSync(STATIC_SCENES_DIR)
			.filter(f => f.endsWith('.js'))
			.map(f => ({ name: f.replace('.js', ''), source: 'static' as const }))
		: [];

	// Bucket scenes
	let bucketScenes: { name: string; source: 'bucket' }[] = [];
	try {
		const bucketRes = await s3.send(new ListObjectsV2Command({
			Bucket: BUCKET_NAME,
			Prefix: BUCKET_PREFIX,
		}));

		bucketScenes = (bucketRes.Contents ?? [])
			.filter(obj => obj.Key?.endsWith('.js'))
			.map(obj => ({
				name: obj.Key!.replace(BUCKET_PREFIX, '').replace('.js', ''),
				source: 'bucket' as const,
			}));
	} catch (err) {
		console.error('Failed to list bucket scenes:', err);
	}

	// Merge — bucket wins over static if same name
	const allScenes = new Map<string, { name: string; source: 'static' | 'bucket' }>();
	for (const s of staticScenes) allScenes.set(s.name, s);
	for (const s of bucketScenes) allScenes.set(s.name, s);

	return { scenes: [...allScenes.values()] };
}