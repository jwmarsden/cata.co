import { MOO_WORLDS } from '../../../server/moo-worlds.js';

export async function load() {
	return {
		worlds: MOO_WORLDS.map(({ name, host, port, smud }) => ({ name, host, port, smud })),
	};
}
