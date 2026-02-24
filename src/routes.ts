// Parse and validate DDNS update requests from URL path and query params

const DOMAIN = ".gingerlycoding.com";

const ALLOWED_HOSTS: Record<string, string> = {
	pawnee: "pawnee.gingerlycoding.com",
	muncie: "muncie.gingerlycoding.com",
};

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

type ParseSuccess = { hostname: string; ip: string };
type ParseError = { error: "nohost" | "badip" };
export type ParseResult = ParseSuccess | ParseError;

export function parseRequest(request: Request): ParseResult {
	const url = new URL(request.url);
	const segments = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

	if (segments.length !== 2 || segments[0] !== "host") {
		return { error: "nohost" };
	}

	let id = segments[1];
	if (id.endsWith(DOMAIN)) {
		id = id.slice(0, -DOMAIN.length);
	}

	const hostname = ALLOWED_HOSTS[id];
	if (!hostname) {
		return { error: "nohost" };
	}

	const ip = url.searchParams.get("ip");
	if (!ip || !isValidIPv4(ip)) {
		return { error: "badip" };
	}

	return { hostname, ip };
}

function isValidIPv4(ip: string): boolean {
	const match = IPV4_REGEX.exec(ip);
	if (!match) return false;
	return match.slice(1).every((octet) => {
		const n = parseInt(octet, 10);
		return n >= 0 && n <= 255;
	});
}
