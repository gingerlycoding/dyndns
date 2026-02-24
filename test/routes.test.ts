// Tests for request parsing and route validation
import { describe, it, expect } from "vitest";
import { parseRequest } from "../src/routes";

function makeRequest(path: string): Request {
	return new Request(`https://dyndns.gingerlycoding.com${path}`);
}

describe("parseRequest", () => {
	it("parses /host/pawnee?ip=1.2.3.4", () => {
		const result = parseRequest(makeRequest("/host/pawnee?ip=1.2.3.4"));
		expect(result).toEqual({ hostname: "pawnee.gingerlycoding.com", ip: "1.2.3.4" });
	});

	it("parses /host/muncie?ip=10.0.0.1", () => {
		const result = parseRequest(makeRequest("/host/muncie?ip=10.0.0.1"));
		expect(result).toEqual({ hostname: "muncie.gingerlycoding.com", ip: "10.0.0.1" });
	});

	it("returns nohost for unknown hostname", () => {
		const result = parseRequest(makeRequest("/host/unknown?ip=1.2.3.4"));
		expect(result).toEqual({ error: "nohost" });
	});

	it("returns nohost for missing host segment", () => {
		const result = parseRequest(makeRequest("/host/?ip=1.2.3.4"));
		expect(result).toEqual({ error: "nohost" });
	});

	it("returns nohost for wrong path prefix", () => {
		const result = parseRequest(makeRequest("/dns/pawnee?ip=1.2.3.4"));
		expect(result).toEqual({ error: "nohost" });
	});

	it("returns badip for missing ip parameter", () => {
		const result = parseRequest(makeRequest("/host/pawnee"));
		expect(result).toEqual({ error: "badip" });
	});

	it("returns badip for empty ip parameter", () => {
		const result = parseRequest(makeRequest("/host/pawnee?ip="));
		expect(result).toEqual({ error: "badip" });
	});

	it("returns badip for invalid IPv4", () => {
		const result = parseRequest(makeRequest("/host/pawnee?ip=999.999.999.999"));
		expect(result).toEqual({ error: "badip" });
	});

	it("returns badip for non-numeric octets", () => {
		const result = parseRequest(makeRequest("/host/pawnee?ip=a.b.c.d"));
		expect(result).toEqual({ error: "badip" });
	});

	it("returns badip for IPv6 addresses", () => {
		const result = parseRequest(makeRequest("/host/pawnee?ip=::1"));
		expect(result).toEqual({ error: "badip" });
	});

	it("handles trailing slash in path", () => {
		const result = parseRequest(makeRequest("/host/pawnee/?ip=1.2.3.4"));
		expect(result).toEqual({ hostname: "pawnee.gingerlycoding.com", ip: "1.2.3.4" });
	});

	it("accepts full FQDN pawnee.gingerlycoding.com", () => {
		const result = parseRequest(makeRequest("/host/pawnee.gingerlycoding.com?ip=1.2.3.4"));
		expect(result).toEqual({ hostname: "pawnee.gingerlycoding.com", ip: "1.2.3.4" });
	});

	it("accepts full FQDN muncie.gingerlycoding.com", () => {
		const result = parseRequest(makeRequest("/host/muncie.gingerlycoding.com?ip=10.0.0.1"));
		expect(result).toEqual({ hostname: "muncie.gingerlycoding.com", ip: "10.0.0.1" });
	});

	it("returns nohost for allowed subdomain on wrong domain", () => {
		const result = parseRequest(makeRequest("/host/pawnee.example.com?ip=1.2.3.4"));
		expect(result).toEqual({ error: "nohost" });
	});

	it("returns nohost for unknown subdomain on correct domain", () => {
		const result = parseRequest(makeRequest("/host/bogus.gingerlycoding.com?ip=1.2.3.4"));
		expect(result).toEqual({ error: "nohost" });
	});
});
