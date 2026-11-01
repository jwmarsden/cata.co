// Who's asking: the client's IP address, worked out as adapter-node's
// getClientAddress() does, so a ticket made by /moo/ticket (which uses that)
// and the relay agree. Behind a reverse proxy, set ADDRESS_HEADER (e.g.
// X-Forwarded-For) and XFF_DEPTH (proxies in front of the app, usually 1);
// without them every client looks like the proxy. The app must be reachable
// only through that proxy, or anyone can write the header.

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {{ addressHeader?: string, xffDepth?: number }} [opts]
 * @returns {string | null}
 */
export function clientIp(req, { addressHeader = '', xffDepth = 1 } = {}) {
	const header = addressHeader.toLowerCase();
	if (!header) return req.socket.remoteAddress ?? null;
	const value = req.headers[header];
	if (typeof value !== 'string' || !value) return null;
	if (header !== 'x-forwarded-for') return value.trim();
	const addresses = value.split(',');
	if (xffDepth < 1 || xffDepth > addresses.length) return null;
	return addresses[addresses.length - xffDepth].trim();
}
