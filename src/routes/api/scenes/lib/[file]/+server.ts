import fs from 'fs';
import path from 'path';
import { error } from '@sveltejs/kit';

const LIB_DIR = path.resolve('static/scene-files/lib');

export async function GET({ params }) {
	const filePath = path.join(LIB_DIR, params.file);

	// Security — prevent path traversal
	if (!filePath.startsWith(LIB_DIR)) {
		error(403, 'Forbidden');
	}

	if (!fs.existsSync(filePath)) {
		error(404, 'Not found');
	}

	const code = fs.readFileSync(filePath, 'utf-8');

	return new Response(code, {
		headers: {
			'Content-Type': 'application/javascript',
			'Cache-Control': 'public, max-age=3600',
		},
	});
}