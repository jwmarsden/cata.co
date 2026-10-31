import { redirect } from '@sveltejs/kit';
import { requireAdminPage } from '$lib/server/admin';

export async function load({ locals, url }) {
	// Don't protect the login page
	if (url.pathname === '/admin/login') {
		return {};
	}

	const session = await locals.auth();
	requireAdminPage(session);

	return { session };
}