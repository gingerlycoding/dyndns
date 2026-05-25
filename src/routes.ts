// Parse and validate DDNS update requests from URL path and query params

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export interface RoutesEnv {
	ALLOWED_SUBDOMAINS: string;
	DOMAIN: string;
}

// Cheap shape check used before auth so unrelated traffic 404s without
// revealing that this endpoint is authenticated.
export function isHostPath(pathname: string): boolean {
	const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
	return segments.length === 2 && segments[0] === "host";
}

type ParseSuccess = { hostname: string; ip: string };
type ParseError = { error: "nohost" | "badip" };
export type ParseResult = ParseSuccess | ParseError;

export function parseRequest(request: Request, env: RoutesEnv): ParseResult {
	const allowed = new Set(
		env.ALLOWED_SUBDOMAINS.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0),
	);
	const domainSuffix = `.${env.DOMAIN}`;

	const url = new URL(request.url);
	const segments = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

	if (segments.length !== 2 || segments[0] !== "host") {
		return { error: "nohost" };
	}

	let id = segments[1];
	if (id.endsWith(domainSuffix)) {
		id = id.slice(0, -domainSuffix.length);
	}

	if (!allowed.has(id)) {
		console.warn(`Rejected unknown subdomain: ${id}.${env.DOMAIN}`);
		return { error: "nohost" };
	}

	const ip = url.searchParams.get("ip");
	if (!ip || !isValidIPv4(ip)) {
		return { error: "badip" };
	}

	return { hostname: `${id}${domainSuffix}`, ip };
}

function isValidIPv4(ip: string): boolean {
	const match = IPV4_REGEX.exec(ip);
	if (!match) return false;
	return match.slice(1).every((octet) => {
		const n = parseInt(octet, 10);
		return n >= 0 && n <= 255;
	});
}
