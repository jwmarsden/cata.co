import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { ServerInit } from '@sveltejs/kit';
import { index_posts } from '$lib/server/posts/post_index';
import { getSession } from '$lib/server/session';

const SESSION_COOKIE = 'sid';

export const init: ServerInit = async () => {
	index_posts().then(() => {
		console.log('Finished indexing posts');
	}).catch(err => {
		console.error('Error indexing posts:', err);
	});

};


export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	const sessionId = event.cookies.get(SESSION_COOKIE);

	if (sessionId) {
		const sessionData = await getSession(sessionId);
		event.locals.sessionData = sessionData;
		event.locals.sessionId = sessionId;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
