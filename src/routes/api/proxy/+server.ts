import { error } from '@sveltejs/kit';

const ALLOWED_HOSTS = [
	'casual-effects.com',
	'graphics.stanford.edu',
	'raw.githubusercontent.com',
	'github.com',
];

export async function GET({ url }) {
	const target = url.searchParams.get('url');
	if (!target) error(400, 'No URL provided');

	let targetUrl: URL;
	try {
		targetUrl = new URL(target);
	} catch {
		error(400, 'Invalid URL');
	}

	if (!ALLOWED_HOSTS.some(h => targetUrl.hostname.endsWith(h))) {
		error(403, 'Host not allowed');
	}

	let res: Response;
	try {
		res = await fetch(targetUrl.toString());
	} catch (err) {
		// the remote host is unreachable (refused, DNS, TLS...): a 502, not a crash
		console.warn(`[proxy] ${targetUrl.hostname} unreachable:`, (err as Error).cause ?? err);
		error(502, 'Failed to fetch resource');
	}
	if (!res.ok) error(502, 'Failed to fetch resource');

	const body = await res.arrayBuffer();
	const contentType = res.headers.get('content-type') ?? 'application/octet-stream';

	return new Response(body, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=86400', // cache for 24 hours
		},
	});
}