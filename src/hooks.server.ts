import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from './auth';
import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit';
import { index_posts } from '$lib/server/posts/post_index';

export const init: ServerInit = async () => {
	index_posts().then(() => {
		console.log('Finished indexing posts');
	}).catch(err => {
		console.error('Error indexing posts:', err);
	});
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

export const handle = sequence(authHandle, adminGuard);