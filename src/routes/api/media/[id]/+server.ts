import { s3 } from '$lib/server/bucket/s3';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BUCKET_NAME } from '$env/static/private';
import { json, redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { media } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params, locals, url }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const file = await db.select().from(media).where(eq(media.id, params.id)).limit(1);
	if (!file.length) error(404, 'Not found');

	const signedUrl = await getSignedUrl(s3, new GetObjectCommand({
		Bucket: BUCKET_NAME,
		Key: file[0].key,
	}), { expiresIn: 3600 });

	if (url.searchParams.get('redirect') === 'true') {
		redirect(302, signedUrl);
	}

	return json({ url: signedUrl });
}

export async function PATCH({ params, request, locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const body = await request.json();

	await db.update(media)
		.set({
			friendlyName: body.friendlyName,
			altText: body.altText,
			description: body.description,
		})
		.where(eq(media.id, params.id));

	return json({ ok: true });
}

export async function DELETE({ params, locals }) {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const file = await db.select().from(media).where(eq(media.id, params.id)).limit(1);
	if (!file.length) error(404, 'Not found');

	await s3.send(new DeleteObjectCommand({
		Bucket: BUCKET_NAME,
		Key: file[0].key,
	}));

	await db.delete(media).where(eq(media.id, params.id));

	return json({ ok: true });
}