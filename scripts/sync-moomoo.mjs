// Copy MooMoo's browser-side code (kept in ~/Source/MooMoo, alongside this
// repo) into src/lib/moomoo for /moo. Run after changing MooMoo:
//   node scripts/sync-moomoo.mjs [path/to/MooMoo]
// The copy is committed here, so builds don't need MooMoo.
import { readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const from = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '../../MooMoo'), 'src');
const to = path.join(import.meta.dirname, '../src/lib/moomoo');

// what web/web.js needs: the session (not main.js, the tinyjs host) and the page
const files = {
	backend: ['core.js', 'inspect.js', 'mcp.js', 'smud.js', 'telnet.js'],
	frontend: ['ansi.js', 'app.js', 'canvas.js', 'moo.js', 'style.css'],
	web: ['markup.js', 'web.css', 'web.js'],
};

await rm(to, { recursive: true, force: true });
for (const [dir, names] of Object.entries(files)) {
	await mkdir(path.join(to, dir), { recursive: true });
	for (const name of names) {
		let text = await readFile(path.join(from, dir, name), 'utf8');
		// MooMoo is plain JS, not written to this repo's checkJs
		if (name.endsWith('.js')) text = '// @ts-nocheck\n' + text;
		await writeFile(path.join(to, dir, name), text);
	}
}
await writeFile(path.join(to, 'README.md'),
	`Copied from MooMoo by scripts/sync-moomoo.mjs: edit it there, not here.\n`);
console.log(`synced ${from} -> ${to}`);
