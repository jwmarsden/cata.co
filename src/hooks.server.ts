import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from './auth';
import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit';
import { truncateTags, syncPostTagsToRedis, syncMediaTagsToRedis } from '$lib/server/tags/tag-sync';

export const init: ServerInit = async () => {
	await truncateTags().catch(err => {
		console.error('Error truncating tags:', err);
	});

	await syncPostTagsToRedis().catch(err => {
		console.error('Error indexing posts:', err);
	});

	await syncMediaTagsToRedis().catch(err => {
		console.error('Error syncing media tags:', err);
	});
};

const securityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	if (event.url.pathname.startsWith('/admin/media')) {
		response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
		response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
	}

	return response;
};


const adminGuard: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/admin')) {
		if (event.url.pathname.startsWith('/admin/login')) {
			return resolve(event);
		}
		const session = await event.locals.auth();
		if (!session?.user) {
			redirect(303, '/admin/login');
		}
	}
	return resolve(event);
};

export const handle = sequence(authHandle, adminGuard, securityHeaders);