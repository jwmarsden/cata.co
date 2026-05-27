import { index_posts } from '$lib/server/posts/post_index';
import { handle as authHandle } from './auth';
import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

export const init: ServerInit = async () => {
	index_posts().then(() => {
		console.log('Finished indexing posts');
	}).catch(err => {
		console.error('Error indexing posts:', err);
	});

};

const adminGuard: Handle = async ({ event, resolve }) => {
	//console.log('PATH:', event.url.pathname);

	if (event.url.pathname.startsWith('/admin')) {
		if (event.url.pathname.startsWith('/admin/login')) {
			//console.log('ALLOWING login page through');
			return resolve(event);
		}
		const session = await event.locals.auth();
		//console.log('SESSION:', session);
		if (!session?.user) {
			//console.log('NO SESSION, redirecting to login');
			redirect(303, '/admin/login');
		}
	}

	return resolve(event);
};

export const handle = sequence(authHandle, adminGuard);