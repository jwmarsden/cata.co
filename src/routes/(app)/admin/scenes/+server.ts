import fs from 'fs';
import path from 'path';
import { json, error } from '@sveltejs/kit';

const BLANK_TEMPLATE = `export const meta = {
	title: 'My Scene',
	description: 'A custom Three.js scene.',
	height: 400,
};

export function init(container) {
	let animId;

	import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js').then(THREE => {
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

export async function POST({ request, locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const { name, template } = await request.json();
	if (!name || !/^[a-z0-9-]+$/.test(name)) {
		error(400, 'Invalid scene name — use lowercase letters, numbers and hyphens only');
	}

	const scenesDir = path.resolve('static/scenes');
	if (!fs.existsSync(scenesDir)) fs.mkdirSync(scenesDir, { recursive: true });

	const destPath = path.join(scenesDir, `${name}.js`);
	if (fs.existsSync(destPath)) error(409, 'Scene already exists');

	let source = BLANK_TEMPLATE;
	if (template && template !== 'blank') {
		const templatePath = path.join(scenesDir, `${template}.js`);
		if (fs.existsSync(templatePath)) {
			source = fs.readFileSync(templatePath, 'utf-8');
		}
	}

	fs.writeFileSync(destPath, source);
	return json({ name });
}

export async function PUT({ request, locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const { name, code } = await request.json();
	if (!name || !code) error(400, 'Name and code required');

	const filePath = path.resolve('src/scenes', `${name}.js`);
	fs.writeFileSync(filePath, code);
	return json({ ok: true });
}