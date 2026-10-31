import { error, redirect } from '@sveltejs/kit';
import redis from '$lib/server/mem/redis';

// Anyone with a GitHub account can sign in (for /moo); only the admin gets
// /admin and the admin APIs. The admin is pinned by GitHub's numeric account
// id, recorded the first time ADMIN_GITHUB_USERNAME signs in, so a later
// rename (and someone else taking the old name) doesn't move it.
const ADMIN_KEY = 'auth:admin:github';

export async function recordAdmin(providerAccountId: string) {
	await redis.set(ADMIN_KEY, providerAccountId, 'NX');
}

export async function isAdminUser(userId: string | undefined): Promise<boolean> {
	if (!userId) return false;
	const accountId = await redis.get(ADMIN_KEY);
	if (!accountId) return false;
	return (await redis.get(`account:github:${accountId}`)) === userId;
}

type Session = { user?: object } | null | undefined;

// set on the session by the session callback in src/auth.ts
export const isAdmin = (session: Session) =>
	!!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

// For endpoints: 401 if not signed in, 403 if signed in but not the admin.
export function requireAdmin(session: Session) {
	if (!session?.user) error(401, 'Unauthorized');
	if (!isAdmin(session)) error(403, 'Forbidden');
}

// For pages: to the login page if not the admin.
export function requireAdminPage(session: Session) {
	if (!isAdmin(session)) redirect(303, '/admin/login');
}
