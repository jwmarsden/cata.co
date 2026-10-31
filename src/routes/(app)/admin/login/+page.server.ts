export async function load({ locals }) {
	const session = await locals.auth();
	return { signedInAs: session?.user ? (session.user.name ?? 'someone') : null };
}
