import type { Adapter, AdapterSession, AdapterUser } from '@auth/core/adapters';
import type Redis from 'ioredis';

const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export function RedisAdapter(redis: Redis): Adapter {
	return {
		async createSession(session: AdapterSession): Promise<AdapterSession> {
			await redis.setex(
				`session:${session.sessionToken}`,
				SESSION_TTL,
				JSON.stringify(session)
			);
			return session;
		},

		async getSessionAndUser(sessionToken: string) {
			const sessionData = await redis.get(`session:${sessionToken}`);
			if (!sessionData) return null;

			const session: AdapterSession = JSON.parse(sessionData);
			const userData = await redis.get(`user:${session.userId}`);
			if (!userData) return null;

			return {
				session,
				user: JSON.parse(userData) as AdapterUser,
			};
		},

		async updateSession(session): Promise<AdapterSession | null> {
			const existing = await redis.get(`session:${session.sessionToken}`);
			if (!existing) return null;

			const merged: AdapterSession = {
				...JSON.parse(existing),
				...session,
			};

			await redis.setex(
				`session:${session.sessionToken}`,
				SESSION_TTL,
				JSON.stringify(merged)
			);
			return merged;
		},

		async deleteSession(sessionToken: string) {
			await redis.del(`session:${sessionToken}`);
		},

		async createUser(user): Promise<AdapterUser> {
			const id = crypto.randomUUID();
			const newUser: AdapterUser = { ...user, id };
			await redis.set(`user:${id}`, JSON.stringify(newUser));
			if (newUser.email) {
				await redis.set(`user:email:${newUser.email}`, id);
			}
			return newUser;
		},

		async getUser(id: string): Promise<AdapterUser | null> {
			const user = await redis.get(`user:${id}`);
			return user ? JSON.parse(user) : null;
		},

		async getUserByEmail(email: string): Promise<AdapterUser | null> {
			const id = await redis.get(`user:email:${email}`);
			if (!id) return null;
			const user = await redis.get(`user:${id}`);
			return user ? JSON.parse(user) : null;
		},

		async getUserByAccount({ provider, providerAccountId }): Promise<AdapterUser | null> {
			const id = await redis.get(`account:${provider}:${providerAccountId}`);
			if (!id) return null;
			const user = await redis.get(`user:${id}`);
			return user ? JSON.parse(user) : null;
		},

		async updateUser(user): Promise<AdapterUser> {
			const existing = await redis.get(`user:${user.id}`);
			const merged: AdapterUser = {
				...JSON.parse(existing ?? '{}'),
				...user,
			};
			await redis.set(`user:${user.id}`, JSON.stringify(merged));
			return merged;
		},

		async linkAccount(account) {
			await redis.set(
				`account:${account.provider}:${account.providerAccountId}`,
				account.userId
			);
			return account;
		},

		async unlinkAccount({ provider, providerAccountId }) {
			await redis.del(`account:${provider}:${providerAccountId}`);
		},

		async deleteUser(id: string) {
			await redis.del(`user:${id}`);
		},
	};
}