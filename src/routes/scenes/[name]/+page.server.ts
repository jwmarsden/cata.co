import fs from 'fs';
import path from 'path';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const filePath = path.resolve('static/scenes', `${params.name}.js`);
	if (!fs.existsSync(filePath)) {
		error(404, 'Scene not found');
	}
	return { name: params.name };
}