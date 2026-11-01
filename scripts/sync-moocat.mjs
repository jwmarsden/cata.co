// Copy moocat's browser-side code (kept in ~/Source/moocat, alongside this
// repo) into src/lib/moocat for /moo. Run after changing moocat:
//   node scripts/sync-moocat.mjs [path/to/moocat]
// The copy is committed here, so builds don't need moocat.
import { readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const from = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '../../moocat'), 'src');
const to = path.join(import.meta.dirname, '../src/lib/moocat');

// what web/web.js needs: the session (not main.js, the tinyjs host) and the page
const files = {
	backend: ['core.js', 'inspect.js', 'mcp.js', 'sessions.js', 'smud.js', 'telnet.js'],
	frontend: ['ansi.js', 'app.js', 'canvas.js', 'moo.js', 'style.css'],
	web: ['markup.js', 'web.css', 'web.js'],
};

await rm(to, { recursive: true, force: true });
for (const [dir, names] of Object.entries(files)) {
	await mkdir(path.join(to, dir), { recursive: true });
	for (const name of names) {
		let text = await readFile(path.join(from, dir, name), 'utf8');
		// moocat is plain JS, not written to this repo's checkJs
		if (name.endsWith('.js')) text = '// @ts-nocheck\n' + text;
		await writeFile(path.join(to, dir, name), text);
	}
}
await writeFile(path.join(to, 'README.md'),
	`Copied from moocat by scripts/sync-moocat.mjs: edit it there, not here.\n`);
console.log(`synced ${from} -> ${to}`);
