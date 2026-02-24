// Smoke test to verify vitest pool-workers is configured correctly
import { describe, it, expect } from "vitest";

describe("smoke", () => {
	it("runs in workers environment", () => {
		expect(1 + 1).toBe(2);
	});
});
