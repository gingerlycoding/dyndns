// Vitest config for Cloudflare Workers test pool
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: {
					bindings: {
						BASIC_AUTH_USERNAME: "testuser",
						BASIC_AUTH_PASSWORD: "testpass",
						CF_API_TOKEN: "test-api-token",
						CF_ZONE_ID: "test-zone-id",
						ALLOWED_SUBDOMAINS: "pawnee,muncie",
						DOMAIN: "gingerlycoding.com",
					},
				},
			},
		},
	},
});
