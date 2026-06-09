import fs from 'fs';
import path from 'path';
import { json, error } from '@sveltejs/kit';
import { s3 } from '$lib/server/bucket/s3';
import { PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BUCKET_NAME } from '$env/static/private';
import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const STATIC_SCENES_DIR = path.resolve('static/scene-files');
const BUCKET_PREFIX = 'scenes/';

// GET — list all scenes (static + bucket)
export async function GET({ locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	// Static scenes
	const staticScenes = fs.existsSync(STATIC_SCENES_DIR)
		? fs.readdirSync(STATIC_SCENES_DIR)
			.filter(f => f.endsWith('.js'))
			.map(f => ({ name: f.replace('.js', ''), source: 'static' as const }))
		: [];

	// Bucket scenes
	const bucketRes = await s3.send(new ListObjectsV2Command({
		Bucket: BUCKET_NAME,
		Prefix: BUCKET_PREFIX,
	}));

	const bucketScenes = (bucketRes.Contents ?? [])
		.filter(obj => obj.Key?.endsWith('.js'))
		.map(obj => ({
			name: obj.Key!.replace(BUCKET_PREFIX, '').replace('.js', ''),
			source: 'bucket' as const,
		}));

	// Merge — bucket version wins over static if same name
	const allScenes = new Map<string, { name: string; source: 'static' | 'bucket' }>();
	for (const s of staticScenes) allScenes.set(s.name, s);
	for (const s of bucketScenes) allScenes.set(s.name, s);

	return json({ scenes: [...allScenes.values()] });
}

// POST — create new scene (copies template to bucket)
export async function POST({ request, locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const { name, template } = await request.json();
	if (!name || !/^[a-z0-9-]+$/.test(name)) {
		error(400, 'Invalid scene name — use lowercase letters, numbers and hyphens only');
	}

	// Get template source
	let source = BLANK_TEMPLATE;
	if (template && template !== 'blank') {
		const templatePath = path.join(STATIC_SCENES_DIR, `${template}.js`);
		if (fs.existsSync(templatePath)) {
			source = fs.readFileSync(templatePath, 'utf-8');
		}
	}

	// Save to bucket
	await s3.send(new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: `${BUCKET_PREFIX}${name}.js`,
		Body: source,
		ContentType: 'application/javascript',
	}));

	return json({ name, source: 'bucket' });
}

// PUT — save edited scene to bucket
export async function PUT({ request, locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const { name, code } = await request.json();
	if (!name || !code) error(400, 'Name and code required');

	await s3.send(new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: `${BUCKET_PREFIX}${name}.js`,
		Body: code,
		ContentType: 'application/javascript',
	}));

	return json({ ok: true });
}

export async function DELETE({ request, locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const { name } = request.json ? await request.json() : {};

	// Only allow deleting bucket scenes, not static templates
	try {
		await s3.send(new HeadObjectCommand({
			Bucket: BUCKET_NAME,
			Key: `${BUCKET_PREFIX}${name}.js`,
		}));
	} catch {
		error(404, 'Scene not found in bucket — static scenes cannot be deleted');
	}

	await s3.send(new DeleteObjectCommand({
		Bucket: BUCKET_NAME,
		Key: `${BUCKET_PREFIX}${name}.js`,
	}));

	return json({ ok: true });
}

const BLANK_TEMPLATE = `export const meta = {
	title: 'My Scene',
	description: 'A custom Three.js scene.',
	height: 400,
};

export function init(container) {
	let animId;

	import('three').then(THREE => {
		const w = container.clientWidth;
		const h = container.clientHeight;

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(w, h);
		container.appendChild(renderer.domElement);

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x1B3A4B);

		const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
		camera.position.z = 5;

		function animate() {
			animId = requestAnimationFrame(animate);
			renderer.render(scene, camera);
		}
		animate();
	});

	return function cleanup() {
		cancelAnimationFrame(animId);
		container.innerHTML = '';
	};
}
`;