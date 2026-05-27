import { SvelteKitAuth } from '@auth/sveltekit';
import GitHub from '@auth/sveltekit/providers/github';
import {
	GITHUB_ID,
	GITHUB_SECRET,
	AUTH_SECRET,
	ADMIN_GITHUB_USERNAME
} from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		GitHub({
			clientId: GITHUB_ID,
			clientSecret: GITHUB_SECRET,
		}),
	],
	secret: AUTH_SECRET,
	trustHost: true,
	session: {
		strategy: 'jwt',
	},
	callbacks: {
		async signIn({ profile }: { profile?: any }) {
			return profile?.login === ADMIN_GITHUB_USERNAME;
		},
		async jwt({ token, profile }: { token: any; profile?: any }) {
			if (profile) {
				token.login = profile.login;
				token.name = profile.name ?? profile.login; // fallback to username if no display name
			}
			return token;
		},
		async session({ session, token }: { session: any; token: any }) {
			session.user.login = token.login;
			session.user.name = token.name;
			return session;
		},
	},
	pages: {
		signIn: '/admin/login',
		error: '/admin/login',
	},
});