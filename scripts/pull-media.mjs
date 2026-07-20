// One-off dev tool: copies the `media` table from production Postgres into
// your local Postgres, so `![[image:ID]]` directives referencing images
// uploaded via the production admin resolve locally too. The bucket itself
// is shared between environments, so only the metadata row needs copying —
// nothing is downloaded or re-uploaded.
//
// Usage: npm run db:pull-media
// Requires PROD_DATABASE_URL (read-only source) alongside the normal
// DATABASE_URL (your local target) in .env.
import postgres from 'postgres';

const localUrl = process.env.DATABASE_URL;
const prodUrl = process.env.PROD_DATABASE_URL;

if (!localUrl) throw new Error('DATABASE_URL is not set');
if (!prodUrl) throw new Error('PROD_DATABASE_URL is not set — add it to .env (your production connection string)');
if (prodUrl === localUrl) throw new Error('PROD_DATABASE_URL and DATABASE_URL are identical — refusing to run (this would copy a table onto itself)');

const local = postgres(localUrl);
const prod = postgres(prodUrl, { max: 1 });

try {
	const rows = await prod`select * from media`;
	console.log(`Fetched ${rows.length} row(s) from production media table.`);

	if (rows.length === 0) {
		console.log('Nothing to copy.');
	} else {
		for (const row of rows) {
			await local`
				insert into media ${local(row)}
				on conflict (id) do update set
					key = excluded.key,
					thumbnail_key = excluded.thumbnail_key,
					medium_key = excluded.medium_key,
					large_key = excluded.large_key,
					width = excluded.width,
					height = excluded.height,
					filename = excluded.filename,
					friendly_name = excluded.friendly_name,
					alt_text = excluded.alt_text,
					description = excluded.description,
					tags = excluded.tags,
					content_type = excluded.content_type,
					size = excluded.size,
					uploaded_at = excluded.uploaded_at
			`;
		}
		console.log(`Upserted ${rows.length} row(s) into local media table.`);
	}
} finally {
	await local.end();
	await prod.end();
}
