// Integration tests for the DDNS Worker fetch handler
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { SELF, fetchMock } from "cloudflare:test";

const ZONE_ID = "test-zone-id";
const RECORD_ID = "record-abc-123";
const HOSTNAME = "pawnee.gingerlycoding.com";

function authHeader(user = "testuser", pass = "testpass"): string {
	return "Basic " + btoa(`${user}:${pass}`);
}

function mockDnsLookup(hostname: string, records: object[]) {
	fetchMock
		.get("https://api.cloudflare.com")
		.intercept({
			path: `/client/v4/zones/${ZONE_ID}/dns_records?name=${hostname}&type=A`,
			method: "GET",
		})
		.reply(200, JSON.stringify({ success: true, result: records }));
}

function mockDnsPatch(recordId: string) {
	fetchMock
		.get("https://api.cloudflare.com")
		.intercept({
			path: `/client/v4/zones/${ZONE_ID}/dns_records/${recordId}`,
			method: "PATCH",
		})
		.reply(200, JSON.stringify({ success: true }));
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

afterEach(() => {
	fetchMock.assertNoPendingInterceptors();
});

describe("DDNS Worker", () => {
	it("returns 405 for unsupported methods", async () => {
		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/host/pawnee?ip=1.2.3.4", {
			method: "DELETE",
		});
		expect(res.status).toBe(405);
	});

	it("returns 401 badauth with no credentials", async () => {
		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/host/pawnee?ip=1.2.3.4");
		expect(res.status).toBe(401);
		expect(await res.text()).toBe("badauth");
		expect(res.headers.get("WWW-Authenticate")).toBe('Basic realm="dyndns"');
	});

	it("returns 401 badauth with wrong credentials", async () => {
		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/host/pawnee?ip=1.2.3.4", {
			headers: { Authorization: authHeader("wrong", "creds") },
		});
		expect(res.status).toBe(401);
		expect(await res.text()).toBe("badauth");
	});

	it("returns nohost for unknown hostname", async () => {
		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/host/unknown?ip=1.2.3.4", {
			headers: { Authorization: authHeader() },
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("nohost");
	});

	it("returns nohost for bad path", async () => {
		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/foo/bar", {
			headers: { Authorization: authHeader() },
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("nohost");
	});

	it("returns error for missing ip parameter", async () => {
		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/host/pawnee", {
			headers: { Authorization: authHeader() },
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("badip");
	});

	it('returns "good <ip>" when DNS is updated', async () => {
		mockDnsLookup(HOSTNAME, [{ id: RECORD_ID, content: "1.1.1.1" }]);
		mockDnsPatch(RECORD_ID);

		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/host/pawnee?ip=2.2.2.2", {
			headers: { Authorization: authHeader() },
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("good 2.2.2.2");
	});

	it('returns "nochg <ip>" when IP already matches', async () => {
		mockDnsLookup(HOSTNAME, [{ id: RECORD_ID, content: "1.2.3.4" }]);

		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/host/pawnee?ip=1.2.3.4", {
			headers: { Authorization: authHeader() },
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("nochg 1.2.3.4");
	});

	it("returns 405 for POST method", async () => {
		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/host/pawnee?ip=3.3.3.3", {
			method: "POST",
			headers: { Authorization: authHeader() },
		});
		expect(res.status).toBe(405);
	});

	it("returns 405 for PUT method", async () => {
		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/host/pawnee?ip=4.4.4.4", {
			method: "PUT",
			headers: { Authorization: authHeader() },
		});
		expect(res.status).toBe(405);
	});

	it('returns "911" when DNS API fails', async () => {
		fetchMock
			.get("https://api.cloudflare.com")
			.intercept({
				path: `/client/v4/zones/${ZONE_ID}/dns_records?name=${HOSTNAME}&type=A`,
				method: "GET",
			})
			.reply(500, JSON.stringify({ success: false }));

		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/host/pawnee?ip=1.2.3.4", {
			headers: { Authorization: authHeader() },
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("911");
	});

	it("works with muncie hostname", async () => {
		const muncieHost = "muncie.gingerlycoding.com";
		mockDnsLookup(muncieHost, [{ id: "muncie-record", content: "5.5.5.5" }]);

		const res = await SELF.fetch("https://dyndns.gingerlycoding.com/host/muncie?ip=5.5.5.5", {
			headers: { Authorization: authHeader() },
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("nochg 5.5.5.5");
	});
});
