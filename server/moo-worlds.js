// The MOOs /moo can reach, by name. The relay connects only to these; the
// page is told only names and whether to announce SMud. Nothing here logs in:
// players type their own connect line, password and all, every time.
export const MOO_WORLDS = [
	{ name: 'Rupert', host: 'rupert.twyst.org', port: 9040, smud: true },
];

/** @param {unknown} name */
export const mooWorld = (name) => MOO_WORLDS.find((w) => w.name === name) ?? null;
