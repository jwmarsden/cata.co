import { SvelteKitAuth } from '@auth/sveltekit';
import GitHub from '@auth/sveltekit/providers/github';
import redis from '$lib/server/mem/redis';
import { RedisAdapter } from '$lib/server/mem/redis-adapter';
import { recordAdmin, isAdminUser } from '$lib/server/admin';
import {
	GITHUB_ID,
	GITHUB_SECRET,
	AUTH_SECRET,
	ADMIN_GITHUB_USERNAME
} from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
	adapter: RedisAdapter(redis),
	providers: [
		GitHub({
			clientId: GITHUB_ID,
			clientSecret: GITHUB_SECRET,
			profile: (p) => ({
				id: String(p.id),
				name: p.name ?? p.login,
				email: p.email,
				image: p.avatar_url,
				login: p.login,
			}),
		}),
	],
	secret: AUTH_SECRET,
	trustHost: true,
	session: {
		strategy: 'database',
		maxAge: 30 * 24 * 60 * 60, // 30 days
	},
	callbacks: {
		// anyone may sign in (for /moo); admin is decided per session below
		async signIn({ profile, account }: { profile?: any; account?: any }) {
			if (account?.provider === 'github' && profile?.login === ADMIN_GITHUB_USERNAME) {
				await recordAdmin(String(account.providerAccountId));
			}
			return true;
		},
		async session({ session, user }: { session: any; user: any }) {
			session.user.id = user.id;
			session.user.login = user.login;
			session.user.name = user.name ?? user.login;
			session.user.isAdmin = await isAdminUser(user.id);
			return session;
		},
	},
	pages: {
		signIn: '/admin/login',
		error: '/admin/login',
	},
});