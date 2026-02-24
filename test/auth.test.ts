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
	it("returns true for valid credentials", () => {
		const req = makeRequest(basicAuthHeader("testuser", "testpass"));
		expect(verifyAuth(req, makeEnv())).toBe(true);
	});

	it("returns false when no Authorization header is present", () => {
		const req = makeRequest();
		expect(verifyAuth(req, makeEnv())).toBe(false);
	});

	it("returns false for wrong username", () => {
		const req = makeRequest(basicAuthHeader("wrong", "testpass"));
		expect(verifyAuth(req, makeEnv())).toBe(false);
	});

	it("returns false for wrong password", () => {
		const req = makeRequest(basicAuthHeader("testuser", "wrong"));
		expect(verifyAuth(req, makeEnv())).toBe(false);
	});

	it("returns false for non-Basic auth scheme", () => {
		const req = makeRequest("Bearer some-token");
		expect(verifyAuth(req, makeEnv())).toBe(false);
	});

	it("returns false for malformed base64", () => {
		const req = makeRequest("Basic !!!not-base64!!!");
		expect(verifyAuth(req, makeEnv())).toBe(false);
	});

	it("returns false for base64 without colon separator", () => {
		const req = makeRequest("Basic " + btoa("nocolon"));
		expect(verifyAuth(req, makeEnv())).toBe(false);
	});
});
