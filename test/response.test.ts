// Tests for dyndns2 response formatting helpers
import { describe, it, expect } from "vitest";
import { dyndns2Response, clientErrorResponse, authFailResponse, methodNotAllowed } from "../src/response";

describe("dyndns2Response", () => {
	it('returns "good <ip>" for status good', async () => {
		const res = dyndns2Response("good", "1.2.3.4");
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("good 1.2.3.4");
	});

	it('returns "nochg <ip>" for status nochg', async () => {
		const res = dyndns2Response("nochg", "5.6.7.8");
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("nochg 5.6.7.8");
	});

	it('returns "911" for status error', async () => {
		const res = dyndns2Response("error", "1.2.3.4");
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("911");
	});

	it("sets content-type to text/plain", () => {
		const res = dyndns2Response("good", "1.2.3.4");
		expect(res.headers.get("Content-Type")).toBe("text/plain");
	});
});

describe("clientErrorResponse", () => {
	it('returns "nohost" body with 200 status', async () => {
		const res = clientErrorResponse("nohost");
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("nohost");
	});

	it('returns "badip" body with 200 status', async () => {
		const res = clientErrorResponse("badip");
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("badip");
	});

	it("sets content-type to text/plain", () => {
		const res = clientErrorResponse("nohost");
		expect(res.headers.get("Content-Type")).toBe("text/plain");
	});
});

describe("authFailResponse", () => {
	it("returns 401 with badauth body", async () => {
		const res = authFailResponse();
		expect(res.status).toBe(401);
		expect(await res.text()).toBe("badauth");
	});

	it("includes WWW-Authenticate header", () => {
		const res = authFailResponse();
		expect(res.headers.get("WWW-Authenticate")).toBe('Basic realm="dyndns"');
	});
});

describe("methodNotAllowed", () => {
	it("returns 405", async () => {
		const res = methodNotAllowed();
		expect(res.status).toBe(405);
	});
});
