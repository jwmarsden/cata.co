import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
	// Don't protect the login page
	if (url.pathname === '/admin/login') {
		return {};
	}

	const session = await locals.auth();
	if (!session?.user) {
		redirect(303, '/admin/login');
	}

	return { session };
}