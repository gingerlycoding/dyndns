// Cloudflare Worker fetch handler for dynamic DNS updates
import { verifyAuth } from "./auth";
import { parseRequest } from "./routes";
import { updateDnsRecord } from "./dns";
import { dyndns2Response, authFailResponse, methodNotAllowed } from "./response";

interface Env {
	CF_API_TOKEN: string;
	CF_ZONE_ID: string;
	BASIC_AUTH_USERNAME: string;
	BASIC_AUTH_PASSWORD: string;
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT"]);

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (!ALLOWED_METHODS.has(request.method)) {
			return methodNotAllowed();
		}

		if (!(await verifyAuth(request, env))) {
			return authFailResponse();
		}

		const parsed = parseRequest(request);
		if ("error" in parsed) {
			return new Response(parsed.error, { headers: { "Content-Type": "text/plain" } });
		}

		const result = await updateDnsRecord(env, parsed.hostname, parsed.ip);
		return dyndns2Response(result.status, result.ip);
	},
} satisfies ExportedHandler<Env>;
