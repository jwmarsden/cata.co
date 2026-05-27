import type { User, Session } from 'better-auth/minimal';
import type { SessionData } from '$lib/server/session';

export const prerender = true;

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals { 
			user?: User; 
			session?: Session
			sessionData: SessionData | null;
      		sessionId: string | null; 
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
