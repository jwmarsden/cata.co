import fs from 'fs';
import path from 'path';

export async function load() {
	const scenesDir = path.resolve('static/scenes');
	if (!fs.existsSync(scenesDir)) fs.mkdirSync(scenesDir, { recursive: true });

	const scenes = fs.readdirSync(scenesDir)
		.filter(f => f.endsWith('.js'))
		.map(f => ({ name: f.replace('.js', '') }));

	return { scenes };
}