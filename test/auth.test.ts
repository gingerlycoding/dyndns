// Tests for Basic Auth verification
import { describe, it, expect } from "vitest";
import { verifyAuth } from "../src/auth";

function makeEnv(username = "testuser", password = "testpass") {
	return { BASIC_AUTH_USERNAME: username, BASIC_AUTH_PASSWORD: password };
}

function basicAuthHeader(username: string, password: string): string {
	return "Basic " + btoa(`${username}:${password}`);
}

function makeRequest(authHeader?: string): Request {
	const headers = new Headers();
	if (authHeader) {
		headers.set("Authorization", authHeader);
	}
	return new Request("https://example.com/", { headers });
}

describe("verifyAuth", () => {
	it("returns true for valid credentials", async () => {
		const req = makeRequest(basicAuthHeader("testuser", "testpass"));
		expect(await verifyAuth(req, makeEnv())).toBe(true);
	});

	it("returns false when no Authorization header is present", async () => {
		const req = makeRequest();
		expect(await verifyAuth(req, makeEnv())).toBe(false);
	});

	it("returns false for wrong username", async () => {
		const req = makeRequest(basicAuthHeader("wrong", "testpass"));
		expect(await verifyAuth(req, makeEnv())).toBe(false);
	});

	it("returns false for wrong password", async () => {
		const req = makeRequest(basicAuthHeader("testuser", "wrong"));
		expect(await verifyAuth(req, makeEnv())).toBe(false);
	});

	it("returns false for non-Basic auth scheme", async () => {
		const req = makeRequest("Bearer some-token");
		expect(await verifyAuth(req, makeEnv())).toBe(false);
	});

	it("returns false for malformed base64", async () => {
		const req = makeRequest("Basic !!!not-base64!!!");
		expect(await verifyAuth(req, makeEnv())).toBe(false);
	});

	it("returns false for base64 without colon separator", async () => {
		const req = makeRequest("Basic " + btoa("nocolon"));
		expect(await verifyAuth(req, makeEnv())).toBe(false);
	});
});
