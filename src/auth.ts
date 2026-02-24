// Verify HTTP Basic Auth credentials against environment secrets

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
	const maxLen = Math.max(a.byteLength, b.byteLength);
	const paddedA = new Uint8Array(maxLen);
	const paddedB = new Uint8Array(maxLen);
	paddedA.set(a);
	paddedB.set(b);
	const equal = crypto.subtle.timingSafeEqual(paddedA, paddedB);
	return equal && a.byteLength === b.byteLength;
}

export interface AuthEnv {
	BASIC_AUTH_USERNAME: string;
	BASIC_AUTH_PASSWORD: string;
}

export function verifyAuth(request: Request, env: AuthEnv): boolean {
	const header = request.headers.get("Authorization");
	if (!header || !header.startsWith("Basic ")) {
		return false;
	}

	let decoded: string;
	try {
		decoded = atob(header.slice(6));
	} catch {
		return false;
	}

	const colonIndex = decoded.indexOf(":");
	if (colonIndex === -1) {
		return false;
	}

	const username = decoded.slice(0, colonIndex);
	const password = decoded.slice(colonIndex + 1);

	const encoder = new TextEncoder();
	const userMatch = constantTimeEqual(encoder.encode(env.BASIC_AUTH_USERNAME), encoder.encode(username));
	const passMatch = constantTimeEqual(encoder.encode(env.BASIC_AUTH_PASSWORD), encoder.encode(password));

	return userMatch && passMatch;
}
