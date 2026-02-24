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

	it('returns "error" when no DNS record exists', async () => {
		mockLookup([]);

		const result = await updateDnsRecord(makeEnv(), HOSTNAME, "1.2.3.4");
		expect(result.status).toBe("error");
	});

	it('returns "error" when PATCH fails', async () => {
		mockLookup([{ id: RECORD_ID, content: "1.1.1.1" }]);
		mockPatch(500, false);

		const result = await updateDnsRecord(makeEnv(), HOSTNAME, "2.2.2.2");
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
