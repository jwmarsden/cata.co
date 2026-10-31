import { MOO_WORLDS } from '../../../server/moo-worlds.js';

export async function load({ locals }) {
	const session = await locals.auth();
	return {
		signedIn: !!session?.user,
		worlds: MOO_WORLDS.map(({ name, host, port, smud }) => ({ name, host, port, smud })),
	};
}
