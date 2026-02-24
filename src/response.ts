// Dyndns2 protocol response formatting helpers

type DnsStatus = "good" | "nochg" | "error";

const TEXT_PLAIN = { "Content-Type": "text/plain" };

export function dyndns2Response(status: DnsStatus, ip: string): Response {
	const body = status === "error" ? "911" : `${status} ${ip}`;
	return new Response(body, { headers: TEXT_PLAIN });
}

export function authFailResponse(): Response {
	return new Response("badauth", {
		status: 401,
		headers: {
			...TEXT_PLAIN,
			"WWW-Authenticate": 'Basic realm="dyndns"',
		},
	});
}

export function methodNotAllowed(): Response {
	return new Response(null, { status: 405 });
}
