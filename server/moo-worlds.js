// The MOOs /moo can reach, by name. The relay connects only to these; the
// page is told only names and whether to announce SMud. Nothing here logs in:
// players type their own connect line, password and all, every time.
// tls: the relay reaches that MOO over TLS (the browser reaches the relay
// over the site's own https/wss).
export const MOO_WORLDS = [
	{ name: 'MooCaTa', host: 'moo.cata.co', port: 19512, tls: true, smud: true },
	{ name: 'Rupert', host: 'rupert.twyst.org', port: 9040, smud: true },
	{ name: 'Lambda', host: 'lambda.moo.mud.org', port: 8888, smud: false },
];

/** @param {unknown} name */
export const mooWorld = (name) => MOO_WORLDS.find((w) => w.name === name) ?? null;
