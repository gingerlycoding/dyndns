// Cloudflare Worker fetch handler for dynamic DNS updates
import { verifyAuth } from "./auth";
import { isHostPath, parseRequest } from "./routes";
import { updateDnsRecord } from "./dns";
import {
	dyndns2Response,
	clientErrorResponse,
	authFailResponse,
	methodNotAllowed,
	notFound,
} from "./response";

interface Env {
	CF_API_TOKEN: string;
	CF_ZONE_ID: string;
	BASIC_AUTH_USERNAME: string;
	BASIC_AUTH_PASSWORD: string;
	ALLOWED_SUBDOMAINS: string;
	DOMAIN: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method !== "GET") {
			return methodNotAllowed();
		}

		// Path shape check runs before auth so unrelated traffic (probes,
		// scanners, /) sees a flat 404 with no auth challenge.
		const url = new URL(request.url);
		if (!isHostPath(url.pathname)) {
			return notFound();
		}

		if (!verifyAuth(request, env)) {
			return authFailResponse();
		}

		const parsed = parseRequest(request, env);
		if ("error" in parsed) {
			return clientErrorResponse(parsed.error);
		}

		const result = await updateDnsRecord(env, parsed.hostname, parsed.ip);
		if (result.status === "error") {
			console.error(`DNS error for ${parsed.hostname} (${parsed.ip}): ${result.message}`);
		}
		return dyndns2Response(result.status, result.ip);
	},
} satisfies ExportedHandler<Env>;
