// Tests for Cloudflare DNS API client
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { fetchMock } from "cloudflare:test";
import { updateDnsRecord, type DnsEnv } from "../src/dns";

const ZONE_ID = "test-zone-id";
const API_TOKEN = "test-api-token";
const HOSTNAME = "pawnee.gingerlycoding.com";
const RECORD_ID = "record-abc-123";

function makeEnv(): DnsEnv {
	return { CF_ZONE_ID: ZONE_ID, CF_API_TOKEN: API_TOKEN };
}

function mockLookup(records: object[]) {
	fetchMock
		.get("https://api.cloudflare.com")
		.intercept({
			path: `/client/v4/zones/${ZONE_ID}/dns_records?name=${HOSTNAME}&type=A`,
			method: "GET",
		})
		.reply(200, JSON.stringify({ success: true, result: records }));
}

function mockPatch(status: number, success: boolean) {
	fetchMock
		.get("https://api.cloudflare.com")
		.intercept({
			path: `/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}`,
			method: "PATCH",
		})
		.reply(status, JSON.stringify({ success }));
}

function mockCreate(status: number, success: boolean) {
	fetchMock
		.get("https://api.cloudflare.com")
		.intercept({
			path: `/client/v4/zones/${ZONE_ID}/dns_records`,
			method: "POST",
		})
		.reply(status, JSON.stringify({ success }));
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

afterEach(() => {
	fetchMock.assertNoPendingInterceptors();
});

describe("updateDnsRecord", () => {
	it('returns "good" when IP is updated', async () => {
		mockLookup([{ id: RECORD_ID, content: "1.1.1.1" }]);
		mockPatch(200, true);

		const result = await updateDnsRecord(makeEnv(), HOSTNAME, "2.2.2.2");
		expect(result).toEqual({ status: "good", ip: "2.2.2.2" });
	});

	it('returns "nochg" when IP already matches', async () => {
		mockLookup([{ id: RECORD_ID, content: "1.2.3.4" }]);

		const result = await updateDnsRecord(makeEnv(), HOSTNAME, "1.2.3.4");
		expect(result).toEqual({ status: "nochg", ip: "1.2.3.4" });
	});

	it("sends ttl=1 and a UniFi comment when creating", async () => {
		mockLookup([]);
		let captured = "";
		fetchMock
			.get("https://api.cloudflare.com")
			.intercept({
				path: `/client/v4/zones/${ZONE_ID}/dns_records`,
				method: "POST",
				body: (body) => {
					captured = body;
					return true;
				},
			})
			.reply(200, JSON.stringify({ success: true }));

		await updateDnsRecord(makeEnv(), HOSTNAME, "1.2.3.4");

		const parsed = JSON.parse(captured);
		expect(parsed.ttl).toBe(1);
		expect(parsed.comment).toMatch(/Dynamically set for UniFi gateway at \d{4}-\d{2}-\d{2}T/);
	});

	it("sends ttl=1 and a UniFi comment when patching", async () => {
		mockLookup([{ id: RECORD_ID, content: "1.1.1.1" }]);
		let captured = "";
		fetchMock
			.get("https://api.cloudflare.com")
			.intercept({
				path: `/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}`,
				method: "PATCH",
				body: (body) => {
					captured = body;
					return true;
				},
			})
			.reply(200, JSON.stringify({ success: true }));

		await updateDnsRecord(makeEnv(), HOSTNAME, "2.2.2.2");

		const parsed = JSON.parse(captured);
		expect(parsed.ttl).toBe(1);
		expect(parsed.comment).toMatch(/Dynamically set for UniFi gateway at \d{4}-\d{2}-\d{2}T/);
	});

	it('returns "good" and creates record when none exists', async () => {
		mockLookup([]);
		mockCreate(200, true);

		const result = await updateDnsRecord(makeEnv(), HOSTNAME, "1.2.3.4");
		expect(result).toEqual({ status: "good", ip: "1.2.3.4" });
	});

	it('returns "error" when create fails', async () => {
		mockLookup([]);
		mockCreate(500, false);

		const result = await updateDnsRecord(makeEnv(), HOSTNAME, "1.2.3.4");
		expect(result.status).toBe("error");
	});

	it('returns "error" when PATCH fails', async () => {
		mockLookup([{ id: RECORD_ID, content: "1.1.1.1" }]);
		mockPatch(500, false);

		const result = await updateDnsRecord(makeEnv(), HOSTNAME, "2.2.2.2");
		expect(result.status).toBe("error");
	});

	it('returns "error" when multiple A records exist for the hostname', async () => {
		mockLookup([
			{ id: RECORD_ID, content: "1.1.1.1" },
			{ id: "record-xyz-456", content: "2.2.2.2" },
		]);

		const result = await updateDnsRecord(makeEnv(), HOSTNAME, "3.3.3.3");
		expect(result.status).toBe("error");
	});

	it('returns "error" when lookup HTTP status is not ok', async () => {
		fetchMock
			.get("https://api.cloudflare.com")
			.intercept({
				path: `/client/v4/zones/${ZONE_ID}/dns_records?name=${HOSTNAME}&type=A`,
				method: "GET",
			})
			.reply(401, JSON.stringify({ success: false, errors: [{ message: "unauthorized" }] }));

		const result = await updateDnsRecord(makeEnv(), HOSTNAME, "1.2.3.4");
		expect(result.status).toBe("error");
	});

	it('returns "error" when lookup API fails', async () => {
		fetchMock
			.get("https://api.cloudflare.com")
			.intercept({
				path: `/client/v4/zones/${ZONE_ID}/dns_records?name=${HOSTNAME}&type=A`,
				method: "GET",
			})
			.reply(200, JSON.stringify({ success: false, errors: [{ message: "bad token" }] }));

		const result = await updateDnsRecord(makeEnv(), HOSTNAME, "1.2.3.4");
		expect(result.status).toBe("error");
	});
});
