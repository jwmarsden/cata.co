import { SvelteKitAuth } from '@auth/sveltekit';
import GitHub from '@auth/sveltekit/providers/github';
import redis from '$lib/server/mem/redis';
import { RedisAdapter } from '$lib/server/mem/redis-adapter';
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
		}),
	],
	secret: AUTH_SECRET,
	trustHost: true,
	session: {
		strategy: 'database',
		maxAge: 30 * 24 * 60 * 60, // 30 days
	},
	callbacks: {
		async signIn({ profile }: { profile?: any }) {
			return profile?.login === ADMIN_GITHUB_USERNAME;
		},
		async session({ session, user }: { session: any; user: any }) {
			session.user.login = user.login;
			session.user.name = user.name ?? user.login;
			return session;
		},
	},
	pages: {
		signIn: '/admin/login',
		error: '/admin/login',
	},
});